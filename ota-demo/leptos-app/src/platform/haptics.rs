//! Vibrate helper — prefers the Capacitor Haptics plugin, falls back to
//! `navigator.vibrate` when running in a plain browser.

use wasm_bindgen::{JsCast, JsValue};

use crate::platform::{capacitor, window::window};

const DURATION_MS: f64 = 300.0;

pub async fn vibrate() -> Result<(), JsValue> {
    if let Some(haptics) = capacitor::plugin("Haptics") {
        let opts = js_sys::Object::new();
        js_sys::Reflect::set(&opts, &"duration".into(), &JsValue::from_f64(DURATION_MS))?;
        capacitor::call(&haptics, "vibrate", &opts).await?;
        return Ok(());
    }

    // Browser fallback via navigator.vibrate — grabbed reflectively so we
    // don't need the extra web-sys feature just for a demo button.
    let nav = window().navigator();
    let vibrate_fn = js_sys::Reflect::get(&nav, &"vibrate".into())?;
    if let Ok(f) = vibrate_fn.dyn_into::<js_sys::Function>() {
        f.call1(&nav, &JsValue::from_f64(DURATION_MS))?;
    }
    Ok(())
}
