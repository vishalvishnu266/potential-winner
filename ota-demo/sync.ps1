# One-shot "publish new OTA" for Windows PowerShell.
#
#   .\sync.ps1
#
# Delegates to the Node build script in capacitor-android/, which:
#   1. Runs `trunk build --release` in leptos-app/.
#   2. Hashes dist/ and zips it into axum-server/bundles/<hash>.zip.
#   3. Writes axum-server/bundles/latest.json.
#
# The Axum server serves those files as-is, so as soon as this finishes you
# can tap "Check for update" on the phone.

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
Write-Host "Now tap 'Check for update' in the app." -ForegroundColor Green
