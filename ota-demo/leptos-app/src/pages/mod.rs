//! Routed page views.
//!
//! Each page pulls shared state from context via `AppState::expect()` —
//! no props are threaded through from the shell/router.

pub mod home;
pub mod settings;
