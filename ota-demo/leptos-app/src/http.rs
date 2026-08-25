//! Tiny typed HTTP client for the Leptos WASM app.
//!
//! Built directly on the browser `fetch` API via `web-sys` — no `reqwest`
//! (which would double our WASM size). Anything with a JSON body should
//! go through [`post_json`]; plain-text GETs use [`fetch_text`].

use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::JsFuture;

use crate::capacitor::window;

/// GET `url` and return the response body as a UTF-8 string. Non-2xx
/// responses are surfaced as `Err(JsValue::from_str("HTTP <code>"))`.
pub async fn fetch_text(url: &str) -> Result<String, JsValue> {
    let promise = window().fetch_with_str(url);
    let resp: web_sys::Response = JsFuture::from(promise).await?.dyn_into()?;
    if !resp.ok() {
        return Err(JsValue::from_str(&format!("HTTP {}", resp.status())));
    }
    let text = JsFuture::from(resp.text()?).await?;
    Ok(text.as_string().unwrap_or_default())
}

/// Typed JSON POST helper built on the browser's `fetch` API — no
/// `reqwest` needed. Serializes `body` with serde, POSTs it, and
/// deserializes the response back into `Resp`. Any HTTP or serde error
/// bubbles up as a `JsValue` so it plays nicely with the rest of the
/// wasm interop code.
pub async fn post_json<Req, Resp>(url: &str, body: &Req) -> Result<Resp, JsValue>
where
    Req: serde::Serialize,
    Resp: serde::de::DeserializeOwned,
{
    let payload = serde_json::to_string(body)
        .map_err(|e| JsValue::from_str(&format!("serialize: {e}")))?;

    // Use the classic (0.3-wide) builder-style RequestInit API so we
    // don't depend on the newer `set_method`/`set_body` accessors.
    let mut opts = web_sys::RequestInit::new();
    opts.method("POST");
    opts.body(Some(&JsValue::from_str(&payload)));

    let request = web_sys::Request::new_with_str_and_init(url, &opts)?;
    request
        .headers()
        .set("Content-Type", "application/json")?;

    let resp: web_sys::Response =
        JsFuture::from(window().fetch_with_request(&request)).await?.dyn_into()?;
    if !resp.ok() {
        return Err(JsValue::from_str(&format!("HTTP {}", resp.status())));
    }
    let text = JsFuture::from(resp.text()?).await?;
    let text = text.as_string().unwrap_or_default();
    serde_json::from_str::<Resp>(&text)
        .map_err(|e| JsValue::from_str(&format!("deserialize: {e}")))
}
