# One-shot "publish new OTA" for Windows PowerShell.
#
#   .\sync.ps1
#
# Just rebuilds the Leptos bundle into leptos-app/dist/. The running Axum
# server rescans that directory on every request, so as soon as this
# finishes you can tap "Check for update" on the phone.

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "==> trunk build --release  (leptos-app)" -ForegroundColor Cyan
Push-Location (Join-Path $here "leptos-app")
try {
    trunk build --release
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "OK. New bundle is in leptos-app/dist/." -ForegroundColor Green
Write-Host "Now tap 'Check for update' in the app." -ForegroundColor Green
