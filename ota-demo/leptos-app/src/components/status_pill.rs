//! `<StatusPill/>` — a labelled value badge (e.g. "Installed: abc123…").
//!
//! `value` is `Signal<String>` so callers can pass a `ReadSignal`, a
//! derived signal, or `Signal::derive(|| "…".to_string())` for constants.

use leptos::html::span;
use leptos::*;

use crate::styles::status_pill as css;

#[component]
pub fn StatusPill(
    #[prop(into)] label: String,
    #[prop(into)] value: Signal<String>,
) -> impl IntoView {
    span()
        .attr("class", css::status_pill::pill)
        .child(
            span()
                .attr("class", css::status_pill::label)
                .child(label),
        )
        .child(
            span()
                .attr("class", css::status_pill::value)
                .child(move || value.get()),
        )
}
