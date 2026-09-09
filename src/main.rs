use axum::{
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use tower_http::trace::TraceLayer;
use uuid::Uuid;

#[derive(Serialize, Deserialize)]
struct HealthCheck {
    status: String,
    id: Uuid,
    db_ok: bool,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // dotenvy configuration
    dotenvy::dotenv().ok();

    // tracing-subscriber setup
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .init();

    tracing::info!("Initializing application checks...");

    // sqlx in-memory sqlite verification
    let pool = SqlitePool::connect("sqlite::memory:").await?;
    sqlx::query("CREATE TABLE health (id TEXT)").execute(&pool).await?;
    let db_check = sqlx::query_scalar::<_, i64>("SELECT 1").fetch_one(&pool).await;
    let db_ok = db_check.is_ok();

    // axum router with tower-http trace layer, uuid, and serde_json response
    let app = Router::new()
        .route("/", get(move || async move {
            let payload = HealthCheck {
                status: "online".to_string(),
                id: Uuid::new_v4(),
                db_ok,
            };
            Json(payload)
        }))
        .layer(TraceLayer::new_for_http());

    // tokio TCP listener and axum server execution
    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000").await?;
    tracing::info!("Server started successfully at http://127.0.0.1:3000");

    axum::serve(listener, app).await?;

    Ok(())
}
