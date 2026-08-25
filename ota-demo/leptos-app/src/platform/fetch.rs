//! Minimal fetch helper. We only need text bodies — the actual bundle
//! download is handled by `LiveUpdate.downloadBundle` on the native side.

use wasm_bindgen::{JsCast, JsValue};
use wasm_bindgen_futures::JsFuture;

use crate::platform::window::window;

/// GET `url` and return the response body as a String. Non-2xx responses
/// are returned as `Err` with an `HTTP <status>` marker.
pub async fn fetch_text(url: &str) -> Result<String, JsValue> {
    let promise = window().fetch_with_str(url);
    let resp: web_sys::Response = JsFuture::from(promise).await?.dyn_into()?;
    if !resp.ok() {
        return Err(JsValue::from_str(&format!("HTTP {}", resp.status())));
    }
    let text = JsFuture::from(resp.text()?).await?;
    Ok(text.as_string().unwrap_or_default())
}
