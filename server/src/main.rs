//! DailyGig backend — a tiny axum + sqlx + SQLite server.
//!
//! Design:
//! - **In-memory** for anything ephemeral (worker presence, active jobs).
//! - **SQLite** for anything that needs to persist across restarts
//!   (users, KYC tier, completions/reputation, sponsors).
//! - **REST-only** endpoints; clients short-poll when they need fresh data.
//! - No external services, no message brokers, no cloud SDKs.

mod db;
mod geo;
mod jobs;
mod presence;

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::{net::SocketAddr, sync::Arc, time::Duration};
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::ServeDir;
use uuid::Uuid;

use crate::db::Db;
use crate::jobs::{Job, JobStore, JOB_TTL_MS};
use crate::presence::{now_ms, Presence, PresenceStore};

// ---------------------------------------------------------------------------
// OTA (kept from previous scaffold) ------------------------------------------
// ---------------------------------------------------------------------------

const BUNDLES_DIR: &str = "../bundles";
const DEFAULT_HOST: &str = "192.168.0.4";
const DEFAULT_PORT: u16 = 3000;

#[derive(Deserialize)]
struct UpdateQuery {
    current: Option<String>,
    channel: Option<String>,
}
#[derive(Serialize)]
struct UpdateResponse {
    available: bool,
    version: Option<String>,
    url: Option<String>,
}
#[derive(Deserialize)]
struct LatestManifest {
    version: String,
    file: String,
}

fn public_base_url() -> String {
    let host = std::env::var("PUBLIC_HOST").unwrap_or_else(|_| DEFAULT_HOST.to_string());
    let port = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse::<u16>().ok())
        .unwrap_or(DEFAULT_PORT);
    format!("http://{}:{}", host, port)
}

fn find_latest_bundle() -> Option<(String, String)> {
    let manifest_path = std::path::Path::new(BUNDLES_DIR).join("latest.json");
    if let Ok(txt) = std::fs::read_to_string(&manifest_path) {
        if let Ok(m) = serde_json::from_str::<LatestManifest>(&txt) {
            return Some((m.version, m.file));
        }
    }
    None
}

async fn check_update(Query(params): Query<UpdateQuery>) -> impl IntoResponse {
    let _ = params.channel;
    match find_latest_bundle() {
        Some((version, file)) => {
            let available = params.current.as_deref() != Some(&version);
            Json(UpdateResponse {
                available,
                version: Some(version.clone()),
                url: Some(format!("{}/bundles/{}", public_base_url(), file)),
            })
        }
        None => Json(UpdateResponse {
            available: false,
            version: None,
            url: None,
        }),
    }
}

// ---------------------------------------------------------------------------
// Application state ---------------------------------------------------------
// ---------------------------------------------------------------------------

#[derive(Clone)]
struct AppState {
    db: Db,
    presence: Arc<PresenceStore>,
    jobs: Arc<JobStore>,
}

// ---------------------------------------------------------------------------
// Health --------------------------------------------------------------------
// ---------------------------------------------------------------------------

async fn health(State(s): State<AppState>) -> impl IntoResponse {
    let live_workers = s.presence.snapshot(None).len();
    let live_jobs = s.jobs.snapshot().len();
    Json(serde_json::json!({
        "ok": true,
        "live_workers": live_workers,
        "live_jobs": live_jobs,
    }))
}

// ---------------------------------------------------------------------------
// Auth (dev-mode OTP: always "0000") ----------------------------------------
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
struct OtpSendReq { phone: String }
#[derive(Deserialize)]
struct OtpVerifyReq {
    phone: String,
    otp: String,
    #[serde(default)]
    name: Option<String>,
}
#[derive(Serialize)]
struct AuthResp { user_id: String, name: String }

async fn otp_send(Json(req): Json<OtpSendReq>) -> impl IntoResponse {
    // Dev mode: print the OTP to the console; production would call an SMS API.
    tracing::info!("[OTP] {} → 0000 (dev-mode)", req.phone);
    Json(serde_json::json!({ "ok": true, "hint": "0000" }))
}

