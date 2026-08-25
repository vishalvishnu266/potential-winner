//! Entry point. Installs a panic hook that logs Rust panics to the browser
//! console, then mounts the top-level `<App/>` component.

mod app;
mod components;
mod config;
mod ota;
mod platform;
mod styles;

use wasm_bindgen::JsValue;

fn main() {
    std::panic::set_hook(Box::new(|info| {
        web_sys::console::error_1(&JsValue::from_str(&format!("{info}")));
    }));
    leptos::mount_to_body(app::App);
}
