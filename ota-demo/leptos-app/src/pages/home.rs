//! Home tab — intentionally empty scaffolding.
//!
//! Drop your real product UI (feed, dashboard, etc.) in here.

use leptos::html::{div, h2, p};
use leptos::*;

/// Renders the Home page contents (everything inside the scrollable body,
/// not including the shell/header/bottom-nav).
pub fn home_page() -> impl IntoView {
    div()
        .attr("class", "flex flex-col gap-4")
        .child(
            div()
                .attr(
                    "class",
                    "rounded-2xl bg-white shadow-sm border border-slate-200 p-5",
                )
                .child(
                    h2()
                        .attr("class", "text-base font-semibold text-slate-900")
                        .child("Welcome 👋"),
                )
                .child(
                    p().attr("class", "mt-1 text-sm text-slate-600").child(
                        "This is your Home page. Add your app content here.",
                    ),
                ),
        )
        .child(
            div()
                .attr(
                    "class",
                    "rounded-2xl bg-white shadow-sm border border-slate-200 p-5 \
                     text-sm text-slate-500 flex items-center justify-center h-40",
                )
                .child("Empty — build your feed / dashboard here."),
        )
}
