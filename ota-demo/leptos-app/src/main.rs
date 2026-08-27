//! Leptos CSR frontend for the OTA demo — builder syntax only, no `view!`.
//!
//! OTA flow (Capawesome Live Update):
//!   1. GET  http://192.168.0.2:8080/latest
//!      -> { "version": "<hash>", "url": "…/bundles/<hash>.zip", "artifactType": "zip" }
//!   2. Ask LiveUpdate for the currently-active bundle id.
//!   3. If the server version differs:
//!         LiveUpdate.downloadBundle({ bundleId, url })   ← fetches zip, unpacks
//!         LiveUpdate.setNextBundle({ bundleId })         ← activate on reload
//!         LiveUpdate.reload()                            ← restart WebView now
//!   4. The plugin points the WebView at the new bundle after reload.
//!   5. After the new bundle boots, `ui::app` calls `LiveUpdate.ready()`
//!      to confirm the boot and disarm the plugin's automatic rollback.
//!
//! Module layout:
//!   * `capacitor`    — window() + generic plugin invocation
//!   * `http`         — GET (fetch_text) + typed POST (post_json)
//!   * `live_update`  — typed wrappers for the Capawesome LiveUpdate plugin
//!   * `haptics`      — vibrate() (unrelated to OTA, kept for demo)
//!   * `ota`          — pure OTA state machine (`check_and_apply`, `do_rollback`)
//!   * `util`         — shared constants + small helpers (`short`, SERVER)
//!   * `components/`  — reusable UI pieces (header, bottom nav, pills)
//!   * `pages/`       — routed views (home, settings) + route path constants
//!   * `ui`           — top-level Router + shell that stitches it all together

mod capacitor;
mod components;
mod haptics;
mod http;
mod live_update;
mod ota;
mod pages;
mod ui;
mod util;

use leptos::mount_to_body;
use wasm_bindgen::prelude::*;

fn main() {
    std::panic::set_hook(Box::new(|info| {
        web_sys::console::error_1(&JsValue::from_str(&format!("{info}")));
    }));
    mount_to_body(ui::app);
}
