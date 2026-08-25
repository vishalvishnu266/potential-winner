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
//!   4. The plugin points the WebView at the new bundle after reload — no
//!      MainActivity swap needed.
//!
//! Module layout:
//!   * `capacitor`    — window() + generic plugin invocation
//!   * `http`         — GET (fetch_text) + typed POST (post_json)
//!   * `live_update`  — typed wrappers for the Capawesome LiveUpdate plugin
//!   * `haptics`      — vibrate() (unrelated to OTA, kept for demo)
//!   * `ui`           — the Leptos `app()` component and small helpers

mod capacitor;
mod haptics;
mod http;
mod live_update;
mod ui;

use leptos::mount_to_body;
use wasm_bindgen::prelude::*;

fn main() {
    std::panic::set_hook(Box::new(|info| {
        web_sys::console::error_1(&JsValue::from_str(&format!("{info}")));
    }));
    mount_to_body(ui::app);
}
