# install.ps1 - wire dsh-agents-board into the web profile.
#
# Run from anywhere:  powershell -ExecutionPolicy Bypass -File install.ps1
# Idempotent: re-running refreshes the installed copy and the managed row.
# ASCII-only source: Windows PowerShell 5.1 reads BOM-less files as ANSI.
#
# The FIRST install copies the whole delivery folder (scripts included) into
# %DSH_HOME%\plugins\dsh-agents-board. From then on that installed copy is the
# live plugin and the delivery folder is just the portable master: the harness
# never reads this folder again, and uninstall.ps1 also ships in the installed
# copy.

$ErrorActionPreference = 'Stop'

# --- Locate the delivery folder ------------------------------------------------
$PluginDir = $PSScriptRoot
if ([string]::IsNullOrEmpty($PluginDir)) {
  throw 'install.ps1 must run as a saved script file (needs $PSScriptRoot).'
}

# --- Resolve the harness home ---------------------------------------------------
$DshHome = $env:DSH_HOME
if ([string]::IsNullOrEmpty($DshHome)) { $DshHome = Join-Path $env:USERPROFILE '.dsh' }

# --- Copy the whole folder into the harness home ---------------------------------
$InstallDir = Join-Path $DshHome 'plugins/dsh-agents-board'
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
foreach ($File in @('package.json', 'host.mjs', 'client.js', 'install.ps1', 'install.bat', 'uninstall.ps1', 'uninstall.bat', 'README.md', 'cordis.patch.yml', 'PLUGIN-FAILSAFE-REPORT.md')) {
  $From = (Resolve-Path (Join-Path $PluginDir $File)).Path
  $To = Join-Path $InstallDir $File
  if ($From -ne $To) { Copy-Item -Force $From $To }
}
$HostFile = Join-Path $InstallDir 'host.mjs'
$HostUrl = [System.Uri]::new($HostFile).AbsoluteUri

# --- Rewrite the delivery folder's informational patch file ---------------------
$PatchSource = Join-Path $PluginDir 'cordis.patch.yml'
$PatchContent = @(
  '# Agents board - informational copy of the row installed by install.ps1.',
  '# The live row lives in %DSH_HOME%\profiles\web\cordis.patch.yml and points at',
  '# the installed copy under %DSH_HOME%\plugins\dsh-agents-board\host.mjs.',
  '- insert:',
  ('  - name: ' + $HostUrl),
  '    config:',
  '      enabled: true'
) -join "`r`n"
[System.IO.File]::WriteAllText($PatchSource, $PatchContent + "`r`n", (New-Object System.Text.UTF8Encoding($false)))

# --- Prepare the web profile layer (self-sufficient on a fresh harness) ---------
$ProfileDir = Join-Path $DshHome 'profiles/web'
$FreshHarness = -not (Test-Path $ProfileDir)
if ($FreshHarness) {
  # A bare harness home has no profile yet; the harness scaffolds its own files
  # on first 'pnpm dsh web' and reads this patch layer from the same directory.
  New-Item -ItemType Directory -Force -Path $ProfileDir | Out-Null
  Write-Host "Created the web profile directory $ProfileDir (fresh harness)." -ForegroundColor Yellow
}
$ProfilePatch = Join-Path $ProfileDir 'cordis.patch.yml'

$RowMarker = '# dsh-agents-board (managed by install.ps1)'
$RowBody = @('- insert:', ('  - name: ' + $HostUrl), '    config:', '      enabled: true')

