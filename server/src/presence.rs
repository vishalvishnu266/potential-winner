//! In-memory worker presence with TTL. Nothing here is persisted.
//!
//! A worker sends `POST /api/heartbeat { user_id, lat, lon, categories[] }`
//! every ~60 s while online. If we don't hear from them for `TTL_MS`, they
//! silently disappear from `/api/nearby` responses — exactly what the
//! product wants: "when a worker finishes / logs off, they should not be
//! shown to users".

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::RwLock;
use std::time::{SystemTime, UNIX_EPOCH};

/// A worker is considered online for this long after their last heartbeat.
pub const TTL_MS: i64 = 90_000; // 90 seconds

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Presence {
    pub user_id: String,
    pub name: String,
    pub lat: f64,
    pub lon: f64,
    pub categories: Vec<String>,
    /// ms since epoch
    pub updated_at: i64,
}

#[derive(Default)]
pub struct PresenceStore {
    inner: RwLock<HashMap<String, Presence>>,
}

impl PresenceStore {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn upsert(&self, p: Presence) {
        self.inner.write().unwrap().insert(p.user_id.clone(), p);
    }

    pub fn remove(&self, user_id: &str) {
        self.inner.write().unwrap().remove(user_id);
    }

    /// Return all live (non-expired) workers matching an optional category.
    pub fn snapshot(&self, category: Option<&str>) -> Vec<Presence> {
        let now = now_ms();
        let map = self.inner.read().unwrap();
        map.values()
            .filter(|p| now - p.updated_at <= TTL_MS)
            .filter(|p| match category {
                Some(c) => p.categories.iter().any(|x| x == c),
                None => true,
            })
            .cloned()
            .collect()
    }

    /// Remove expired entries. Called periodically by a background task.
    pub fn sweep(&self) -> usize {
        let now = now_ms();
        let mut map = self.inner.write().unwrap();
        let before = map.len();
        map.retain(|_, p| now - p.updated_at <= TTL_MS);
        before - map.len()
    }
}

pub fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}
