//! Convenience accessor for the current `window` object.

pub fn window() -> web_sys::Window {
    web_sys::window().expect("no `window` in this environment")
}
