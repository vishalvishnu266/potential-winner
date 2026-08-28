//! Small cross-module helpers and constants.
//!
//! Kept intentionally tiny — anything that would grow real logic should
//! move into its own module (e.g. `live_update`, `http`).

/// Compile-time default for the OTA server base URL. Only used when the
/// `OTA_SERVER_URL` environment variable isn't set at build time. Point
/// this at whatever LAN IP your dev machine has by default.
const DEFAULT_SERVER: &str = "http://192.168.0.2:8080";

/// Base URL of the OTA server, resolved at compile time.
///
/// Set via the `OTA_SERVER_URL` env var when running Trunk, e.g.:
///
/// ```bash
/// # dev (LAN IP)
/// OTA_SERVER_URL=http://192.168.0.2:8080 trunk build --release
///
/// # prod (staging / production CDN)
/// OTA_SERVER_URL=https://ota.example.com trunk build --release
/// ```
///
/// Falls back to [`DEFAULT_SERVER`] when the env var isn't set so
/// `trunk serve` / a plain `cargo build` still works out of the box.
///
/// The value is trimmed of any trailing `/` at compile time so callers
/// can safely write `format!("{SERVER}{path}")` without worrying about
/// double slashes when `OTA_SERVER_URL` ends with a slash.
pub const SERVER: &str = {
    let raw = match option_env!("OTA_SERVER_URL") {
        Some(v) => v,
        None => DEFAULT_SERVER,
    };
    trim_trailing_slash(raw)
};

/// Placeholder shown in the "Installed" pill before the first OTA is
/// applied (i.e. while the WebView is still serving APK-bundled assets).
pub const BUNDLED_VERSION: &str = "bundled";

/// Trim a hash-looking string to a short display form ("abcdef1234…").
pub fn short(s: &str) -> String {
    if s.len() > 10 {
        format!("{}…", &s[..10])
    } else {
        s.to_string()
    }
}

// ---------------------------------------------------------------------------
// `const fn` helpers
// ---------------------------------------------------------------------------

/// `const`-friendly trailing-slash trimmer for [`SERVER`]. Only strips a
/// single trailing `/` — good enough for URL bases like `https://x/` or
/// `http://x:8080/`. Kept as a byte-level walk because `str::trim_end_matches`
/// isn't `const`.
const fn trim_trailing_slash(s: &str) -> &str {
    let bytes = s.as_bytes();
    let n = bytes.len();
    if n > 0 && bytes[n - 1] == b'/' {
        // SAFETY: `n - 1` is on a valid UTF-8 boundary — we're chopping
        // a single ASCII `/` off the end of an otherwise valid `&str`.
        let sliced = unsafe { std::slice::from_raw_parts(bytes.as_ptr(), n - 1) };
        match std::str::from_utf8(sliced) {
            Ok(v) => v,
            // Unreachable: `s` is valid UTF-8 and we chopped an ASCII byte.
            Err(_) => s,
        }
    } else {
        s
    }
}
