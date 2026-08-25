//! Vibration helper — unrelated to OTA, kept as a "does native stuff work?"
//! smoke test. Prefers Capacitor's `Haptics` plugin, falls back to the
//! plain-browser `navigator.vibrate` API when running outside Capacitor.

use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;

use crate::capacitor::{call_plugin, capacitor_plugin, window};

const DURATION_MS: f64 = 300.0;

/// Vibrate the device for [`DURATION_MS`] milliseconds. Silently succeeds
/// on platforms with no vibrate API at all (e.g. desktop Chrome).
pub async fn vibrate() -> Result<(), JsValue> {
    if let Some(haptics) = capacitor_plugin("Haptics") {
        let opts = js_sys::Object::new();
        js_sys::Reflect::set(&opts, &"duration".into(), &JsValue::from_f64(DURATION_MS))?;
        call_plugin(&haptics, "vibrate", &opts).await?;
        return Ok(());
    }
    let nav = window().navigator();
    let vibrate_fn = js_sys::Reflect::get(&nav, &"vibrate".into())?;
    if let Ok(f) = vibrate_fn.dyn_into::<js_sys::Function>() {
        f.call1(&nav, &JsValue::from_f64(DURATION_MS))?;
    }
    Ok(())
}