$Utf8 = New-Object System.Text.UTF8Encoding($false)
if (Test-Path $ProfilePatch) {
  $ExistingText = [System.IO.File]::ReadAllText($ProfilePatch)
  $Existing = $ExistingText -split "`r?`n"
  $Kept = @()
  $SkipRow = $false
  foreach ($Line in $Existing) {
    if ($Line -eq $RowMarker) { $SkipRow = $true; continue }
    if ($SkipRow) {
      # Drop the previously written 4-line managed row. The row is followed by
      # the blank separator line we wrote; an empty line also ENDS the row
      # (otherwise a file that contains only the managed row would keep the
      # empty tail inside the skip state and the trim below would ping-pong).
      if ($Line -match '^\s' -or $Line -match '^-' -or $Line -eq '') { continue }
      $SkipRow = $false
    }
    $Kept += $Line
  }
  # Trim trailing blank lines; guard the single-element case (a 0..-1 range
  # would wrap around and grow the array back - an infinite loop).
  while ($Kept.Count -gt 0 -and $Kept[$Kept.Count - 1] -eq '') {
    $Kept = if ($Kept.Count -eq 1) { @() } else { $Kept[0..($Kept.Count - 2)] }
  }
  $Merged = ($Kept -join "`r`n") + "`r`n`r`n" + $RowMarker + "`r`n" + ($RowBody -join "`r`n") + "`r`n"
  [System.IO.File]::WriteAllText($ProfilePatch, $Merged, $Utf8)
} else {
  $Fresh = $RowMarker + "`r`n" + ($RowBody -join "`r`n") + "`r`n"
  [System.IO.File]::WriteAllText($ProfilePatch, $Fresh, $Utf8)
}

# --- Ensure the settings section (uninstall.ps1 removes it; restore defaults) --
# The user's section is never overwritten - only recreated when absent, so an
# uninstall+install cycle cannot silently wipe notify/sound preferences. On a
# fresh harness the file itself is created with just this section; the harness
# keeps its own keys around it.
$SettingsPath = Join-Path $DshHome 'settings.yaml'
if (Test-Path $SettingsPath) {
  $SettingsText = [System.IO.File]::ReadAllText($SettingsPath)
  if ($SettingsText -notmatch '(?m)^agents-board:') {
    $Section = "`r`nagents-board:`r`n  enabled: true`r`n  language: ru`r`n  notify: true`r`n  sound: browser`r`n  device: `"`"`r`n"
    [System.IO.File]::WriteAllText($SettingsPath, $SettingsText.TrimEnd("`r", "`n") + $Section, $Utf8)
    Write-Host 'Restored the agents-board section in settings.yaml (was removed by uninstall).' -ForegroundColor Yellow
  }
} else {
  $Section = "agents-board:`r`n  enabled: true`r`n  language: ru`r`n  notify: true`r`n  sound: browser`r`n  device: `"`"`r`n"
  [System.IO.File]::WriteAllText($SettingsPath, $Section, $Utf8)
  Write-Host "Created $SettingsPath with the agents-board section (fresh harness)." -ForegroundColor Yellow
  $FreshHarness = $true
}

# --- Sanity: the default chime file (informational, browser mode needs none) ---
$ChimeDefault = 'C:\Windows\Media\Windows Notify System Generic.wav'
if (-not (Test-Path $ChimeDefault)) {
  Write-Host "Note: the default chime file is missing ($ChimeDefault)." -ForegroundColor Yellow
  Write-Host "The 'browser' sound mode works without it; 'wav' needs an existing .wav path in settings."
}

Write-Host ''
Write-Host 'dsh-agents-board installed.' -ForegroundColor Green
Write-Host "  delivery folder : $PluginDir (portable master, kept as-is)"
Write-Host "  installed copy  : $InstallDir (the live plugin)"
Write-Host "  profile patch   : $ProfilePatch"
Write-Host ''
if ($FreshHarness) {
  Write-Host 'Fresh harness detected: start "pnpm dsh web" once - the harness scaffolds'
  Write-Host 'the rest of the profile and activates the plugin row that is already in place.'
} else {
  Write-Host 'Reload the web page; if the board does not appear, restart pnpm dsh web.'
}
Write-Host 'To uninstall later, run uninstall.ps1 from the installed copy.'
