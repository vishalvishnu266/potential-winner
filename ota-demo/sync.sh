#!/usr/bin/env bash
# One-shot "publish new OTA" for macOS/Linux.
#
#   ./sync.sh
#
# Delegates to the Node build script in capacitor-android/, which:
#   1. Runs `trunk build --release` in leptos-app/.
#   2. Hashes dist/ and zips it into axum-server/bundles/<hash>.zip.
#   3. Writes axum-server/bundles/latest.json.
#
# The Axum server serves those files as-is, so as soon as this finishes you
# can tap "Check for update" on the phone.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"

echo "==> npm run bundle  (capacitor-android)"
( cd "$HERE/capacitor-android" && npm run bundle )

echo
echo "OK. New bundle is in axum-server/bundles/."
echo "Now tap 'Check for update' in the app."
