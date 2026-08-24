# Leptos + Axum + Capacitor — live OTA demo

Edit Leptos code → run one command on your laptop → tap **Check for update**
on the phone → the running app swaps to the new WASM+JS+HTML bundle.

* **Leptos** (CSR, builder-style — no `view!` macro) as the frontend.
* **Axum** server that watches `leptos-app/dist/` and serves whatever's in
  it as the "latest bundle" via a hashed manifest.
* **Capacitor** Android wrapper with `INTERNET` + `VIBRATE`, cleartext
  allowed for `192.168.0.2`, and a `MainActivity` that swaps the WebView
  root to the OTA directory on next launch.

## One-time setup

```bash
# 1. Rust WASM toolchain
rustup target add wasm32-unknown-unknown
cargo install trunk

# 2. Capacitor deps
cd capacitor-android && npm install && cd ..

# 3. First Leptos build (creates leptos-app/dist/)
cd leptos-app && trunk build --release && cd ..
```

Make sure your dev machine is reachable at **192.168.0.2** on the same
Wi-Fi as your phone (or edit `SERVER` in `leptos-app/src/main.rs` and the
domain in `capacitor-android/android/app/src/main/res/xml/network_security_config.xml`).

## Terminal 1 — start the OTA server (leave running)

```bash
cd axum-server
cargo run --release
# → OTA server listening on http://0.0.0.0:8080
# → Serving OTA bundles from: …/ota-demo/leptos-app/dist
```

Endpoints:
* `GET /version`  → `{"version":"<sha256>"}` — hash of everything in dist/
* `GET /manifest` → `{"version":"…","files":[{"path":"…","sha256":"…","size":…}, …]}`
* `GET /files/<rel>` → raw file bytes (any file in dist/)

## Terminal 2 — install the app once

```bash
cd capacitor-android
npx cap sync android
npx cap run android
```

The bundled v1 UI opens. The status pill shows the installed version.

## The dev loop — “edit Leptos and see it on the phone”

1. Edit `leptos-app/src/main.rs` (say, change the `<h1>` text).
2. From `ota-demo/` run:

   * Windows: `./sync.ps1`
   * macOS/Linux: `./sync.sh`
   * Anywhere: `cd leptos-app && trunk build --release`
   * Or from `capacitor-android/`: `npm run ota`

   This just rebuilds `leptos-app/dist/`. That's it — no server restart,
   no manual version bump. The server re-hashes dist/ on every request.

3. On the phone, tap **Check for update**. It will:
   * `GET /version` → new hash detected
   * `GET /manifest` → list of files (`index.html`, `leptos-app-<hash>.js`,
     `leptos-app-<hash>_bg.wasm`, …)
   * download each via `GET /files/<path>`
   * write them into the app's `Data/public/…` directory via
     `Capacitor.Plugins.Filesystem.writeFile`
   * store the new version and `reload()`

4. `MainActivity` sees `Data/public/index.html` exists and calls
   `bridge.setServerBasePath(...)` so the WebView loads your fresh Leptos
   bundle instead of the one shipped in the APK.

## Layout

```
ota-demo/
├── README.md
├── sync.ps1 / sync.sh          ← one-shot rebuild
├── axum-server/                ← cargo run --release
│   └── src/main.rs             ← hashes dist/, exposes /version /manifest /files/*
├── leptos-app/                 ← trunk build --release
│   └── src/main.rs             ← builder-style Leptos + OTA client
└── capacitor-android/
    ├── capacitor.config.ts     ← webDir=../leptos-app/dist
    └── android/app/src/main/
        ├── AndroidManifest.xml            ← INTERNET, VIBRATE, cleartext
        ├── res/xml/network_security_config.xml   ← 192.168.0.2 whitelist
        └── java/com/example/otademo/MainActivity.java
                                            ← bridge.setServerBasePath(OTA dir)
```

## Gotchas

* **Binary files (WASM) are transferred as base64** by the Leptos client,
  because `Capacitor.Filesystem.writeFile` needs base64 for non-utf8 data.
  Fine for demo-sized bundles (a few hundred KB).
* **Old hashed files are wiped** before writing new ones (`rmdir public`).
  This prevents old `leptos-app-abc123_bg.wasm` from lingering next to the
  new `leptos-app-def456_bg.wasm`.
* **Trunk's `public_url` is `./`** so all asset paths in `index.html` are
  relative — required because the WebView loads from a local file path.
* **You never need to re-install the APK** just to update Leptos code.
  You only re-install when you touch Java/Kotlin, native plugins, or
  permissions.

## Reset an install

If the app gets stuck on a broken OTA:

```bash
adb shell pm clear com.example.otademo
```

That wipes the `Data` directory, so on next launch it falls back to the
bundled v1 assets.
