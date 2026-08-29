//! Small wrapper around `gloo-net` for talking to the Axum server.

use gloo_net::http::Request;
use shared::{CreateUser, UpdateUser, User};
use uuid::Uuid;

const BASE: &str = "http://127.0.0.1:3000/api";

pub async fn list_users() -> Result<Vec<User>, String> {
    Request::get(&format!("{BASE}/users"))
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json::<Vec<User>>()
        .await
        .map_err(|e| e.to_string())
}

pub async fn create_user(payload: CreateUser) -> Result<User, String> {
    Request::post(&format!("{BASE}/users"))
        .json(&payload)
        .map_err(|e| e.to_string())?
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json::<User>()
        .await
        .map_err(|e| e.to_string())
}

pub async fn update_user(id: Uuid, payload: UpdateUser) -> Result<User, String> {
    Request::put(&format!("{BASE}/users/{id}"))
        .json(&payload)
        .map_err(|e| e.to_string())?
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json::<User>()
        .await
        .map_err(|e| e.to_string())
}

pub async fn delete_user(id: Uuid) -> Result<(), String> {
    Request::delete(&format!("{BASE}/users/{id}"))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}
