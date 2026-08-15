//! Permissive CORS layer.
//!
//! Dev + LAN-served native builds hit the API from arbitrary origins
//! (Capacitor's `capacitor://localhost`, browser `http://localhost:5173`,
//! phone `http://192.168.x.y:3000`).  We allow everything for now.
//! Tighten before shipping a public web build.

use tower_http::cors::{Any, CorsLayer};

pub fn layer() -> CorsLayer {
    CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any)
}
