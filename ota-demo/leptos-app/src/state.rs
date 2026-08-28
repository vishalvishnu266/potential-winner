//! Shared app-wide reactive state.
//!
//! [`AppState`] bundles the small handful of signals every page cares
//! about (status line + OTA version pills) into a single `Copy` struct
//! that is `provide_context`'d once at the top of the tree. Pages/
//! components pull it with [`AppState::expect`], which keeps their
//! signatures short (no prop drilling) while still making the dependency
//! explicit at the call site.
//!
//! All fields are `RwSignal` so both read and write handles live in the
//! same value — cheaper than juggling `(ReadSignal, WriteSignal)` pairs
//! through context and simpler at call sites.

use leptos::*;

/// App-wide reactive state, provided via context in `app::app()`.
#[derive(Copy, Clone)]
pub struct AppState {
    /// Human-readable status line (shown on Settings; also written to
    /// by the background OTA poller).
    pub status: RwSignal<String>,
    /// Version reported by the OTA server's `/latest` endpoint (raw hash).
    pub server_ver: RwSignal<String>,
    /// Currently-installed bundle id (short form) or `BUNDLED_VERSION`
    /// when the app is still running the APK-shipped assets.
    pub installed_ver: RwSignal<String>,
}

impl AppState {
    /// Construct a fresh state with sensible placeholder values.
    pub fn new() -> Self {
        Self {
            status: create_rw_signal(String::from("Idle.")),
            server_ver: create_rw_signal(String::from("?")),
            installed_ver: create_rw_signal(String::from("(checking…)")),
        }
    }

    /// Provide the state into Leptos context. Call once, at the top of
    /// the tree — before any `expect()`.
    pub fn provide(self) {
        provide_context(self);
    }

    /// Pull the state out of context. Panics if [`Self::provide`] wasn't
    /// called earlier — which would be a programmer error, not a runtime
    /// condition, so panicking is the right call.
    pub fn expect() -> Self {
        use_context::<AppState>().expect("AppState not provided; call AppState::new().provide() in app()")
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
