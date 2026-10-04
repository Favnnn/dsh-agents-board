# install.ps1 - install dsh-agents-board into the web profile (dsh v0.2.0-rc.2).
#
# Run from anywhere:  powershell -ExecutionPolicy Bypass -File install.ps1
#
# The ONLY supported install is the harness's own: this script packs this
# folder into a tarball (pnpm pack) and runs
#   pnpm dsh plugin --profile web add <that tarball>
# from the harness checkout. That registers the package as a profile bundle:
# the harness adds it to the profile manifest, installs a REAL COPY of the
# package into the profile's node_modules, and loads cordis.patch.yml from the
# bundle as an overlay row. The Plugins page then lists the plugin with the
# enable switch and the settings editor (the plugins.bundle.config slot).
# Because the profile holds its own copy, this folder can be moved or deleted
# at any time without breaking the running plugin.
#
# This script performs, in order:
#   1. vendor the config-schema library into .\deps (ships with the bundle);
#   2. remove the legacy file:// row older installers wrote into the profile
#      patch (a leftover would double-register the package and break the
#      rc.2 client-module scan);
#   3. remove the legacy installed copy under %DSH_HOME%\plugins (old flow);
#   4. pack the folder, run the official `dsh plugin add <tarball>`, then
#      delete the packed artifact (pointwise: the exact name-version path,
#      plus the exact tarball the profile previously referenced).
#
# Idempotent: re-running refreshes everything. After editing the plugin
# source, re-run this script so the profile copies the new bytes.
# ASCII-only source: Windows PowerShell 5.1 reads BOM-less files as ANSI.

param(
  # Harness source checkout (provides vendor\schemastery and the dsh CLI).
  # Probed automatically when omitted.
  [string]$HarnessRoot = '',
  # Profile to install into. The web app is this plugin's target.
  [string]$Profile = 'web'
)

$ErrorActionPreference = 'Stop'

# --- Locate the delivery folder ------------------------------------------------
$PluginDir = $PSScriptRoot
if ([string]::IsNullOrEmpty($PluginDir)) {
  throw 'install.ps1 must run as a saved script file (needs $PSScriptRoot).'
}

# --- Resolve the harness home ---------------------------------------------------
$DshHome = $env:DSH_HOME
if ([string]::IsNullOrEmpty($DshHome)) { $DshHome = Join-Path $env:USERPROFILE '.dsh' }

# --- Locate the harness checkout -------------------------------------------------
$HarnessCandidates = @(
  $HarnessRoot,
  $env:DSH_ROOT,
  'C:\Deepseek-Harness\deepseek-harness-v0.2.0-rc.2',
  'C:\Deepseek-Harness\deepseek-harness'
) | Where-Object { -not [string]::IsNullOrEmpty($_) }

$Harness = $null
foreach ($Root in $HarnessCandidates) {
  if (Test-Path (Join-Path $Root 'vendor/schemastery/lib/index.cjs')) { $Harness = $Root; break }
  if (Test-Path (Join-Path $Root 'apps/cli/package.json')) { $Harness = $Root; break }
}
if ($null -eq $Harness) {
  throw ("Harness checkout not found. Pass it explicitly: install.ps1 -HarnessRoot <path> " +
         "(looked in: $($HarnessCandidates -join '; ')).")
}
Write-Host "Harness checkout : $Harness"

# --- 1. Vendor the config-schema library into the bundle -------------------------
# host.mjs requires '@deepseek-ai/schemastery' first; outside the harness tree
# that name does not resolve, so the bundle carries a vendored CJS copy in
# deps\. The CJS build is loaded synchronously (createRequire, no TLA) and
# needs @deepseek-ai/cosmokit beside it (Node 24 require(esm) handles it).
$DepsDir = Join-Path $PluginDir 'deps'
$SchemaSource = Join-Path $Harness 'vendor/schemastery/lib/index.cjs'
$CosmoSource = Join-Path $Harness 'vendor/cosmokit'
if (Test-Path $SchemaSource) {
  New-Item -ItemType Directory -Force -Path (Join-Path $DepsDir 'node_modules/@deepseek-ai/cosmokit/lib') | Out-Null
  Copy-Item -Force $SchemaSource (Join-Path $DepsDir 'schemastery.cjs')
  Copy-Item -Force (Join-Path $CosmoSource 'package.json') (Join-Path $DepsDir 'node_modules/@deepseek-ai/cosmokit/package.json')
  Copy-Item -Force (Join-Path $CosmoSource 'lib/index.js') (Join-Path $DepsDir 'node_modules/@deepseek-ai/cosmokit/lib/index.js')
  # The ESM copy is no longer loaded (sync CJS replaced it); drop stale bytes.
  Remove-Item -ErrorAction SilentlyContinue (Join-Path $DepsDir 'schemastery.mjs')
  Write-Host "Vendored the config-schema library from $Harness."
} elseif (Test-Path (Join-Path $DepsDir 'schemastery.cjs')) {
  Write-Host 'Using the vendored config-schema library already in deps\.'
} else {
  Write-Host 'WARNING: schemastery vendor copy not found and deps\ has none.' -ForegroundColor Yellow
  Write-Host '         The board runs with defaults; the Plugins-page form is absent.' -ForegroundColor Yellow
}