async fn otp_verify(
    State(s): State<AppState>,
    Json(req): Json<OtpVerifyReq>,
) -> Result<Json<AuthResp>, (StatusCode, String)> {
    if req.otp != "0000" {
        return Err((StatusCode::UNAUTHORIZED, "bad otp".into()));
    }
    // Upsert user by phone.
    let existing: Option<(String, String)> =
        sqlx::query_as("SELECT id, name FROM users WHERE phone = ?")
            .bind(&req.phone)
            .fetch_optional(&s.db)
            .await
            .map_err(db_err)?;

    let (user_id, name) = if let Some((id, name)) = existing {
        (id, name)
    } else {
        let id = Uuid::new_v4().to_string();
        let name = req.name.clone().unwrap_or_default();
        sqlx::query("INSERT INTO users (id, phone, name, created_at) VALUES (?, ?, ?, ?)")
            .bind(&id)
            .bind(&req.phone)
            .bind(&name)
            .bind(now_ms())
            .execute(&s.db)
            .await
            .map_err(db_err)?;
        (id, name)
    };
    Ok(Json(AuthResp { user_id, name }))
}

// ---------------------------------------------------------------------------
// Presence (heartbeat) ------------------------------------------------------
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
struct HeartbeatReq {
    user_id: String,
    name: Option<String>,
    lat: f64,
    lon: f64,
    categories: Vec<String>,
}

async fn heartbeat(
    State(s): State<AppState>,
    Json(req): Json<HeartbeatReq>,
) -> impl IntoResponse {
    s.presence.upsert(Presence {
        user_id: req.user_id,
        name: req.name.unwrap_or_default(),
        lat: req.lat,
        lon: req.lon,
        categories: req.categories,
        updated_at: now_ms(),
    });
    Json(serde_json::json!({ "ok": true, "ttl_ms": presence::TTL_MS }))
}

async fn heartbeat_stop(
    State(s): State<AppState>,
    Json(req): Json<serde_json::Value>,
) -> impl IntoResponse {
    if let Some(uid) = req.get("user_id").and_then(|v| v.as_str()) {
        s.presence.remove(uid);
    }
    Json(serde_json::json!({ "ok": true }))
}

// ---------------------------------------------------------------------------
// Jobs (post / list / accept / done / rate) ---------------------------------
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
struct PostJobReq {
    requester_id: String,
    category: String,
    description: String,
    lat: f64,
    lon: f64,
    #[serde(default)]
    budget: Option<i64>,
    #[serde(default)]
    bids_open: bool,
}

async fn post_job(
    State(s): State<AppState>,
    Json(req): Json<PostJobReq>,
) -> impl IntoResponse {
    let id = Uuid::new_v4().to_string();
    let now = now_ms();
    let job = Job {
        id: id.clone(),
        requester_id: req.requester_id,
        category: req.category,
        description: req.description,
        lat: req.lat,
        lon: req.lon,
        budget: req.budget,
        bids_open: req.bids_open,
        created_at: now,
        expires_at: now + JOB_TTL_MS,
        accepted_by: None,
        requester_done: false,
        doer_done: false,
        requester_paid: false,
        doer_received: false,
        payment_method: "unpaid".into(),
    };
    s.jobs.insert(job.clone());
    Json(job)
}

#[derive(Deserialize)]
struct NearbyQuery {
    lat: f64,
    lon: f64,
    #[serde(default = "default_radius")]
    radius_km: f64,
    #[serde(default)]
    category: Option<String>,
}
fn default_radius() -> f64 { 5.0 }

#[derive(Serialize)]
struct NearbyResp {
    jobs: Vec<NearbyItem>,
    workers: Vec<NearbyWorker>,
    sponsors: Vec<SponsorItem>,
}
#[derive(Serialize)]
struct NearbyItem {
    #[serde(flatten)]
    job: Job,
    distance_km: f64,
}
#[derive(Serialize)]
struct NearbyWorker {
    #[serde(flatten)]
    presence: Presence,
    distance_km: f64,
}
#[derive(Serialize)]
struct SponsorItem {
    id: i64, name: String, category: String,
    phone: Option<String>, photo_url: Option<String>,
    lat: f64, lon: f64, distance_km: f64,
}

