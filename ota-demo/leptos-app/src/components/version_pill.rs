//! A single labelled pill used in the Profile card's version row
//! (`Bundled` / `Installed` / `Server`). Kept generic so the caller
//! supplies the reactive value as a `Signal<String>`.

use leptos::html::{div, span};
use leptos::*;

/// Render a small stacked "label + value" pill.
pub fn version_pill(label: &'static str, value: Signal<String>) -> impl IntoView {
    div()
        .attr(
            "class",
            "rounded-xl bg-slate-50 border border-slate-100 py-2 px-2",
        )
        .child(
            span()
                .attr(
                    "class",
                    "block text-[10px] uppercase tracking-wide text-slate-400",
                )
                .child(label),
        )
        .child(
            span()
                .attr("class", "block text-xs font-mono text-slate-700 truncate")
                .child(move || value.get()),
        )
}
