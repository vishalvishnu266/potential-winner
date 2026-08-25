//! Tiny typed HTTP client for the Leptos WASM app.
//!
//! Built on `reqwest`, which on `wasm32-unknown-unknown` transparently
//! delegates to the browser `fetch` API — no request-init/headers
//! plumbing to keep in sync with `web-sys` versions.
//!
//! Anything with a JSON body should go through [`post_json`]; plain
//! text GETs use [`fetch_text`].

use wasm_bindgen::prelude::*;

/// Map any `reqwest::Error` (or other display-able error) into the
/// `JsValue` return type the rest of the wasm code already uses, so
/// callers don't need to care where the error came from.
fn js_err<E: std::fmt::Display>(prefix: &str) -> impl Fn(E) -> JsValue + '_ {
    move |e| JsValue::from_str(&format!("{prefix}: {e}"))
}

/// GET `url` and return the response body as a UTF-8 string. Non-2xx
/// responses are surfaced as `Err(JsValue::from_str("HTTP <code>"))`.
pub async fn fetch_text(url: &str) -> Result<String, JsValue> {
    let resp = reqwest::get(url).await.map_err(js_err("fetch"))?;
    if !resp.status().is_success() {
        return Err(JsValue::from_str(&format!("HTTP {}", resp.status().as_u16())));
    }
    resp.text().await.map_err(js_err("read body"))
}

/// Typed JSON POST helper. Serializes `body` with serde, POSTs it, and
/// deserializes the response back into `Resp`. Any transport, HTTP, or
/// serde error bubbles up as a `JsValue` so it plays nicely with the
/// rest of the wasm interop code.
pub async fn post_json<Req, Resp>(url: &str, body: &Req) -> Result<Resp, JsValue>
where
    Req: serde::Serialize,
    Resp: serde::de::DeserializeOwned,
{
    let resp = reqwest::Client::new()
        .post(url)
        .json(body) // sets Content-Type: application/json + serializes
        .send()
        .await
        .map_err(js_err("post"))?;

    if !resp.status().is_success() {
        return Err(JsValue::from_str(&format!("HTTP {}", resp.status().as_u16())));
    }

    resp.json::<Resp>().await.map_err(js_err("deserialize"))
}