async fn nearby(
    State(s): State<AppState>,
    Query(q): Query<NearbyQuery>,
) -> impl IntoResponse {
    // 1. Jobs within radius (and optional category)
    let jobs = s
        .jobs
        .snapshot()
        .into_iter()
        .filter(|j| match &q.category {
            Some(c) => &j.category == c,
            None => true,
        })
        .filter_map(|j| {
            let d = geo::distance_km(q.lat, q.lon, j.lat, j.lon);
            if d <= q.radius_km {
                Some(NearbyItem { job: j, distance_km: d })
            } else { None }
        })
        .collect::<Vec<_>>();

    // 2. Online workers within radius
    let workers = s
        .presence
        .snapshot(q.category.as_deref())
        .into_iter()
        .filter_map(|p| {
            let d = geo::distance_km(q.lat, q.lon, p.lat, p.lon);
            if d <= q.radius_km {
                Some(NearbyWorker { presence: p, distance_km: d })
            } else { None }
        })
        .collect::<Vec<_>>();

    // 3. Sponsored listings for the category
    let now = now_ms();
    let sponsor_rows: Vec<(i64, String, String, Option<String>, Option<String>, f64, f64, f64)> =
        sqlx::query_as(
            r#"SELECT id, name, category, phone, photo_url, lat, lon, radius_km
               FROM sponsors
               WHERE active_until > ?
                 AND (?1 IS NULL OR category = ?2)"#,
        )
        .bind(now)
        .bind(&q.category)
        .bind(&q.category)
        .fetch_all(&s.db)
        .await
        .unwrap_or_default();

    let sponsors = sponsor_rows
        .into_iter()
        .filter_map(|(id, name, category, phone, photo_url, lat, lon, r_km)| {
            let d = geo::distance_km(q.lat, q.lon, lat, lon);
            if d <= r_km {
                Some(SponsorItem {
                    id, name, category, phone, photo_url,
                    lat, lon, distance_km: d,
                })
            } else { None }
        })
        .collect::<Vec<_>>();

    Json(NearbyResp { jobs, workers, sponsors })
}

