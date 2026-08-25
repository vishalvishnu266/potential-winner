//! Typed wrappers around the Capawesome `LiveUpdate` Capacitor plugin.
//!
//! These are 1:1 with the plugin's JS API — one Rust `async fn` per
//! plugin method — so the UI layer can call them without touching
//! `js_sys::Reflect` directly.

use wasm_bindgen::prelude::*;

use crate::capacitor::call_plugin;

/// Pull the currently-active bundle id from the plugin. Returns the
/// plugin's reported `bundleId` (or `""` if the app is still running the
/// APK-bundled assets).
pub async fn current_bundle_id(live: &js_sys::Object) -> Result<String, JsValue> {
    let res = call_plugin(live, "getBundle", &js_sys::Object::new()).await?;
    let id = js_sys::Reflect::get(&res, &"bundleId".into())
        .ok()
        .and_then(|v| v.as_string())
        .unwrap_or_default();
    Ok(id)
}

/// Download and unpack a bundle zip. `bundle_id` is what the plugin will
/// remember it as; `url` must point at the raw zip served by the OTA
/// server.
pub async fn download_bundle(
    live: &js_sys::Object,
    bundle_id: &str,
    url: &str,
) -> Result<(), JsValue> {
    let opts = js_sys::Object::new();
    js_sys::Reflect::set(&opts, &"bundleId".into(), &bundle_id.into())?;
    js_sys::Reflect::set(&opts, &"url".into(), &url.into())?;
    js_sys::Reflect::set(&opts, &"artifactType".into(), &"zip".into())?;
    call_plugin(live, "downloadBundle", &opts).await?;
    Ok(())
}

/// Mark `bundle_id` as the bundle to activate on next launch/reload.
pub async fn set_next_bundle(live: &js_sys::Object, bundle_id: &str) -> Result<(), JsValue> {
    let opts = js_sys::Object::new();
    js_sys::Reflect::set(&opts, &"bundleId".into(), &bundle_id.into())?;
    call_plugin(live, "setNextBundle", &opts).await?;
    Ok(())
}

/// Restart the WebView immediately into the currently-active bundle.
/// Falls back is left to the caller (typically `window.location.reload()`).
pub async fn reload_app(live: &js_sys::Object) -> Result<(), JsValue> {
    // `reload` takes no options.
    let _ = call_plugin(live, "reload", &js_sys::Object::new()).await?;
    Ok(())
}
