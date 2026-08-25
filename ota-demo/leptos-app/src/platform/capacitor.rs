//! Capacitor plugin bridge — look up `window.Capacitor.Plugins.<name>` and
//! invoke async methods on it.

use wasm_bindgen::{JsCast, JsValue};
use wasm_bindgen_futures::JsFuture;

use crate::platform::window::window;

/// Return the plugin object if it exists on `window.Capacitor.Plugins`.
/// Returns `None` when running in a plain browser (no Capacitor injected).
pub fn plugin(name: &str) -> Option<js_sys::Object> {
    let cap = js_sys::Reflect::get(&window(), &"Capacitor".into()).ok()?;
    let plugins = js_sys::Reflect::get(&cap, &"Plugins".into()).ok()?;
    let plugin = js_sys::Reflect::get(&plugins, &name.into()).ok()?;
    plugin.dyn_into::<js_sys::Object>().ok()
}

/// Call `plugin.method(opts)` and await the returned Promise. Pass
/// `js_sys::Object::new()` for methods that take no options.
pub async fn call(
    plugin: &js_sys::Object,
    method: &str,
    opts: &js_sys::Object,
) -> Result<JsValue, JsValue> {
    let f = js_sys::Reflect::get(plugin, &method.into())?
        .dyn_into::<js_sys::Function>()?;
    let promise: js_sys::Promise = f.call1(plugin, opts)?.dyn_into()?;
    JsFuture::from(promise).await
}
