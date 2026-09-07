#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# post-create.sh
#
# Runs once after the Codespace / dev container is created. Installs Go
# tooling, downloads Go modules, installs npm dependencies and pre-copies
# wasm_exec.js so a fresh `npm run build` succeeds immediately.
# ---------------------------------------------------------------------------
set -euo pipefail

echo "▶ Go version:    $(go version)"
echo "▶ Node version:  $(node --version)"
echo "▶ npm version:   $(npm --version)"

# ---------------------------------------------------------------------------
# Go tooling
# ---------------------------------------------------------------------------
echo "▶ Installing Go tools (goimports, staticcheck, gopls)…"
go install golang.org/x/tools/cmd/goimports@latest
go install honnef.co/go/tools/cmd/staticcheck@latest
go install golang.org/x/tools/gopls@latest

# ---------------------------------------------------------------------------
# Go modules
# ---------------------------------------------------------------------------
if [ -f go.mod ]; then
  echo "▶ Downloading Go modules…"
  go mod download || true
  go mod tidy    || true
fi

# ---------------------------------------------------------------------------
# Node / Capacitor
# ---------------------------------------------------------------------------
if [ -f package.json ]; then
  echo "▶ Installing npm dependencies…"
  npm install --no-audit --no-fund
  echo "▶ Installing Capacitor CLI globally (optional convenience)…"
  npm install --global @capacitor/cli || true
fi

# ---------------------------------------------------------------------------
# Prime the wasm_exec.js copy so `npm run build` doesn't fail on first run
# ---------------------------------------------------------------------------
mkdir -p dist
GOROOT_DIR="$(go env GOROOT)"
for candidate in \
  "$GOROOT_DIR/lib/wasm/wasm_exec.js" \
  "$GOROOT_DIR/misc/wasm/wasm_exec.js"; do
  if [ -f "$candidate" ]; then
    cp "$candidate" dist/wasm_exec.js
    echo "▶ Copied $candidate → dist/wasm_exec.js"
    break
  fi
done

echo "✅ Dev container ready. Try:  npm run build   or   go run ."
