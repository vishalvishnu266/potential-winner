//! Runtime configuration — the single place magic values live.
//!
//! Everything reads env vars with sensible localhost defaults so a
//! fresh clone runs without any setup.  Override on a real host with:
//!
//!     PORT=3000 PUBLIC_HOST=example.com cargo run

/// Directory (relative to `server/`) where per-app OTA bundles live.
/// `bundles/<app>/latest.json` + `bundles/<app>/vX.zip`.
pub const BUNDLES_DIR: &str = "../bundles";

/// App used when the client doesn't specify `?app=...`.  Kept for
/// backwards compatibility with the original single-app setup.
pub const DEFAULT_APP: &str = "customer";

/// HTTP port the server binds to.  Overridden via `PORT` env var.
pub const DEFAULT_PORT: u16 = 3000;

/// Request-id header the middleware reads and propagates.
pub const REQUEST_ID_HEADER: &str = "x-request-id";

/// Hostname advertised in OTA bundle URLs.  For LAN-served dev builds
/// on a phone, set `PUBLIC_HOST=192.168.x.y` so Capacitor apps can
/// reach the machine.
pub fn public_host() -> String {
    std::env::var("PUBLIC_HOST").unwrap_or_else(|_| "localhost".to_string())
}

/// Port the process actually binds to (env-override aware).
pub fn port() -> u16 {
    std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse::<u16>().ok())
        .unwrap_or(DEFAULT_PORT)
}

/// Fully-qualified base URL the world sees us at, e.g.
/// `http://localhost:3000` or `http://192.168.0.4:3000`.
pub fn public_base_url() -> String {
    format!("http://{}:{}", public_host(), port())
}
