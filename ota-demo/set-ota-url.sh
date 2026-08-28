#!/usr/bin/env bash
# Change the OTA server URL used by every part of this demo, in one shot.
#
# Usage:
#   ./set-ota-url.sh http://192.168.1.42:8080
#   ./set-ota-url.sh https://ota.example.com
#
# What it edits:
#   1. leptos-app/src/util.rs
#        └─ DEFAULT_SERVER (baked into WASM when OTA_SERVER_URL env is unset).
#   2. capacitor-android/scripts/make-bundle.mjs
#        └─ BASE_URL fallback used when writing latest.json.
#   3. capacitor-android/capacitor.config.ts
#        └─ allowNavigation allowlist (host + host:port).
#   4. capacitor-android/android/app/src/main/res/xml/network_security_config.xml
#        └─ cleartext domain allowlist (only touched if the file exists).
#
# The script is idempotent: running it twice with the same URL is a no-op.
# All edits are done via `sed -i` with a `.bak` backup that is removed on
# success, so a failure mid-way leaves you with `.bak` files to diff.
#
# After running, rebuild + resync:
#   ./sync.sh
# and (if you changed the Android allowlist) reinstall the APK:
#   cd capacitor-android && npx cap sync android && npx cap run android
set -euo pipefail

# ---------------------------------------------------------------------------
# 0. Arg parsing + URL split
# ---------------------------------------------------------------------------

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <base-url>" >&2
  echo "  e.g. $0 http://192.168.1.42:8080" >&2
  echo "       $0 https://ota.example.com"   >&2
  exit 2
fi

RAW_URL="$1"

# Strip any trailing slash so callers can pass either form.
BASE_URL="${RAW_URL%/}"

# Very small validator — we don't need a full URL parser, just enough to
# refuse obvious mistakes like "192.168.0.2" (missing scheme).
if [[ ! "$BASE_URL" =~ ^https?://[^/[:space:]]+$ ]]; then
  echo "Error: '$RAW_URL' doesn't look like a base URL (need http(s)://host[:port])." >&2
  exit 2
fi

# Split scheme://host[:port] into pieces for the Capacitor allowlist,
# which wants bare hostnames (with and without the port).
SCHEME_AND_REST="${BASE_URL#*://}"       # host[:port]
HOST="${SCHEME_AND_REST%%:*}"            # host
if [[ "$SCHEME_AND_REST" == *:* ]]; then
  HOST_WITH_PORT="$SCHEME_AND_REST"
else
  HOST_WITH_PORT="$HOST"
fi

HERE="$(cd "$(dirname "$0")" && pwd)"

echo "==> Setting OTA URL to: $BASE_URL"
echo "    host           = $HOST"
echo "    host:port      = $HOST_WITH_PORT"
echo

# ---------------------------------------------------------------------------
# Helper: portable in-place sed (macOS's BSD sed needs a '' arg for -i).
# ---------------------------------------------------------------------------
sed_i() {
  # $1 = expression, $2 = file
  if [[ "$(uname)" == "Darwin" ]]; then
    sed -i.bak -E "$1" "$2"
  else
    sed -i.bak -E "$1" "$2"
  fi
}

# Remove *.bak files created by sed_i once we know we're done.
cleanup_bak() {
  local f
  for f in "$@"; do
    [[ -f "$f.bak" ]] && rm -- "$f.bak"
  done
}

# ---------------------------------------------------------------------------
# 1. leptos-app/src/util.rs — DEFAULT_SERVER
# ---------------------------------------------------------------------------
UTIL_RS="$HERE/leptos-app/src/util.rs"
if [[ ! -f "$UTIL_RS" ]]; then
  echo "Error: $UTIL_RS not found." >&2
  exit 1
fi
echo "  [1/4] $UTIL_RS"
sed_i \
  "s|^const DEFAULT_SERVER: &str = \".*\";|const DEFAULT_SERVER: \&str = \"$BASE_URL\";|" \
  "$UTIL_RS"

# ---------------------------------------------------------------------------
# 2. capacitor-android/scripts/make-bundle.mjs — BASE_URL fallback
# ---------------------------------------------------------------------------
MAKE_BUNDLE="$HERE/capacitor-android/scripts/make-bundle.mjs"
if [[ -f "$MAKE_BUNDLE" ]]; then
  echo "  [2/4] $MAKE_BUNDLE"
  # Matches:  const BASE_URL = process.env.OTA_BASE_URL ?? "http://..."
  sed_i \
    "s|^(const BASE_URL = process\.env\.OTA_BASE_URL \?\? )\"[^\"]*\";|\1\"$BASE_URL\";|" \
    "$MAKE_BUNDLE"
else
  echo "  [2/4] skipped (make-bundle.mjs not found)"
fi

# ---------------------------------------------------------------------------
# 3. capacitor-android/capacitor.config.ts — allowNavigation
# ---------------------------------------------------------------------------
CAP_CFG="$HERE/capacitor-android/capacitor.config.ts"
if [[ -f "$CAP_CFG" ]]; then
  echo "  [3/4] $CAP_CFG"
  # Rewrite the whole `allowNavigation: [...]` line to just the new host(s).
  # Kept single-line so the regex stays simple; if the file gets a
  # multi-line allowNavigation later, revisit this.
  if [[ "$HOST" == "$HOST_WITH_PORT" ]]; then
    NEW_LIST="['$HOST']"
  else
    NEW_LIST="['$HOST', '$HOST_WITH_PORT']"
  fi
  sed_i \
    "s|allowNavigation: \\[[^]]*\\]|allowNavigation: $NEW_LIST|" \
    "$CAP_CFG"
else
  echo "  [3/4] skipped (capacitor.config.ts not found)"
fi

# ---------------------------------------------------------------------------
# 4. Android cleartext allowlist (only touched if the file exists)
# ---------------------------------------------------------------------------
NSC="$HERE/capacitor-android/android/app/src/main/res/xml/network_security_config.xml"
if [[ -f "$NSC" ]]; then
  echo "  [4/4] $NSC"
  # Replace the *contents* of every <domain ...>...</domain> element with
  # the new host. If you want multiple hosts, edit the XML by hand.
  sed_i \
    "s|(<domain[^>]*>)[^<]*(</domain>)|\1$HOST\2|g" \
    "$NSC"
else
  echo "  [4/4] skipped (network_security_config.xml not found — HTTPS or Capacitor default is in use)"
fi

# ---------------------------------------------------------------------------
# Cleanup + done
# ---------------------------------------------------------------------------
cleanup_bak "$UTIL_RS" "$MAKE_BUNDLE" "$CAP_CFG" "$NSC"

echo
echo "Done. Next steps:"
echo "  1. Rebuild + republish the OTA bundle:   ./sync.sh"
echo "  2. If you switched between HTTP and HTTPS, or changed the Android"
echo "     allowlist, reinstall the APK:"
echo "         cd capacitor-android && npx cap sync android && npx cap run android"
