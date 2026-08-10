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
use tower_http::request_id::{
    MakeRequestId, PropagateRequestIdLayer, RequestId, SetRequestIdLayer,
};
use tower_http::services::ServeDir;
use tower_http::trace::{DefaultOnResponse, TraceLayer};
use tracing::Level;
use uuid::Uuid;

// -----------------------------------------------------------------------------
// Request-ID plumbing
// -----------------------------------------------------------------------------
//
// Every incoming request gets a stable request_id that:
//   1. Reuses the caller's `X-Request-Id` header if it was set (useful for
//      distributed tracing / mobile clients).
//   2. Otherwise, a fresh UUIDv4 is minted server-side.
//
// The value is:
//   * stored on the request as `RequestId` (via tower_http::SetRequestIdLayer)
//   * echoed back on the response as `X-Request-Id`
//     (via tower_http::PropagateRequestIdLayer)
//   * bound to the per-request tracing span (see `make_request_span` below)
//     so every log line — SQL, handler debug!, response event — is
//     grepable by the same id.

const REQUEST_ID_HEADER: &str = "x-request-id";

/// Generate a fresh UUIDv4 as the request id when the client didn't send one.
#[derive(Clone, Default)]
struct UuidRequestId;
impl MakeRequestId for UuidRequestId {
    fn make_request_id<B>(&mut self, _req: &http::Request<B>) -> Option<RequestId> {
        let id = Uuid::new_v4().to_string();
        // Safe: UUIDs are ASCII, always a valid header value.
        http::HeaderValue::from_str(&id).ok().map(RequestId::new)
    }
}

/// Attach a tracing span to every request that carries the request_id
/// as a field — so nested `tracing::debug!` events show it automatically.
fn make_request_span(req: &http::Request<axum::body::Body>) -> tracing::Span {
    let req_id = req
        .headers()
        .get(REQUEST_ID_HEADER)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("-");
    tracing::debug_span!(
        "http",
        request_id = %req_id,
        method = %req.method(),
        uri = %req.uri(),
    )
}

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

