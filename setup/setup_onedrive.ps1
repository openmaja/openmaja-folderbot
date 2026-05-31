<#
.SYNOPSIS
    Creates the FolderBot folder structure inside the local OneDrive sync folder.

.DESCRIPTION
    Requires OneDrive to be installed and running (already syncing your OneDrive for Business).
    Creates folders and copies SOUL.md directly on the local filesystem — OneDrive syncs
    everything to the cloud automatically. No authentication or network calls required.

    Creates:
      <OneDrive>/FolderBot/
      <OneDrive>/FolderBot/sessions/
      <OneDrive>/FolderBot/SOUL.md

.PARAMETER RootFolderName
    Name of the root folder. Default: "FolderBot".
    Must match the value you set as a Power Automate environment variable in Step 2.

.EXAMPLE
    .\setup_onedrive.ps1
    .\setup_onedrive.ps1 -RootFolderName "MyFolderBot"

.REQUIREMENTS
    - OneDrive for Business installed and actively syncing (check the system tray icon)
    - No special PowerShell version or modules required
#>

param(
    [string]$RootFolderName = "FolderBot"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ── Detect local OneDrive sync folder ────────────────────────────────────
# $env:OneDriveCommercial is set by the OneDrive for Business sync client.
# $env:OneDrive is the fallback for personal OneDrive.
$onedrivePath = $env:OneDriveCommercial
if (-not $onedrivePath) { $onedrivePath = $env:OneDrive }

if (-not $onedrivePath -or -not (Test-Path $onedrivePath)) {
    Write-Error @"
Could not detect the OneDrive sync folder.
Make sure OneDrive for Business is installed and actively syncing (check the system tray icon).
If OneDrive is running but the folder was not detected, set the path manually:
  `$env:OneDriveCommercial = 'C:\Users\<you>\OneDrive - <Company>'
Then re-run the script.
"@
    exit 1
}

Write-Host "OneDrive folder detected: $onedrivePath" -ForegroundColor Green

# ── Create folder structure ───────────────────────────────────────────────
$rootPath     = Join-Path $onedrivePath $RootFolderName
$sessionsPath = Join-Path $rootPath "sessions"

New-Item -ItemType Directory -Path $rootPath     -Force | Out-Null
New-Item -ItemType Directory -Path $sessionsPath -Force | Out-Null

Write-Host "  Created: $rootPath" -ForegroundColor Green
Write-Host "  Created: $sessionsPath" -ForegroundColor Green

# ── Copy SOUL.md ──────────────────────────────────────────────────────────
$soulSource = Join-Path $PSScriptRoot ".." "agents" "SOUL.md"
$soulDest   = Join-Path $rootPath "SOUL.md"

if (Test-Path $soulSource) {
    Copy-Item -Path (Resolve-Path $soulSource) -Destination $soulDest -Force
    Write-Host "  Copied:  SOUL.md → $soulDest" -ForegroundColor Green
} else {
    Write-Warning "agents/SOUL.md not found at $soulSource"
    Write-Warning "Copy it manually to: $soulDest"
}

# ── Summary ───────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "✔ Step 1 setup complete!" -ForegroundColor Green
Write-Host "  OneDrive will sync these folders to the cloud automatically."
Write-Host "  (Watch the system tray icon — sync usually completes in seconds.)"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Customize $soulDest for your tenant."
Write-Host "  2. Note the RootFolderName ('$RootFolderName') — enter it as an"
Write-Host "     environment variable when importing the Power Automate solution."
Write-Host "  3. Import the solution with setup/one-shot-import.md"
Write-Host "     or build flows manually with setup/power-automate-flows.md."
Write-Host ""
