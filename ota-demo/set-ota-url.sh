#!/usr/bin/env bash
# Change the OTA server URL used by every part of this demo, in one shot.
#
# Usage:
#   ./set-ota-url.sh http://192.168.0.2:8080
#   ./set-ota-url.sh https://ota.example.com
#
# What it edits:
#   1. leptos-app/src/util.rs                     — SERVER const
#   2. capacitor-android/scripts/make-bundle.mjs  — BASE_URL fallback
#   3. capacitor-android/capacitor.config.ts      — allowNavigation
#   4. android/.../xml/network_security_config.xml (if it exists) — cleartext
#
# Idempotent, safe to re-run.
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <base-url>" >&2
  echo "  e.g. $0 http://192.168.0.2:8080" >&2
  echo "       $0 https://ota.example.com"  >&2
  exit 2
fi

BASE_URL="${1%/}"   # strip any trailing slash

if [[ ! "$BASE_URL" =~ ^https?://[^/[:space:]]+$ ]]; then
  echo "Error: '$1' doesn't look like a base URL (need http(s)://host[:port])." >&2
  exit 2
fi

# Split scheme://host[:port] for the Capacitor allowlist (which wants
# bare hostnames, with and without the port).
SCHEME_AND_REST="${BASE_URL#*://}"
HOST="${SCHEME_AND_REST%%:*}"
if [[ "$SCHEME_AND_REST" == *:* ]]; then
  HOST_WITH_PORT="$SCHEME_AND_REST"
else
  HOST_WITH_PORT="$HOST"
fi

HERE="$(cd "$(dirname "$0")" && pwd)"

echo "==> Setting OTA URL to: $BASE_URL"
echo "    host       = $HOST"
echo "    host:port  = $HOST_WITH_PORT"
echo

# Portable in-place sed (both BSD and GNU sed accept -i.bak).
sed_i() { sed -i.bak -E "$1" "$2"; }
cleanup_bak() {
  local f
  for f in "$@"; do [[ -f "$f.bak" ]] && rm -- "$f.bak"; done
}

# 1. leptos-app/src/util.rs
UTIL_RS="$HERE/leptos-app/src/util.rs"
echo "  [1/4] $UTIL_RS"
sed_i "s|^pub const SERVER: &str = \".*\";|pub const SERVER: \&str = \"$BASE_URL\";|" "$UTIL_RS"

# 2. capacitor-android/scripts/make-bundle.mjs
MAKE_BUNDLE="$HERE/capacitor-android/scripts/make-bundle.mjs"
if [[ -f "$MAKE_BUNDLE" ]]; then
  echo "  [2/4] $MAKE_BUNDLE"
  sed_i \
    "s|^(const BASE_URL = process\.env\.OTA_BASE_URL \?\? )\"[^\"]*\";|\1\"$BASE_URL\";|" \
    "$MAKE_BUNDLE"
else
  echo "  [2/4] skipped (make-bundle.mjs not found)"
fi

# 3. capacitor-android/capacitor.config.ts
CAP_CFG="$HERE/capacitor-android/capacitor.config.ts"
if [[ -f "$CAP_CFG" ]]; then
  echo "  [3/4] $CAP_CFG"
  if [[ "$HOST" == "$HOST_WITH_PORT" ]]; then
    NEW_LIST="['$HOST']"
  else
    NEW_LIST="['$HOST', '$HOST_WITH_PORT']"
  fi
  sed_i "s|allowNavigation: \\[[^]]*\\]|allowNavigation: $NEW_LIST|" "$CAP_CFG"
else
  echo "  [3/4] skipped (capacitor.config.ts not found)"
fi

# 4. Android cleartext allowlist (only if present)
NSC="$HERE/capacitor-android/android/app/src/main/res/xml/network_security_config.xml"
if [[ -f "$NSC" ]]; then
  echo "  [4/4] $NSC"
  sed_i "s|(<domain[^>]*>)[^<]*(</domain>)|\1$HOST\2|g" "$NSC"
else
  echo "  [4/4] skipped (network_security_config.xml not found)"
fi

cleanup_bak "$UTIL_RS" "$MAKE_BUNDLE" "$CAP_CFG" "$NSC"

echo
echo "Done. Rebuild + republish with: ./sync.sh"
