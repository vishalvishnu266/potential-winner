//! Thin wrappers around the `window.Capacitor.Plugins.*` bridge.
//!
//! Everything here is pure JS interop — no Leptos, no OTA logic. Higher-
//! level modules (`live_update`, `haptics`) build on top of these two
//! primitives.

use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::JsFuture;

/// Handle to the browser `window` object. Panics if called before the DOM
/// is available (which shouldn't happen from a Leptos component or
/// `spawn_local` block).
pub fn window() -> web_sys::Window {
    web_sys::window().expect("no window")
}

/// Look up `window.Capacitor.Plugins.<name>` and return the plugin object
/// if it's present. Returns `None` in a plain browser (where Capacitor is
/// obviously not injected), which lets callers gracefully degrade.
pub fn capacitor_plugin(name: &str) -> Option<js_sys::Object> {
    let cap = js_sys::Reflect::get(&window(), &"Capacitor".into()).ok()?;
    let plugins = js_sys::Reflect::get(&cap, &"Plugins".into()).ok()?;
    let plugin = js_sys::Reflect::get(&plugins, &name.into()).ok()?;
    plugin.dyn_into::<js_sys::Object>().ok()
}

/// Call `plugin.method(opts)` and await the returned promise. `opts` may
/// be an empty `Object::new()` when the method takes no arguments.
pub async fn call_plugin(
    plugin: &js_sys::Object,
    method: &str,
    opts: &js_sys::Object,
) -> Result<JsValue, JsValue> {
    let f = js_sys::Reflect::get(plugin, &method.into())?
        .dyn_into::<js_sys::Function>()?;
    let promise = f.call1(plugin, opts)?;
    let promise: js_sys::Promise = promise.dyn_into()?;
    JsFuture::from(promise).await
}