#[tracing::instrument(skip_all, fields(current = ?params.current))]
async fn check_update(Query(params): Query<UpdateQuery>) -> impl IntoResponse {
    let _ = params.channel;
    match find_latest_bundle() {
        Some((version, file)) => {
            let available = params.current.as_deref() != Some(&version);
            let url = format!("{}/bundles/{}", public_base_url(), file);
            tracing::info!(latest = %version, available, url = %url, "OTA check");
            Json(UpdateResponse {
                available,
                version: Some(version),
                url: Some(url),
            })
        }
        None => {
            tracing::warn!(
                "OTA check: no bundles/latest.json found (expected at {}/latest.json)",
                BUNDLES_DIR,
            );
            Json(UpdateResponse {
                available: false,
                version: None,
                url: None,
            })
        }
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

#[tracing::instrument(skip_all)]
async fn health(State(s): State<AppState>) -> impl IntoResponse {
    let live_workers = s.presence.snapshot(None).len();
    let live_jobs = s.jobs.snapshot().len();
    tracing::debug!(live_workers, live_jobs, "health check");
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

#[tracing::instrument(skip_all, fields(phone = %req.phone))]
async fn otp_send(Json(req): Json<OtpSendReq>) -> impl IntoResponse {
    // Dev mode: print the OTP to the console; production would call an SMS API.
    tracing::info!("dev OTP dispatched (0000)");
    Json(serde_json::json!({ "ok": true, "hint": "0000" }))
}

#[tracing::instrument(skip_all, fields(phone = %req.phone))]
async fn otp_verify(
    State(s): State<AppState>,
    Json(req): Json<OtpVerifyReq>,
) -> Result<Json<AuthResp>, (StatusCode, String)> {
    tracing::debug!("otp_verify start");
    if req.otp != "0000" {
        tracing::warn!("bad OTP submitted");
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

#[tracing::instrument(skip_all, fields(user_id = %req.user_id, lat = req.lat, lon = req.lon))]
async fn heartbeat(
    State(s): State<AppState>,
    Json(req): Json<HeartbeatReq>,
) -> impl IntoResponse {
    tracing::debug!(cats = ?req.categories, "heartbeat");
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

#[tracing::instrument(skip_all)]
async fn heartbeat_stop(
    State(s): State<AppState>,
    Json(req): Json<serde_json::Value>,
) -> impl IntoResponse {
    if let Some(uid) = req.get("user_id").and_then(|v| v.as_str()) {
        tracing::debug!(user_id = %uid, "heartbeat_stop");
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

#[tracing::instrument(skip_all, fields(requester = %req.requester_id, cat = %req.category))]
async fn post_job(
    State(s): State<AppState>,
    Json(req): Json<PostJobReq>,
) -> impl IntoResponse {
    let id = Uuid::new_v4().to_string();
    let now = now_ms();
    tracing::info!(job_id = %id, budget = ?req.budget, "job posted");
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

#[tracing::instrument(skip_all, fields(lat = q.lat, lon = q.lon, radius = q.radius_km, cat = ?q.category))]
async fn nearby(
    State(s): State<AppState>,
    Query(q): Query<NearbyQuery>,
) -> impl IntoResponse {
    tracing::debug!("nearby query");
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

    tracing::debug!(
        jobs = jobs.len(), workers = workers.len(), sponsors = sponsors.len(),
        "nearby result",
    );
    Json(NearbyResp { jobs, workers, sponsors })
}

#[tracing::instrument(skip_all, fields(job_id = %id))]
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
#[tracing::instrument(skip_all, fields(job_id = %id, doer = %req.doer_id))]
async fn accept_job(
    State(s): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<AcceptReq>,
) -> Result<Json<Job>, (StatusCode, String)> {
    tracing::info!("job accept");
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
#[tracing::instrument(skip_all, fields(job_id = %id, role = %req.role))]
async fn mark_done(
    State(s): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<DoneReq>,
) -> Result<Json<Job>, (StatusCode, String)> {
    tracing::debug!(paid = req.paid, received = req.received, method = ?req.payment_method, "done tick");
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
#[tracing::instrument(skip_all, fields(job_id = %id, role = %req.role, rating = req.rating))]
async fn rate_job(
    State(s): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<RateReq>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    tracing::info!("rating submitted");
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
#[tracing::instrument(skip_all, fields(user_id = %user_id))]
async fn reputation(
    State(s): State<AppState>,
    Path(user_id): Path<String>,
) -> impl IntoResponse {
    tracing::debug!("reputation lookup");
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
    // Default filter cranked to DEBUG for the whole server so every
    // handler entry + every SQL statement is visible in the console.
    // Override with `RUST_LOG=...` for production noise-reduction, e.g.
    //   RUST_LOG=info,server=info,sqlx=warn
    tracing_subscriber::fmt()
        .with_target(true)
        .with_level(true)
        .with_thread_ids(false)
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| {
                // - server: our own crate at DEBUG
                // - tower_http::trace: HTTP span open/close at DEBUG
                // - sqlx::query: every SQL statement at DEBUG (see db.rs
                //   for the connection-level `log_statements` config)
                "debug,server=debug,tower_http=debug,sqlx=debug,hyper=info,mio=info".into()
            }),
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

    // Per-request tracing.  Uses `make_request_span` so the request_id
    // header is bound as a span field and inherited by every nested
    // event (SQL statements, handler debug!s, response event).
    let trace_layer = TraceLayer::new_for_http()
        .make_span_with(make_request_span)
        .on_response(DefaultOnResponse::new().level(Level::DEBUG));

    // The request-id layers must sit OUTSIDE the trace layer so the
    // header is populated before the span is built.
    let set_req_id      = SetRequestIdLayer::new(
        http::HeaderName::from_static(REQUEST_ID_HEADER),
        UuidRequestId::default(),
    );
    let propagate_req_id = PropagateRequestIdLayer::new(
        http::HeaderName::from_static(REQUEST_ID_HEADER),
    );

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
        // Layer order matters — outermost runs first.  We want the
        // request_id to be minted BEFORE the trace span is built, so
        // set_req_id is applied AFTER trace_layer in the builder (Tower
        // wraps in reverse order):
        //   incoming  → set_req_id → trace → handler
        //   outgoing  → handler   → trace → propagate_req_id
        .layer(trace_layer)
        .layer(set_req_id)
        .layer(propagate_req_id)
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
