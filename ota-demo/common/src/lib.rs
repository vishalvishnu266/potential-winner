//! Shared OTA contract between the Axum server and the Leptos client.
//!
//! Any wire-facing type or route path should live here — never duplicate a
//! JSON shape or a URL path string on either side. Both crates depend on
//! this crate so a breaking change to the contract fails to compile
//! everywhere at once, which is exactly what we want.

#![deny(missing_docs)]

use serde::{Deserialize, Serialize};

// ---------- Route constants ----------

/// HTTP route paths served by the OTA server. Clients should build URLs by
/// concatenating a base (e.g. `http://192.168.0.2:8080`) with one of these
/// constants — never hard-code the path string.
pub mod routes {
    /// `GET /latest` — returns the full [`crate::Latest`] manifest.
    pub const LATEST: &str = "/latest";

    /// `GET /version` — returns [`crate::VersionResp`] (thin passthrough of
    /// `latest.version`).
    pub const VERSION: &str = "/version";

    /// `GET /bundles/<name>.zip` — raw bundle bytes served from disk.
    /// The `url` field of [`crate::Latest`] is already an absolute URL
    /// under this prefix; you usually don't need to build it by hand.
    pub const BUNDLES_PREFIX: &str = "/bundles";

    /// `POST /hello` — takes a [`crate::HelloReq`], returns a
    /// [`crate::HelloResp`]. Kept trivial as a demo of a typed POST.
    pub const HELLO: &str = "/hello";
}

// ---------- Wire types ----------

/// Kind of artifact a bundle is packaged as. Serialized as a lowercase
/// string to match the Capawesome Live Update plugin's `artifactType`
/// option (`"zip"` today; leaving room for `"manifest"` later).
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ArtifactType {
    /// A single zip file containing the unpacked webroot at its root.
    Zip,
}

impl Default for ArtifactType {
    fn default() -> Self {
        ArtifactType::Zip
    }
}

/// Contents of `bundles/latest.json`, and the body returned by
/// `GET /latest`. This is the source of truth for OTA metadata.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Latest {
    /// Opaque bundle identifier (currently a content hash of the zip).
    pub version: String,
    /// Absolute URL from which the bundle can be downloaded.
    pub url: String,
    /// Packaging format of the bundle. Renamed for JS-side ergonomics.
    #[serde(rename = "artifactType", default)]
    pub artifact_type: ArtifactType,
}

/// Body returned by `GET /version` — a thin passthrough of
/// [`Latest::version`] for clients that don't need the download URL.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct VersionResp {
    /// Same value as [`Latest::version`] for the current latest bundle.
    pub version: String,
}

/// Request body for `POST /hello`. Trivial "hello world"-style payload
/// used to demonstrate a typed round-trip POST between the Leptos client
/// and the Axum server.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct HelloReq {
    /// Name to greet. May be empty; the server will fall back to "world".
    pub name: String,
}

/// Response body for `POST /hello`.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct HelloResp {
    /// A friendly greeting like `"Hello, world!"`.
    pub message: String,
}
