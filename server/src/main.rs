use axum::{
    extract::Query,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::{env, fs, net::SocketAddr, path::PathBuf};
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::ServeDir;

// The folder where `npm run bundle:ota` drops zipped Vue builds
const BUNDLES_DIR: &str = "../bundles";
// Default public base URL used by clients to download bundles.
// Override at runtime with:
//     OTA_HOST=192.168.0.4 cargo run
// Physical phones on the same Wi-Fi should use your Mac's LAN IP.
// The Android emulator uses the special alias 10.0.2.2.
const DEFAULT_HOST: &str = "192.168.0.4";
const DEFAULT_PORT: u16 = 3000;

#[derive(Deserialize)]
struct UpdateQuery {
    version: Option<String>,
}

#[derive(Serialize)]
struct UpdateResponse {
    update_available: bool,
    version: String,
    url: Option<String>,
}

#[derive(Deserialize, Serialize, Default)]
struct LatestManifest {
    latest: String,
    file: String,
    #[serde(default)]
    created_at: String,
}

/// Resolve the base URL announced in check-update responses.
fn public_base_url() -> String {
    let host = env::var("OTA_HOST").unwrap_or_else(|_| DEFAULT_HOST.to_string());
    let port: u16 = env::var("OTA_PORT")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(DEFAULT_PORT);
    format!("http://{}:{}", host, port)
}

/// Look up the newest bundle available on disk.
/// Prefers `bundles/latest.json` (written by scripts/build-bundle.mjs) and
/// falls back to picking the most recently modified `v*.zip` file.
fn find_latest_bundle() -> Option<(String, String)> {
    let dir = PathBuf::from(BUNDLES_DIR);

    let manifest_path = dir.join("latest.json");
    if let Ok(bytes) = fs::read(&manifest_path) {
        if let Ok(m) = serde_json::from_slice::<LatestManifest>(&bytes) {
            if !m.latest.is_empty() && !m.file.is_empty() {
                return Some((m.latest, m.file));
            }
        }
    }

    let entries = fs::read_dir(&dir).ok()?;
    let mut newest: Option<(std::time::SystemTime, String)> = None;
    for entry in entries.flatten() {
        let path = entry.path();
        let name = path.file_name()?.to_string_lossy().to_string();
        if !name.starts_with('v') || !name.ends_with(".zip") { continue; }
        let modified = entry.metadata().and_then(|m| m.modified()).ok()?;
        if newest.as_ref().map_or(true, |(t, _)| modified > *t) {
            newest = Some((modified, name));
        }
    }
    newest.map(|(_, file)| {
        let version = file.trim_start_matches('v').trim_end_matches(".zip").to_string();
        (version, file)
    })
}

async fn check_update(Query(params): Query<UpdateQuery>) -> impl IntoResponse {
    let client_version = params.version.unwrap_or_else(|| "0.0.0".to_string());

    let Some((latest_version, latest_file)) = find_latest_bundle() else {
        println!("[Server] No bundles found in {}", BUNDLES_DIR);
        return Json(UpdateResponse {
            update_available: false,
            version: client_version,
            url: None,
        });
    };

    let update_available = client_version != latest_version;
    let base = public_base_url();
    println!(
        "[Server] Check: client=v{} latest=v{} -> update_available={} (base={})",
        client_version, latest_version, update_available, base
    );

    Json(UpdateResponse {
        update_available,
        version: latest_version.clone(),
        url: if update_available {
            Some(format!("{}/bundles/{}", base, latest_file))
        } else {
            None
        },
    })
}

#[derive(Deserialize, Debug)]
struct GpsPing {
    latitude: f64,
    longitude: f64,
    #[serde(default)]
    accuracy: Option<f64>,
    #[serde(default)]
    altitude: Option<f64>,
    #[serde(default)]
    speed: Option<f64>,
    #[serde(default)]
    heading: Option<f64>,
    /// Client-side timestamp (ms since epoch) at which the fix was taken.
    #[serde(default)]
    timestamp: Option<i64>,
    /// Optional client identifier so the log is readable when several
    /// devices are streaming to the same server.
    #[serde(default)]
    client_id: Option<String>,
}

async fn ingest_gps(Json(ping): Json<GpsPing>) -> impl IntoResponse {
    let client = ping.client_id.as_deref().unwrap_or("device");
    let acc = ping
        .accuracy
        .map(|v| format!("{:.1}m", v))
        .unwrap_or_else(|| "?".to_string());
    let alt = ping
        .altitude
        .map(|v| format!(" alt={:.1}m", v))
        .unwrap_or_default();
    let spd = ping
        .speed
        .map(|v| format!(" spd={:.2}m/s", v))
        .unwrap_or_default();
    let hdg = ping
        .heading
        .map(|v| format!(" hdg={:.0}°", v))
        .unwrap_or_default();
    let ts = ping
        .timestamp
        .map(|v| format!(" @ {}", v))
        .unwrap_or_default();

    println!(
        "[GPS] {} lat={:.6} lon={:.6} acc={}{}{}{}{}",
        client, ping.latitude, ping.longitude, acc, alt, spd, hdg, ts
    );

    Json(serde_json::json!({ "ok": true }))
}

async fn health() -> impl IntoResponse {
    match find_latest_bundle() {
        Some((v, f)) => Json(serde_json::json!({
            "ok": true,
            "latest": v,
            "file": f,
            "base_url": public_base_url()
        })),
        None => Json(serde_json::json!({
            "ok": true,
            "latest": null,
            "base_url": public_base_url()
        })),
    }
}

#[tokio::main]
async fn main() {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/check-update", get(check_update))
        .route("/api/gps", post(ingest_gps))
        .route("/health", get(health))
        .nest_service("/bundles", ServeDir::new(BUNDLES_DIR))
        .layer(cors);

    // Bind on 0.0.0.0 so devices on the LAN can reach the server
    let addr = SocketAddr::from(([0, 0, 0, 0], DEFAULT_PORT));
    println!("🚀 Axum OTA Server listening on http://0.0.0.0:{}", DEFAULT_PORT);
    println!("   Announcing bundle URLs as: {}", public_base_url());
    println!("   Bundles served from:       {}", BUNDLES_DIR);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
