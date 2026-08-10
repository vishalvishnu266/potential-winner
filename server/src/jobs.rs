//! In-memory live job board with a 30-minute TTL.
//!
//! Once a job completes (both parties tap Done + both confirm payment),
//! we write a compact row into `completions` in SQLite for reputation
//! stats. The job body itself is dropped from memory shortly after.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::RwLock;

use crate::presence::now_ms;

pub const JOB_TTL_MS: i64 = 30 * 60 * 1000; // 30 min

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Job {
    pub id: String,
    pub requester_id: String,
    pub category: String,
    pub description: String,
    pub lat: f64,
    pub lon: f64,
    pub budget: Option<i64>,      // in INR paise-free integer
    pub bids_open: bool,
    pub created_at: i64,
    pub expires_at: i64,

    // handshake state
    pub accepted_by: Option<String>,   // doer user id
    pub requester_done: bool,
    pub doer_done: bool,
    pub requester_paid: bool,
    pub doer_received: bool,
    pub payment_method: String,        // 'upi' | 'cash' | 'unpaid'
}

impl Job {
    pub fn is_expired(&self) -> bool {
        now_ms() > self.expires_at
    }
    pub fn is_fully_done(&self) -> bool {
        self.requester_done
            && self.doer_done
            && (self.payment_method == "cash" ||
                (self.requester_paid && self.doer_received))
    }
}

#[derive(Default)]
pub struct JobStore {
    inner: RwLock<HashMap<String, Job>>,
}

impl JobStore {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn insert(&self, job: Job) {
        self.inner.write().unwrap().insert(job.id.clone(), job);
    }

    pub fn get(&self, id: &str) -> Option<Job> {
        self.inner.read().unwrap().get(id).cloned()
    }

    pub fn update<F: FnOnce(&mut Job)>(&self, id: &str, f: F) -> Option<Job> {
        let mut map = self.inner.write().unwrap();
        if let Some(j) = map.get_mut(id) {
            f(j);
            return Some(j.clone());
        }
        None
    }

    pub fn remove(&self, id: &str) -> Option<Job> {
        self.inner.write().unwrap().remove(id)
    }

    pub fn snapshot(&self) -> Vec<Job> {
        self.inner
            .read()
            .unwrap()
            .values()
            .filter(|j| !j.is_expired())
            .cloned()
            .collect()
    }

    pub fn sweep(&self) -> usize {
        let mut map = self.inner.write().unwrap();
        let before = map.len();
        map.retain(|_, j| !j.is_expired());
        before - map.len()
    }
}
