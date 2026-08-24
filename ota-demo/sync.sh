#!/usr/bin/env bash
# One-shot "publish new OTA" for macOS/Linux.
#
#   ./sync.sh
#
# Just rebuilds the Leptos bundle into leptos-app/dist/. The running Axum
# server rescans that directory on every request, so as soon as this
# finishes you can tap "Check for update" on the phone.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"

echo "==> trunk build --release  (leptos-app)"
( cd "$HERE/leptos-app" && trunk build --release )

echo
echo "OK. New bundle is in leptos-app/dist/."
echo "Now tap 'Check for update' in the app."
