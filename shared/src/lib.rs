//! Types shared between the Axum server and the Leptos CSR client.
//!
//! Keeping these in a dedicated crate ensures the wire format
//! (JSON produced by the server and consumed by the client) is
//! always type-safe on both sides.

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// A calendar date represented as year / month / day.
///
/// We deliberately avoid pulling in `chrono` here so the type
/// compiles cleanly for both native (server) and wasm (client)
/// targets without extra features.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct SimpleDate {
    pub year: i32,
    pub month: u32, // 1..=12
    pub day: u32,   // 1..=31
}

impl SimpleDate {
    pub fn new(year: i32, month: u32, day: u32) -> Self {
        Self { year, month, day }
    }

    /// ISO-8601 style formatting: `YYYY-MM-DD`.
    pub fn to_iso(&self) -> String {
        format!("{:04}-{:02}-{:02}", self.year, self.month, self.day)
    }

    /// Parse an ISO-8601 `YYYY-MM-DD` string.
    pub fn from_iso(s: &str) -> Option<Self> {
        let parts: Vec<&str> = s.split('-').collect();
        if parts.len() != 3 {
            return None;
        }
        let year = parts[0].parse().ok()?;
        let month = parts[1].parse().ok()?;
        let day = parts[2].parse().ok()?;
        if !(1..=12).contains(&month) {
            return None;
        }
        if !(1..=31).contains(&day) {
            return None;
        }
        Some(Self { year, month, day })
    }
}

/// A user record stored on the server.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct User {
    pub id: Uuid,
    pub name: String,
    pub age: u32,
    pub dob: SimpleDate,
}

/// Payload used to create a new user (server assigns the id).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
pub struct CreateUser {
    pub name: String,
    pub age: u32,
    pub dob: SimpleDate,
}

/// Payload used to partially update an existing user.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
pub struct UpdateUser {
    pub name: Option<String>,
    pub age: Option<u32>,
    pub dob: Option<SimpleDate>,
}

impl Default for SimpleDate {
    fn default() -> Self {
        // A neutral default; the UI will override this immediately.
        Self { year: 2000, month: 1, day: 1 }
    }
}
