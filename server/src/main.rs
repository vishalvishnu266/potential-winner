//! Axum server exposing a JSON CRUD API for `User` records.
//!
//! Users are held in memory (behind an `RwLock`) — restart the server
//! and state is lost. That's fine for the demo.

use std::{
    collections::HashMap,
    net::SocketAddr,
    sync::{Arc, RwLock},
    time::Duration,
};

use axum::{
    extract::{Path, State},
    http::{Method, StatusCode},
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use shared::{CreateUser, UpdateUser, User};
use tokio::time::sleep;
use tower_http::{
    cors::{Any, CorsLayer},
    trace::TraceLayer,
};
use tracing_subscriber::{fmt, EnvFilter};
use uuid::Uuid;

/// Artificial latency added to every handler so the UI's "wait for the
/// server before updating" pattern is clearly visible.
const DEMO_DELAY: Duration = Duration::from_millis(1000);

/// Shared server state — a map of users keyed by their id.
#[derive(Default, Clone)]
struct AppState {
    users: Arc<RwLock<HashMap<Uuid, User>>>,
}

#[tokio::main]
async fn main() {
    fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .init();

    let state = AppState::default();

    // Allow the Leptos CSR client (served on a different port, e.g. Trunk's 8080)
    // to talk to us during development.
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/users", get(list_users).post(create_user))
        .route(
            "/api/users/:id",
            get(get_user).put(update_user).delete(delete_user),
        )
        .with_state(state)
        .layer(cors)
        .layer(TraceLayer::new_for_http());

    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    tracing::info!("listening on http://{}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

// --------------------------------------------------------------------------
// Handlers
// --------------------------------------------------------------------------

async fn list_users(State(state): State<AppState>) -> Json<Vec<User>> {
    sleep(DEMO_DELAY).await;
    let users = state.users.read().unwrap();
    let mut list: Vec<User> = users.values().cloned().collect();
    // Stable, human-friendly ordering.
    list.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Json(list)
}

async fn get_user(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<User>, StatusCode> {
    sleep(DEMO_DELAY).await;
    let users = state.users.read().unwrap();
    users
        .get(&id)
        .cloned()
        .map(Json)
        .ok_or(StatusCode::NOT_FOUND)
}

async fn create_user(
    State(state): State<AppState>,
    Json(payload): Json<CreateUser>,
) -> impl IntoResponse {
    sleep(DEMO_DELAY).await;
    let user = User {
        id: Uuid::new_v4(),
        name: payload.name,
        age: payload.age,
        dob: payload.dob,
    };
    state
        .users
        .write()
        .unwrap()
        .insert(user.id, user.clone());
    (StatusCode::CREATED, Json(user))
}

async fn update_user(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateUser>,
) -> Result<Json<User>, StatusCode> {
    sleep(DEMO_DELAY).await;
    let mut users = state.users.write().unwrap();
    let existing = users.get_mut(&id).ok_or(StatusCode::NOT_FOUND)?;
    if let Some(name) = payload.name {
        existing.name = name;
    }
    if let Some(age) = payload.age {
        existing.age = age;
    }
    if let Some(dob) = payload.dob {
        existing.dob = dob;
    }
    Ok(Json(existing.clone()))
}

async fn delete_user(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> StatusCode {
    sleep(DEMO_DELAY).await;
    let removed = state.users.write().unwrap().remove(&id).is_some();
    if removed {
        StatusCode::NO_CONTENT
    } else {
        StatusCode::NOT_FOUND
    }
}
