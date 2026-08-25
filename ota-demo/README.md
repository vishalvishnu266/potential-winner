# Leptos + Axum + Capacitor — live OTA demo

Edit Leptos code → run one command on your laptop → tap **Check for update**
on the phone → the running app swaps to the new WASM+JS+HTML bundle.

* **Leptos** (CSR, builder-style — no `view!` macro) as the frontend.
* **Axum** server that serves pre-built OTA bundles (`<hash>.zip` +
  `latest.json`) from `axum-server/bundles/`.
* **Capacitor** Android wrapper with `INTERNET` + `VIBRATE`, cleartext
  allowed for `192.168.0.2`. The OTA download/activation/reload is handled
  by the [`@capawesome/capacitor-live-update`](https://capawesome.io/plugins/live-update/)
  plugin — no custom Java code required.

## One-time setup

```bash
# 1. Rust WASM toolchain
rustup target add wasm32-unknown-unknown
cargo install trunk
cargo install stylance-cli   # typesafe CSS modules → dist/stylance.css

# 2. Capacitor deps (installs @capawesome/capacitor-live-update)
cd capacitor-android && npm install && cd ..

# 3. First OTA bundle (creates axum-server/bundles/<hash>.zip + latest.json)
./sync.sh          # or .\sync.ps1 on Windows
```

Make sure your dev machine is reachable at **192.168.0.2** on the same
Wi-Fi as your phone (or edit `SERVER` in `leptos-app/src/main.rs`, the
`OTA_BASE_URL` env for the sync script, and the domain in
`capacitor-android/android/app/src/main/res/xml/network_security_config.xml`).

## Terminal 1 — start the OTA server (leave running)

```bash
cd axum-server
cargo run --release
# → OTA server listening on http://0.0.0.0:8080
# → Serving OTA bundles from: …/ota-demo/axum-server/bundles
```

Endpoints:
* `GET /latest`             → `{"version":"<sha>","url":"…/bundles/<sha>.zip","artifactType":"zip"}`
* `GET /version`            → `{"version":"<sha>"}` (thin passthrough of `latest.json.version`)
* `GET /bundles/<name>.zip` → raw bundle bytes

## Terminal 2 — install the app once

```bash
cd capacitor-android
npx cap sync android      # picks up @capawesome/capacitor-live-update
npx cap run android
```

The bundled v1 UI opens. The status pill shows the installed bundle id
(`bundled` until the first OTA is applied).

## The dev loop — “edit Leptos and see it on the phone”

1. Edit `leptos-app/src/main.rs` (say, change the `<h1>` text).
2. From `ota-demo/` run:

   * Windows: `./sync.ps1`
   * macOS/Linux: `./sync.sh`
   * Or directly: `cd capacitor-android && npm run bundle`

   This trunk-builds `leptos-app/dist/`, zips it into
   `axum-server/bundles/<hash>.zip`, and updates
   `axum-server/bundles/latest.json`. No server restart, no manual version
   bump.

3. On the phone, tap **Check for update**. It will:
   * `GET /latest` → new `{version, url}` detected.
   * Call `LiveUpdate.downloadBundle({ bundleId, url })` — the plugin
     downloads the zip, verifies size/hash internally, and extracts it into
     the app's private storage.
   * Call `LiveUpdate.setNextBundle({ bundleId })` to activate it.
   * Call `LiveUpdate.reload()` to restart the WebView into the new
     bundle immediately.

4. Because activation + reload are handled by the plugin, `MainActivity`
   stays as a plain `extends BridgeActivity {}` — no custom Java needed.

## Layout

```
ota-demo/
├── README.md
├── sync.ps1 / sync.sh                ← wraps `npm run bundle`
├── axum-server/
│   ├── src/main.rs                   ← serves /latest and /bundles/*.zip
│   └── bundles/                      ← <hash>.zip + latest.json (generated)
├── leptos-app/                       ← trunk build --release
│   ├── Trunk.toml                    ← runs stylance-cli as pre-build hook
│   ├── stylance.toml                 ← CSS-modules output config
│   ├── assets/global.css             ← resets + design tokens (non-scoped)
│   └── src/
│       ├── main.rs                   ← panic hook + mount_to_body(App)
│       ├── app.rs                    ← top-level <App/> layout
│       ├── config.rs                 ← SERVER, BUNDLED_VERSION, short()
│       ├── components/               ← <StatusPill/>, <ActionButton/>, <LogPane/>
│       ├── styles/*.module.css       ← per-component typesafe CSS modules
│       ├── platform/                 ← window, capacitor, fetch, haptics
│       └── ota/                      ← run_update + LiveUpdate wrappers
└── capacitor-android/
    ├── capacitor.config.ts           ← webDir=../leptos-app/dist
    ├── scripts/make-bundle.mjs       ← trunk-build, zip, write latest.json
    └── android/app/src/main/
        ├── AndroidManifest.xml       ← INTERNET, VIBRATE, cleartext
        ├── res/xml/network_security_config.xml   ← 192.168.0.2 whitelist
        └── java/com/example/otademo/MainActivity.java
                                       ← plain `extends BridgeActivity {}`
```

## Styling (typesafe CSS Modules via `stylance`)

* Component styles live next to the component in
  `src/styles/<name>.module.css`. Class selectors are referenced from
  Rust as `crate::styles::<name>::<name>::class_name` — typos are compile
  errors.
* `stylance-cli` runs as a Trunk **pre-build hook** (see `Trunk.toml`),
  merging every `*.module.css` into `dist/stylance.css` with hash-scoped
  class names, so both `trunk serve` and `trunk build` Just Work.
* Global resets / design tokens live in `assets/global.css` and are
  loaded via a plain `<link data-trunk rel="css">` — no scoping.
* Keep CSS class names **snake_case** so they map cleanly to Rust
  idents; stylance renames non-snake-case classes.

## Gotchas

* **Trunk's `public_url` is `./`** so all asset paths in `index.html` are
  relative — required because Capawesome's plugin serves the bundle from a
  local file path after activation.
* **`stylance-cli` must be on your PATH.** If `trunk build` fails with
  `command not found: stylance`, run `cargo install stylance-cli` and
  retry. Both `trunk build` and `trunk serve` invoke it via the pre-build
  hook.
* **You never need to re-install the APK** just to update Leptos code. You
  only re-install when you touch Java/Kotlin, native plugins, or
  permissions (installing the Capawesome plugin itself counts as a native
  change — run `npx cap sync android` and re-run the app once).
* **Bundle format is a plain zip** of the trunk `dist/` contents at its
  root (i.e. `index.html` is at the top level of the zip). Do not wrap it
  in a `dist/` subfolder — the plugin expects to unzip it directly onto
  the WebView root.
* **First launch after install** always runs the APK-bundled assets
  (labelled `bundled` in the status pill). Only after the first successful
  OTA does `Installed` switch to a `<hash>…` value.

## Future improvements (out of scope for this demo)

* **Rollback / retention** — the plugin supports `LiveUpdate.rollback()`
  and configurable bundle retention; wire those up for production.
* **Signature verification** — pass a `publicKey` to the plugin and sign
  bundles server-side so tampered zips are rejected.
* **iOS wrapper** — this project is Android-only; the plugin supports iOS
  with the same API.

## Reset an install

If the app gets stuck on a broken OTA:

```bash
adb shell pm clear com.example.otademo
```

That wipes the `Data` directory, so on next launch it falls back to the
bundled v1 assets.