# --- 2. Remove the legacy file:// row (migration from the pre-bundle flow) -------
# Older installers wrote a managed block into the profile patch pointing at the
# installed copy. With the bundle installed that package would resolve from two
# active sources, which rc.2's client-module scanner refuses. Idempotent strip.
$ProfilePatch = Join-Path $DshHome "profiles/$Profile/cordis.patch.yml"
$RowMarker = '# dsh-agents-board (managed by install.ps1)'
if (Test-Path $ProfilePatch) {
  $ExistingText = [System.IO.File]::ReadAllText($ProfilePatch)
  if ($ExistingText.Contains($RowMarker)) {
    $Existing = $ExistingText -split "`r?`n"
    $Kept = @()
    $SkipRow = $false
    foreach ($Line in $Existing) {
      if ($Line -eq $RowMarker) { $SkipRow = $true; continue }
      if ($SkipRow) {
        # The managed row ends at the first blank line or at a line that starts
        # a new top-level item.
        if ($Line -match '^\s' -or $Line -match '^-' -or $Line -eq '') { continue }
        $SkipRow = $false
      }
      $Kept += $Line
    }
    while ($Kept.Count -gt 0 -and $Kept[$Kept.Count - 1] -eq '') {
      $Kept = if ($Kept.Count -eq 1) { @() } else { $Kept[0..($Kept.Count - 2)] }
    }
    [System.IO.File]::WriteAllText($ProfilePatch, (($Kept -join "`r`n") + "`r`n"), (New-Object System.Text.UTF8Encoding($false)))
    Write-Host 'Removed the legacy managed row from the profile patch.'
  }
}

# --- 3. Remove the legacy installed copy (old flow artifact) ----------------------
$LegacyCopy = Join-Path $DshHome 'plugins/dsh-agents-board'
if (Test-Path $LegacyCopy) {
  Remove-Item -Recurse -Force $LegacyCopy
  Write-Host 'Removed the legacy installed copy under %DSH_HOME%\plugins.'
}

# --- 4. The official install: a profile bundle from a packed tarball ---------------
# The profile receives a REAL COPY of the package (pnpm installs the tarball),
# so this master folder can be moved or deleted without breaking the running
# plugin. After editing the plugin source, re-run install.ps1 to refresh the
# copy. (A directory spec would instead create a junction back to this folder,
# which dies the moment the folder moves.)
#
# The packed .tgz is NOT a leftover: the profile manifest records a file:
# reference to it, and `dsh plugin add` resolves EVERY profile dependency on
# each run - a deleted artifact breaks installs of every bundle. The artifact
# therefore lives in the profile's own .artifacts directory (stable path,
# independent of this folder's location), the CURRENT one is kept while the
# manifest references it, and superseded versions are removed POINTWISE (one
# exact path at a time, this package's artifacts only) after a successful add.
# A missing referenced artifact is cleared first with the official
# `dsh plugin remove` (the settings mirror below preserves the user's values
# across that remove+add).
Write-Host ''

# The exact artifact name this run will produce: <name>-<version>.tgz, packed
# into the profile's .artifacts directory.
$Manifest = Get-Content (Join-Path $PluginDir 'package.json') -Raw | ConvertFrom-Json
$ArtifactName = '{0}-{1}.tgz' -f $Manifest.name, $Manifest.version
$ArtifactsDir = Join-Path $DshHome "profiles/$Profile/.artifacts"
New-Item -ItemType Directory -Force -Path $ArtifactsDir | Out-Null
$ArtifactPath = Join-Path $ArtifactsDir $ArtifactName

