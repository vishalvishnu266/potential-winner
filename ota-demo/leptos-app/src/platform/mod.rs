//! Thin wrappers around browser + Capacitor JS APIs.
//!
//! Kept in one module so the rest of the app never touches `js_sys` or
//! `web_sys` directly — makes it obvious where the wasm/JS boundary is.

pub mod capacitor;
pub mod fetch;
pub mod haptics;
pub mod window;
