//! Small cross-module helpers and constants.
//!
//! Kept intentionally tiny — anything that would grow real logic should
//! move into its own module (e.g. `live_update`, `http`).

/// Base URL of the OTA server. Adjust for your LAN or point at localhost
/// when testing in a browser.
pub const SERVER: &str = "http://192.168.0.2:8080";

/// Placeholder shown in the "Installed" pill before the first OTA is
/// applied (i.e. while the WebView is still serving APK-bundled assets).
pub const BUNDLED_VERSION: &str = "bundled";

/// Trim a hash-looking string to a short display form ("abcdef1234…").
pub fn short(s: &str) -> String {
    if s.len() > 10 {
        format!("{}…", &s[..10])
    } else {
        s.to_string()
    }
}