# What does the profile currently reference for this package?
$ProfileManifestPath = Join-Path $DshHome "profiles/$Profile/package.json"
$OldArtifact = $null
if (Test-Path -LiteralPath $ProfileManifestPath) {
  try {
    $OldDep = (Get-Content $ProfileManifestPath -Raw | ConvertFrom-Json).dependencies.($Manifest.name)
  } catch {
    $OldDep = $null
  }
  if ($OldDep -match '^file:(.+\.tgz)$') {
    $OldArtifact = [System.IO.Path]::GetFullPath($Matches[1])
  }
}

# A referenced-but-missing tarball would break the add's dependency
# resolution: clear the stale bundle first (official CLI, no manual edits).
# Before that, preserve the user's live settings: the row's config block
# (edited from the Plugins page) dies with the remove, so mirror its values
# into the bundle's cordis.patch.yml (this workspace file) - the re-add then
# restores the user's values instead of the defaults. Profile is only read;
# the write lands in the workspace.
if ($null -ne $OldArtifact -and -not (Test-Path -LiteralPath $OldArtifact)) {
  $ProfilePatchPath = Join-Path $DshHome "profiles/$Profile/cordis.patch.yml"
  $BundlePatchPath = Join-Path $PluginDir 'cordis.patch.yml'
  if ((Test-Path -LiteralPath $ProfilePatchPath) -and (Test-Path -LiteralPath $BundlePatchPath)) {
    $ProfileLines = [System.IO.File]::ReadAllLines($ProfilePatchPath)
    $RowIdx = -1
    for ($i = 0; $i -lt $ProfileLines.Count; $i++) {
      if ($ProfileLines[$i] -match '^\s*-\s+id:\s*agents-board\s*$') { $RowIdx = $i; break }
    }
    if ($RowIdx -ge 0) {
      $RowIndent = $ProfileLines[$RowIdx].Length - $ProfileLines[$RowIdx].TrimStart().Length
      $ConfigVals = @{}
      $InConfig = $false
      $ConfigIndent = 0
      for ($j = $RowIdx + 1; $j -lt $ProfileLines.Count; $j++) {
        $L = $ProfileLines[$j]
        if ($L.Trim() -eq '') { continue }
        $Ind = $L.Length - $L.TrimStart().Length
        if ($Ind -le $RowIndent) { break }
        if ($L.Trim() -eq 'config:') { $InConfig = $true; $ConfigIndent = $Ind; continue }
        if ($InConfig) {
          if ($Ind -le $ConfigIndent) { $InConfig = $false; continue }
          if ($L -match '^\s*([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$') { $ConfigVals[$Matches[1]] = $Matches[2].Trim() }
        }
      }
      if ($ConfigVals.Count -gt 0) {
        $BundleLines = [System.IO.File]::ReadAllLines($BundlePatchPath)
        $BIdx = -1
        for ($i = 0; $i -lt $BundleLines.Count; $i++) {
          if ($BundleLines[$i].Trim() -eq 'config:') { $BIdx = $i; break }
        }
        if ($BIdx -ge 0) {
          $BCfgIndent = $BundleLines[$BIdx].Length - $BundleLines[$BIdx].TrimStart().Length
          $Changed = 0
          for ($j = $BIdx + 1; $j -lt $BundleLines.Count; $j++) {
            $L = $BundleLines[$j]
            if ($L.Trim() -eq '') { continue }
            $Ind = $L.Length - $L.TrimStart().Length
            if ($Ind -le $BCfgIndent) { break }
            if ($L -match '^(\s*([A-Za-z_][A-Za-z0-9_]*):\s*)(.*)$') {
              $Key = $Matches[2]
              if ($ConfigVals.ContainsKey($Key) -and $Matches[3] -ne $ConfigVals[$Key]) {
                $BundleLines[$j] = $Matches[1] + $ConfigVals[$Key]
                $Changed++
              }
            }
          }
          if ($Changed -gt 0) {
            [System.IO.File]::WriteAllText($BundlePatchPath, (($BundleLines -join "`r`n") + "`r`n"), (New-Object System.Text.UTF8Encoding($false)))
            Write-Host "Preserved $Changed live setting(s) from the profile row into the bundle patch."
          }
        }
      }
    }
  }
  Write-Host "The profile references a missing tarball ($([System.IO.Path]::GetFileName($OldArtifact))); clearing the stale bundle first."
  Push-Location $Harness
  try {
    & pnpm dsh plugin --profile $Profile remove $Manifest.name
    if ($LASTEXITCODE -ne 0) {
      Write-Host "dsh plugin remove reported exit code $LASTEXITCODE (continuing)." -ForegroundColor Yellow
    }
  } finally {
    Pop-Location
  }
  $OldArtifact = $null
}

