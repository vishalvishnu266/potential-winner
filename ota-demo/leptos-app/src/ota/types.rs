//! Wire types for the Axum OTA server's `/latest` endpoint.

use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct LatestResp {
    pub version: String,
    pub url: String,
    #[serde(rename = "artifactType", default = "default_artifact_type")]
    pub artifact_type: String,
}

fn default_artifact_type() -> String {
    "zip".to_string()
}
