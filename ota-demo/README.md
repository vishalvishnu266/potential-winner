# Leptos + Axum + Capacitor OTA demo

A minimal end-to-end example showing:

* **Leptos** (CSR, builder-style — no `view!` macro) as the frontend.
* **Axum** server on `192.168.0.2:8080` serving a version manifest and an
  updated HTML bundle.
* **Capacitor** Android wrapper that:
  * has `INTERNET` permission,
  * allows cleartext traffic to the local LAN (`192.168.0.0/16`),
  * exposes the native **Haptics / Vibrate** plugin to the WebView,
  * loads the OTA-updated HTML from the app's writable storage when present,
    otherwise falls back to the bundled assets.

## Layout

```
ota-demo/
├── axum-server/       # cargo run --release
├── leptos-app/        # trunk build --release
└── capacitor-android/ # npx cap sync android && npx cap run android
```

## 1. Run the server on your dev machine (which must be reachable at 192.168.0.2)

```bash
cd axum-server
cargo run --release
# Serving on http://192.168.0.2:8080
#   GET /version       -> {"version":"2"}
#   GET /bundle/2/index.html
```

Bump the number in `axum-server/bundles/version.txt` and edit
`axum-server/bundles/2/index.html` (or create `bundles/3/…`) to publish a new
OTA.

## 2. Build the Leptos WASM bundle

```bash
cd leptos-app
rustup target add wasm32-unknown-unknown
cargo install trunk
trunk build --release
# Output goes to leptos-app/dist/
```

Copy the built assets into the Capacitor web root (or point `webDir` at
`../leptos-app/dist` — already done in `capacitor.config.ts`).

## 3. Build and run the Android app

```bash
cd capacitor-android
npm install
npx cap sync android
npx cap run android
```

The app loads the Leptos SPA. Tapping **Check for update** hits
`http://192.168.0.2:8080/version`, and if newer, downloads the new
`index.html`, writes it to the Capacitor `Data` directory, and reloads.
Tapping **Vibrate** proves the native bridge works.

## Notes

* Keep phone and dev machine on the same Wi-Fi.
* If your dev machine isn't `192.168.0.2`, change the constant `SERVER` in
  `leptos-app/src/main.rs` and re-build, and update the
  `network_security_config.xml` domain if you want to restrict cleartext.
* This example intentionally OTA-updates only `index.html` for clarity. In a
  real app you'd ship a zipped bundle (JS + WASM + assets), verify a
  signature, and swap atomically.