async fn get_job(
    State(s): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Job>, (StatusCode, String)> {
    s.jobs
        .get(&id)
        .map(Json)
        .ok_or((StatusCode::NOT_FOUND, "job not found".into()))
}

#[derive(Deserialize)]
struct AcceptReq { doer_id: String }
async fn accept_job(
    State(s): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<AcceptReq>,
) -> Result<Json<Job>, (StatusCode, String)> {
    let updated = s.jobs.update(&id, |j| {
        if j.accepted_by.is_none() {
            j.accepted_by = Some(req.doer_id.clone());
        }
    });
    updated
        .map(Json)
        .ok_or((StatusCode::NOT_FOUND, "job not found".into()))
}

#[derive(Deserialize)]
struct DoneReq {
    role: String,            // 'requester' | 'doer'
    #[serde(default)]
    paid: bool,
    #[serde(default)]
    received: bool,
    #[serde(default)]
    payment_method: Option<String>,
}
async fn mark_done(
    State(s): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<DoneReq>,
) -> Result<Json<Job>, (StatusCode, String)> {
    let updated = s.jobs.update(&id, |j| {
        match req.role.as_str() {
            "requester" => {
                j.requester_done = true;
                j.requester_paid = j.requester_paid || req.paid;
            }
            "doer" => {
                j.doer_done = true;
                j.doer_received = j.doer_received || req.received;
            }
            _ => {}
        }
        if let Some(m) = req.payment_method.as_deref() {
            j.payment_method = m.to_string();
        }
    });
    let job = updated.ok_or((StatusCode::NOT_FOUND, "job not found".into()))?;

    // If both parties have completed AND payment is settled, persist a
    // completion row and drop the job from memory.
    if job.is_fully_done() && job.accepted_by.is_some() {
        let doer_id = job.accepted_by.clone().unwrap_or_default();
        let _ = sqlx::query(
            "INSERT INTO completions
             (job_id, requester_id, doer_id, category, completed_at, payment_method, payment_disputed)
             VALUES (?, ?, ?, ?, ?, ?, 0)"
        )
        .bind(&job.id)
        .bind(&job.requester_id)
        .bind(&doer_id)
        .bind(&job.category)
        .bind(now_ms())
        .bind(&job.payment_method)
        .execute(&s.db)
        .await;
        // keep the in-memory job for 5 minutes so both sides can still rate
        // — the sweeper will drop it after JOB_TTL_MS anyway.
    }

    Ok(Json(job))
}

#[derive(Deserialize)]
struct RateReq {
    role: String,   // 'requester' rates doer, 'doer' rates requester
    rating: i32,    // 1..=3 (sad/meh/happy)
}
async fn rate_job(
    State(s): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<RateReq>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    if !(1..=3).contains(&req.rating) {
        return Err((StatusCode::BAD_REQUEST, "rating must be 1..3".into()));
    }
    let job = s
        .jobs
        .get(&id)
        .ok_or((StatusCode::NOT_FOUND, "job not found".into()))?;

    // Ratings are only allowed once the handshake is complete.
    if !job.is_fully_done() {
        return Err((StatusCode::CONFLICT, "job not fully done".into()));
    }
    let col = match req.role.as_str() {
        "requester" => "doer_rating",       // requester rates the doer
        "doer" => "requester_rating",       // doer rates the requester
        _ => return Err((StatusCode::BAD_REQUEST, "bad role".into())),
    };
    let sql = format!(
        "UPDATE completions SET {} = ? WHERE job_id = ?", col
    );
    sqlx::query(&sql)
        .bind(req.rating)
        .bind(&job.id)
        .execute(&s.db)
        .await
        .map_err(db_err)?;

    Ok(Json(serde_json::json!({ "ok": true })))
}

#[derive(Serialize)]
struct Reputation {
    user_id: String,
    completed: i64,
    avg_rating: Option<f64>, // 1..3
}
async fn reputation(
    State(s): State<AppState>,
    Path(user_id): Path<String>,
) -> impl IntoResponse {
    let row: Option<(i64, Option<f64>)> = sqlx::query_as(
        "SELECT COUNT(*),
                AVG(CASE WHEN doer_id = ?1 THEN requester_rating
                         WHEN requester_id = ?1 THEN doer_rating END)
         FROM completions
         WHERE doer_id = ?1 OR requester_id = ?1"
    )
    .bind(&user_id)
    .fetch_optional(&s.db)
    .await
    .unwrap_or_default();

    let (completed, avg) = row.unwrap_or((0, None));
    Json(Reputation { user_id, completed, avg_rating: avg })
}

// ---------------------------------------------------------------------------
// Helpers -------------------------------------------------------------------
// ---------------------------------------------------------------------------

fn db_err(e: sqlx::Error) -> (StatusCode, String) {
    (StatusCode::INTERNAL_SERVER_ERROR, format!("db: {e}"))
}

// ---------------------------------------------------------------------------
// Bootstrap -----------------------------------------------------------------
// ---------------------------------------------------------------------------

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,sqlx=warn,tower_http=warn".into()),
        )
        .init();

    let db_path = std::env::var("DB_PATH").unwrap_or_else(|_| "data/app.sqlite".into());
    let db = db::open(&db_path).await?;
    tracing::info!("sqlite ready at {}", db_path);

    let state = AppState {
        db,
        presence: Arc::new(PresenceStore::new()),
        jobs: Arc::new(JobStore::new()),
    };

    // Background sweeper — removes expired presence and jobs every 30s.
    {
        let s = state.clone();
        tokio::spawn(async move {
            let mut tick = tokio::time::interval(Duration::from_secs(30));
            loop {
                tick.tick().await;
                let p = s.presence.sweep();
                let j = s.jobs.sweep();
                if p + j > 0 {
                    tracing::info!("swept {} presences, {} jobs", p, j);
                }
            }
        });
    }

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        // OTA + health
        .route("/api/check-update", get(check_update))
        .route("/health", get(health))
        // Auth
        .route("/api/auth/otp/send", post(otp_send))
        .route("/api/auth/otp/verify", post(otp_verify))
        // Presence
        .route("/api/heartbeat", post(heartbeat))
        .route("/api/heartbeat/stop", post(heartbeat_stop))
        // Jobs
        .route("/api/jobs", post(post_job))
        .route("/api/nearby", get(nearby))
        .route("/api/jobs/:id", get(get_job))
        .route("/api/jobs/:id/accept", post(accept_job))
        .route("/api/jobs/:id/done", post(mark_done))
        .route("/api/jobs/:id/rate", post(rate_job))
        // Reputation
        .route("/api/user/:id/reputation", get(reputation))
        // OTA bundle static hosting
        .nest_service("/bundles", ServeDir::new(BUNDLES_DIR))
        .layer(cors)
        .with_state(state);

    let port = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse::<u16>().ok())
        .unwrap_or(DEFAULT_PORT);
    let addr: SocketAddr = ([0, 0, 0, 0], port).into();
    tracing::info!("DailyGig server listening on http://{}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}
