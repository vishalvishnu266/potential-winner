#!/usr/bin/env bash
# One-shot "publish new OTA" for macOS/Linux.
#
#   ./sync.sh   # trunk-build + zip + write latest.json
#
# The current OTA URL is baked into util.rs at build time; change it
# with `./set-ota-url.sh <url>` first if needed.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"

echo "==> npm run bundle  (capacitor-android)"
( cd "$HERE/capacitor-android" && npm run bundle )

echo
echo "OK. New bundle is in axum-server/bundles/."
echo "Tap 'Check for update' in the app (or wait ~15s for the poller)."
