//! Tiny OTA server.
//!
//! Endpoints:
//!   GET /version                 -> {"version":"<n>"}
//!   GET /bundle/<n>/index.html   -> the HTML payload for that version
//!
//! Bundles live on disk under ./bundles/<n>/index.html, and the "current"
//! version is whatever is written in ./bundles/version.txt.

use std::{net::SocketAddr, path::PathBuf};

use axum::{
    extract::Path,
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::get,
    Router,
};
use serde::Serialize;
use tower_http::cors::{Any, CorsLayer};

#[derive(Serialize)]
struct VersionResp {
    version: String,
}

async fn version() -> impl IntoResponse {
    let v = tokio::fs::read_to_string("bundles/version.txt")
        .await
        .unwrap_or_else(|_| "1".to_string())
        .trim()
        .to_string();
    Json(VersionResp { version: v })
}

async fn bundle(Path((ver, file)): Path<(String, String)>) -> impl IntoResponse {
    // Only allow simple filenames — no path traversal.
    if file.contains('/') || file.contains("..") {
        return (StatusCode::BAD_REQUEST, "bad file").into_response();
    }
    let path: PathBuf = PathBuf::from("bundles").join(&ver).join(&file);
    match tokio::fs::read(&path).await {
        Ok(bytes) => {
            let ct = if file.ends_with(".html") {
                "text/html; charset=utf-8"
            } else if file.ends_with(".js") {
                "application/javascript"
            } else if file.ends_with(".wasm") {
                "application/wasm"
            } else {
                "application/octet-stream"
            };
            ([(axum::http::header::CONTENT_TYPE, ct)], bytes).into_response()
        }
        Err(_) => (StatusCode::NOT_FOUND, "no such bundle").into_response(),
    }
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt().with_target(false).init();

    // Permissive CORS — this is a demo on the local network.
    let cors = CorsLayer::new().allow_origin(Any).allow_methods(Any);

    let app = Router::new()
        .route("/version", get(version))
        .route("/bundle/:ver/:file", get(bundle))
        .layer(cors);

    // Bind on all interfaces so it's reachable at 192.168.0.2 from the phone.
    let addr: SocketAddr = "0.0.0.0:8080".parse().unwrap();
    tracing::info!("OTA server listening on http://{addr}  (expected LAN IP: 192.168.0.2)");
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
