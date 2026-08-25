//! Compile-time configuration constants.
//!
//! Everything here is a `pub const` so it's usable from any module without
//! runtime cost. If you ever need per-environment config, promote these to
//! a small `Config` struct fetched at startup instead.

/// Base URL of the OTA server (the Axum service). Must be reachable from
/// the Capacitor WebView; matches the IP whitelisted in
/// `network_security_config.xml`.
pub const SERVER: &str = "http://192.168.0.2:8080";

/// Placeholder shown in the "Bundled" pill for the assets that shipped
/// inside the APK (i.e. before any OTA has been applied).
pub const BUNDLED_VERSION: &str = "bundled";

/// Truncate a hash-like string for display. Falls back to the original
/// string when it's already short.
pub fn short(s: &str) -> String {
    if s.len() > 10 {
        format!("{}…", &s[..10])
    } else {
        s.to_string()
    }
}
