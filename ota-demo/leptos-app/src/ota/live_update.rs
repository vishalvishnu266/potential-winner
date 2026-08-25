//! Thin wrappers around the `@capawesome/capacitor-live-update` plugin
//! methods we actually use.

use wasm_bindgen::JsValue;

use crate::platform::capacitor::call;

/// The currently-active bundle id, or `""` if the app is still running
/// the APK-bundled assets.
pub async fn current_bundle_id(live: &js_sys::Object) -> Result<String, JsValue> {
    let res = call(live, "getBundle", &js_sys::Object::new()).await?;
    let id = js_sys::Reflect::get(&res, &"bundleId".into())
        .ok()
        .and_then(|v| v.as_string())
        .unwrap_or_default();
    Ok(id)
}

pub async fn download_bundle(
    live: &js_sys::Object,
    bundle_id: &str,
    url: &str,
) -> Result<(), JsValue> {
    let opts = js_sys::Object::new();
    js_sys::Reflect::set(&opts, &"bundleId".into(), &bundle_id.into())?;
    js_sys::Reflect::set(&opts, &"url".into(), &url.into())?;
    js_sys::Reflect::set(&opts, &"artifactType".into(), &"zip".into())?;
    call(live, "downloadBundle", &opts).await?;
    Ok(())
}

pub async fn set_next_bundle(live: &js_sys::Object, bundle_id: &str) -> Result<(), JsValue> {
    let opts = js_sys::Object::new();
    js_sys::Reflect::set(&opts, &"bundleId".into(), &bundle_id.into())?;
    call(live, "setNextBundle", &opts).await?;
    Ok(())
}

pub async fn reload(live: &js_sys::Object) -> Result<(), JsValue> {
    call(live, "reload", &js_sys::Object::new()).await?;
    Ok(())
}
