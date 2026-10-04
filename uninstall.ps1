# uninstall.ps1 - remove dsh-agents-board from the web profile.
# ASCII-only source: Windows PowerShell 5.1 reads BOM-less files as ANSI.
#
# The plugin installs as a profile bundle, so the primary step is the
# harness's own removal (`pnpm dsh plugin --profile web remove ...`) run from
# the harness checkout. The script also cleans up what older installers left:
# the managed file:// row in the profile patch, the legacy installed copy
# under %DSH_HOME%\plugins, and a legacy agents-board section in settings.yaml.

param(
  # Harness source checkout. Probed automatically when omitted.
  [string]$HarnessRoot = '',
  # Profile the bundle was installed into.
  [string]$Profile = 'web'
)

$ErrorActionPreference = 'Stop'

$ScriptDir = $PSScriptRoot

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
  if (Test-Path (Join-Path $Root 'apps/cli/package.json')) { $Harness = $Root; break }
  if (Test-Path (Join-Path $Root 'vendor/schemastery/lib/index.cjs')) { $Harness = $Root; break }
}

# --- 1. The official removal -----------------------------------------------------
if ($null -ne $Harness) {
  Write-Host "Removing the bundle: pnpm dsh plugin --profile $Profile remove dsh-agents-board"
  Push-Location $Harness
  try {
    & pnpm dsh plugin --profile $Profile remove dsh-agents-board
    if ($LASTEXITCODE -ne 0) {
      Write-Host "dsh plugin remove reported exit code $LASTEXITCODE (not installed?)." -ForegroundColor Yellow
    }
  } finally {
    Pop-Location
  }
} else {
  Write-Host 'Harness checkout not found; pass -HarnessRoot to remove the bundle via the CLI.' -ForegroundColor Yellow
  Write-Host 'Continuing with legacy cleanup only.' -ForegroundColor Yellow
}

# --- 2. Remove the legacy managed row --------------------------------------------
$ProfilePatch = Join-Path $DshHome "profiles/$Profile/cordis.patch.yml"
$RowMarker = '# dsh-agents-board (managed by install.ps1)'
$Utf8 = New-Object System.Text.UTF8Encoding($false)

if (Test-Path $ProfilePatch) {
  $ExistingText = [System.IO.File]::ReadAllText($ProfilePatch)
  if ($ExistingText.Contains($RowMarker)) {
    $Existing = $ExistingText -split "`r?`n"
    $Kept = @()
    $SkipRow = $false
    foreach ($Line in $Existing) {
      if ($Line -eq $RowMarker) { $SkipRow = $true; continue }
      if ($SkipRow) {
        # The managed row spans the indented lines after the marker; a blank
        # line also ends it (guards the single-row-file case).
        if ($Line -match '^\s' -or $Line -match '^-' -or $Line -eq '') { continue }
        $SkipRow = $false
      }
      $Kept += $Line
    }
    if ($Kept.Count -ne $Existing.Count) {
      # Guard the single-element case (a 0..-1 range wraps and grows the array).
      while ($Kept.Count -gt 0 -and $Kept[$Kept.Count - 1] -eq '') {
        $Kept = if ($Kept.Count -eq 1) { @() } else { $Kept[0..($Kept.Count - 2)] }
      }
      [System.IO.File]::WriteAllText($ProfilePatch, (($Kept -join "`r`n") + "`r`n"), $Utf8)
      Write-Host "Removed the legacy agents-board row from $ProfilePatch" -ForegroundColor Green
    }
  }
}

# --- 3. Remove the legacy installed copy ------------------------------------------
$InstallDir = Join-Path $DshHome 'plugins/dsh-agents-board'
$RunningFromInstalled = $false
try {
  $RunningFromInstalled = (Resolve-Path $ScriptDir).Path -eq (Resolve-Path $InstallDir -ErrorAction SilentlyContinue).Path
} catch {
  $RunningFromInstalled = $false
}
if (Test-Path $InstallDir) {
  try {
    Remove-Item -Recurse -Force $InstallDir -ErrorAction Stop
    Write-Host "Removed the legacy installed copy $InstallDir" -ForegroundColor Green
  } catch {
    # Deleting the folder that contains this running script can be blocked on
    # Windows; everything else is already uninstalled, so the leftover files
    # are inert.
    Write-Host "Could not delete $InstallDir (script may be running from it); delete it manually." -ForegroundColor Yellow
  }
}

# --- 4. Remove a legacy settings section ------------------------------------------
$SettingsPath = Join-Path $DshHome 'settings.yaml'
if (Test-Path $SettingsPath) {
  $SettingsText = [System.IO.File]::ReadAllText($SettingsPath)
  $Settings = $SettingsText -split "`r?`n"
  if ($Settings -match '^agents-board:') {
    $Kept = @()
    $InSection = $false
    foreach ($Line in $Settings) {
      if ($Line -match '^agents-board:') { $InSection = $true; continue }
      if ($InSection -and $Line -match '^\S') { $InSection = $false }
      if (-not $InSection) { $Kept += $Line }
    }
    while ($Kept.Count -gt 0 -and $Kept[$Kept.Count - 1] -eq '') {
      $Kept = if ($Kept.Count -eq 1) { @() } else { $Kept[0..($Kept.Count - 2)] }
    }
    [System.IO.File]::WriteAllText($SettingsPath, (($Kept -join "`r`n") + "`r`n"), $Utf8)
    Write-Host "Removed the agents-board section from $SettingsPath" -ForegroundColor Green
  }
}

Write-Host ''
Write-Host 'dsh-agents-board uninstalled. Restart the web server to apply.'
if (-not $RunningFromInstalled) {
  Write-Host "The delivery folder $ScriptDir was left in place; delete it if you no longer need it."
}
