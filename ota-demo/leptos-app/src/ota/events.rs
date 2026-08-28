//! OTA event stream + human-readable formatting.

use crate::util::short;

/// Events emitted while an OTA operation is in progress. The UI turns
/// these into a status line + updates the "Installed"/"Server" pills.
#[derive(Debug, Clone)]
pub enum OtaEvent {
    /// About to hit `/latest`.
    Checking,
    /// `/latest` returned this server version (raw, not shortened).
    ServerVersion(String),
    /// Currently-installed bundle matches the server → nothing to do.
    UpToDate { version: String },
    /// New version available; download about to start.
    Downloading { from: String, to: String },
    /// Download finished, `setNextBundle` is being applied.
    Activating { version: String },
    /// New bundle activated; about to reload the WebView.
    Installed { version: String },
    /// Reload has been requested (or fallback `location.reload()` used).
    Reloading,
    /// Any terminal error, already formatted for display.
    Error(String),
}

/// Convert an [`OtaEvent`] into a human-readable status line.
pub fn event_status_line(ev: &OtaEvent) -> String {
    match ev {
        OtaEvent::Checking => "Checking…".into(),
        OtaEvent::ServerVersion(v) => format!("Server has v {}", short(v)),
        OtaEvent::UpToDate { version } => format!("Up to date (v {version})"),
        OtaEvent::Downloading { from, to } => {
            format!("Update available: {from} → {to}\nDownloading bundle…")
        }
        OtaEvent::Activating { version } => format!("Activating v {version}…"),
        OtaEvent::Installed { version } => format!("Installed v {version}"),
        OtaEvent::Reloading => "Reloading into new bundle…".into(),
        OtaEvent::Error(msg) => msg.clone(),
    }
}
