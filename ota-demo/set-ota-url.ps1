# Change the OTA server URL used by every part of this demo, in one shot.
#
# Usage:
#   .\set-ota-url.ps1 http://192.168.1.42:8080
#   .\set-ota-url.ps1 https://ota.example.com
#
# See set-ota-url.sh for the full list of files edited and rationale.

param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string] $BaseUrl
)

$ErrorActionPreference = "Stop"

# ---------------------------------------------------------------------------
# 0. Parse + validate the URL
# ---------------------------------------------------------------------------
$BaseUrl = $BaseUrl.TrimEnd('/')
if ($BaseUrl -notmatch '^https?://[^/\s]+$') {
    Write-Error "'$BaseUrl' doesn't look like a base URL (need http(s)://host[:port])."
}

$schemeAndRest = $BaseUrl -replace '^https?://', ''
# NOTE: `$host` is an automatic PowerShell variable (the host UI object)
# and is effectively read-only. Using `$hostName` keeps things clean.
$hostName     = ($schemeAndRest -split ':')[0]
$hostWithPort = $schemeAndRest

$here = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "==> Setting OTA URL to: $BaseUrl" -ForegroundColor Cyan
Write-Host "    host           = $hostName"
Write-Host "    host:port      = $hostWithPort"
Write-Host ""

# ---------------------------------------------------------------------------
# Helper: read → regex-replace → write, but only if the file exists.
# ---------------------------------------------------------------------------
function Edit-File {
    param(
        [string] $Path,
        [string] $Pattern,
        [string] $Replacement,
        [string] $Label
    )
    if (-not (Test-Path $Path)) {
        Write-Host "  $Label skipped (not found)"
        return
    }
    Write-Host "  $Label $Path"
    $content = Get-Content -Raw -Path $Path
    $updated = [regex]::Replace($content, $Pattern, $Replacement)
    if ($updated -ne $content) {
        Set-Content -Path $Path -Value $updated -NoNewline
    }
}

# ---------------------------------------------------------------------------
# 1. leptos-app/src/util.rs — DEFAULT_SERVER
# ---------------------------------------------------------------------------
Edit-File `
    -Path       (Join-Path $here 'leptos-app\src\util.rs') `
    -Pattern    '(?m)^const DEFAULT_SERVER: &str = "[^"]*";' `
    -Replacement ('const DEFAULT_SERVER: &str = "' + $BaseUrl + '";') `
    -Label      '[1/4]'

# ---------------------------------------------------------------------------
# 2. capacitor-android/scripts/make-bundle.mjs — BASE_URL fallback
# ---------------------------------------------------------------------------
Edit-File `
    -Path       (Join-Path $here 'capacitor-android\scripts\make-bundle.mjs') `
    -Pattern    '(?m)^(const BASE_URL = process\.env\.OTA_BASE_URL \?\? )"[^"]*";' `
    -Replacement ('$1"' + $BaseUrl + '";') `
    -Label      '[2/4]'

# ---------------------------------------------------------------------------
# 3. capacitor-android/capacitor.config.ts — allowNavigation
# ---------------------------------------------------------------------------
if ($hostName -eq $hostWithPort) {
    $newList = "['$hostName']"
} else {
    $newList = "['$hostName', '$hostWithPort']"
}
Edit-File `
    -Path       (Join-Path $here 'capacitor-android\capacitor.config.ts') `
    -Pattern    'allowNavigation: \[[^\]]*\]' `
    -Replacement ('allowNavigation: ' + $newList) `
    -Label      '[3/4]'

# ---------------------------------------------------------------------------
# 4. Android cleartext allowlist (only touched if file exists)
# ---------------------------------------------------------------------------
Edit-File `
    -Path       (Join-Path $here 'capacitor-android\android\app\src\main\res\xml\network_security_config.xml') `
    -Pattern    '(<domain[^>]*>)[^<]*(</domain>)' `
    -Replacement ('$1' + $hostName + '$2') `
    -Label      '[4/4]'

Write-Host ""
Write-Host "Done. Next steps:" -ForegroundColor Green
Write-Host "  1. Rebuild + republish the OTA bundle:   .\sync.ps1"
Write-Host "  2. If you switched between HTTP and HTTPS, or changed the Android"
Write-Host "     allowlist, reinstall the APK:"
Write-Host "         cd capacitor-android; npx cap sync android; npx cap run android"
