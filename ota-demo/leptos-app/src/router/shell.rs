//! Mobile shell rendered inside the `Router`: sticky header on top,
//! scrollable routed body in the middle, fixed bottom nav on the bottom.

use leptos::html::div;
use leptos::*;

use crate::router::routes;
use crate::ui::bottom_nav::bottom_nav;
use crate::ui::header::header_bar;

/// Build the shell. Assumes it is mounted inside a `Router` (so
/// `use_location` / `use_navigate` work) and that `AppState` has been
/// provided into context.
pub fn shell() -> impl IntoView {
    div()
        .attr(
            "class",
            "min-h-screen w-full flex flex-col bg-slate-50 text-slate-900",
        )
        .child(header_bar())
        .child(
            // Scrollable content area. pb-24 keeps the last card above the
            // fixed bottom nav; safe-bottom respects the phone gesture bar.
            div()
                .attr("class", "flex-1 overflow-y-auto px-4 pt-4 pb-24")
                .child(routes()),
        )
        .child(bottom_nav())
}