# Pointwise pre-clean: the same-named artifact left by an interrupted earlier
# run. Safe: the pack below recreates this exact path before the add resolves
# dependencies.
if (Test-Path -LiteralPath $ArtifactPath) {
  Remove-Item -Force -LiteralPath $ArtifactPath
  Write-Host "Removed the stale same-version artifact: $ArtifactName"
}

# Pack from a staging copy WITHOUT tarballs: a previous run's .tgz sitting in
# the folder would be packed INSIDE the new artifact. The staging copy is
# exact (all files but *.tgz + every subdirectory) and removed afterwards.
$Stage = Join-Path $env:TEMP ('dsh-ab-pack-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Force -Path $Stage | Out-Null
try {
  Get-ChildItem -LiteralPath $PluginDir -File | Where-Object { $_.Extension -ne '.tgz' } | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $Stage
  }
  Get-ChildItem -LiteralPath $PluginDir -Directory | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $Stage -Recurse
  }
  Push-Location $Stage
  try {
    & pnpm pack --pack-destination $ArtifactsDir
    if ($LASTEXITCODE -ne 0) { throw "pnpm pack failed (exit code $LASTEXITCODE)." }
  } finally {
    Pop-Location
  }
} finally {
  Remove-Item -Recurse -Force -LiteralPath $Stage -ErrorAction SilentlyContinue
}
if (-not (Test-Path -LiteralPath $ArtifactPath)) { throw "pnpm pack produced no $ArtifactName." }
$Bundle = Get-Item -LiteralPath $ArtifactPath
Write-Host "Packed the bundle: $($Bundle.FullName)"

Write-Host "Installing the bundle: pnpm dsh plugin --profile $Profile add `"$($Bundle.FullName)`""
Push-Location $Harness
try {
  & pnpm dsh plugin --profile $Profile add $Bundle.FullName
  if ($LASTEXITCODE -ne 0) {
    throw "dsh plugin add failed (exit code $LASTEXITCODE)."
  }
} finally {
  Pop-Location
}

# The add has succeeded; the manifest now points at the current artifact, so
# it STAYS. Everything superseded goes - pointwise, exact paths only, this
# package's artifacts only:
#   - the previously referenced artifact (old version / old-scheme location);
#   - other dsh-agents-board-*.tgz versions in .artifacts;
#   - tarballs left in the master folder by the old scheme.
if ($null -ne $OldArtifact -and $OldArtifact -ne [System.IO.Path]::GetFullPath($ArtifactPath) -and (Test-Path -LiteralPath $OldArtifact)) {
  Remove-Item -Force -LiteralPath $OldArtifact
  Write-Host "Removed the superseded artifact: $($OldArtifact)"
}
foreach ($Stale in @(Get-ChildItem -LiteralPath $ArtifactsDir -Filter '*.tgz' -File)) {
  if ($Stale.Name -like ($Manifest.name + '-*.tgz') -and $Stale.FullName -ne [System.IO.Path]::GetFullPath($ArtifactPath)) {
    Remove-Item -Force -LiteralPath $Stale.FullName
    Write-Host "Removed the superseded artifact: $($Stale.FullName)"
  }
}
foreach ($Stale in @(Get-ChildItem -LiteralPath $PluginDir -Filter '*.tgz' -File)) {
  if ($Stale.Name -like ($Manifest.name + '-*.tgz')) {
    Remove-Item -Force -LiteralPath $Stale.FullName
    Write-Host "Removed the old-scheme artifact from the master folder: $($Stale.FullName)"
  }
}
Write-Host "Kept the referenced artifact: $ArtifactPath"

Write-Host ''
Write-Host 'dsh-agents-board installed as a profile bundle.' -ForegroundColor Green
Write-Host "  master folder : $PluginDir (portable - move or delete it freely, the profile holds its own copy)"
Write-Host "  profile copy  : $DshHome\profiles\$Profile\node_modules\dsh-agents-board (refreshed by install.ps1)"
Write-Host "  artifact      : $ArtifactPath (referenced by the profile manifest; kept)"
Write-Host ''
Write-Host 'Restart "pnpm dsh web" if the harness was running. The Plugins page then'
Write-Host 'lists Agents board with the enable switch and the settings form.'
Write-Host 'To uninstall later, run uninstall.ps1.'
