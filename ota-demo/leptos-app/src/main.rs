//! Leptos CSR frontend for the OTA demo.
//!
//! ## Module layout
//!
//! ```text
//! src/
//! ├── main.rs           — panic hook + `mount_to_body(app::app)`
//! ├── app.rs            — top-level component: state, poller, Router
//! ├── state.rs          — `AppState` (context-provided reactive signals)
//! ├── util.rs           — SERVER, BUNDLED_VERSION, short()
//! ├── platform/         — JS / Capacitor plumbing (Leptos-free)
//! │   ├── capacitor.rs
//! │   ├── http.rs
//! │   ├── haptics.rs
//! │   └── live_update.rs
//! ├── ota/              — OTA subsystem (Leptos-free)
//! │   ├── engine.rs     — check → download → activate → reload
//! │   ├── events.rs     — OtaEvent + status line
//! │   └── poller.rs     — 15s background check
//! ├── router/           — centralized routing
//! │   ├── mod.rs        — path constants + <Routes>
//! │   └── shell.rs      — header + body + bottom nav layout
//! ├── ui/               — reusable UI building blocks
//! │   ├── header.rs
//! │   ├── bottom_nav.rs — Home / Vibrate / Settings
//! │   └── version_pill.rs
//! └── pages/            — routed views (read AppState from context)
//!     ├── home.rs
//!     └── settings.rs
//! ```
//!
//! ## OTA flow (Capawesome Live Update)
//!
//! 1. `GET /latest` → `{ version, url, artifactType }`.
//! 2. Compare against `LiveUpdate.getBundle()`.
//! 3. If different: `downloadBundle` → `setNextBundle` → `reload`.
//! 4. New bundle boots → `app::app` calls `LiveUpdate.ready()` to
//!    disarm the plugin's automatic rollback safety net.

mod app;
mod ota;
mod pages;
mod platform;
mod router;
mod state;
mod ui;
mod util;

use leptos::mount_to_body;
use wasm_bindgen::prelude::*;

fn main() {
    std::panic::set_hook(Box::new(|info| {
        web_sys::console::error_1(&JsValue::from_str(&format!("{info}")));
    }));
    mount_to_body(app::app);
}
