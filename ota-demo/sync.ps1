# One-shot "publish new OTA" for Windows PowerShell.
#
#   .\sync.ps1   # trunk-build + zip + write latest.json
#
# The current OTA URL is baked into util.rs at build time; change it
# with `.\set-ota-url.ps1 <url>` first if needed.

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "==> npm run bundle  (capacitor-android)" -ForegroundColor Cyan
Push-Location (Join-Path $here "capacitor-android")
try {
    npm run bundle
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "OK. New bundle is in axum-server/bundles/." -ForegroundColor Green
Write-Host "Tap 'Check for update' in the app (or wait ~15s for the poller)." -ForegroundColor Green
