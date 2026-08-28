//! Thin wrappers around the JS / Capacitor bridge.
//!
//! Nothing in here knows about Leptos, OTA, or app-specific business
//! logic. Higher layers (`ota`, `pages`) build on top of these primitives.

pub mod capacitor;
pub mod haptics;
pub mod http;
pub mod live_update;
