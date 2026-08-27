//! Sticky top header. Shows the current route's title on the left and a
//! small app-name chip on the right. Respects the phone's notch via
//! the `safe-top` utility class defined in `index.html`.

use leptos::html::{div, h1, span};
use leptos::*;
use leptos_router::use_location;

use crate::pages::route;

/// Render the top header. The title is derived reactively from the
/// current URL so it updates as the user navigates between tabs.
pub fn header_bar() -> impl IntoView {
    let location = use_location();
    let title = move || match location.pathname.get().as_str() {
        route::SETTINGS => "Settings",
        // Fall back to Home for `/` and any unknown path.
        _ => "Home",
    };

    div()
        .attr(
            "class",
            "safe-top sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200",
        )
        .child(
            div()
                .attr("class", "px-4 py-3 flex items-center justify-between")
                .child(
                    h1()
                        .attr("class", "text-lg font-semibold tracking-tight")
                        .child(title),
                )
                .child(
                    span()
                        .attr(
                            "class",
                            "text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full",
                        )
                        .child("OTA Demo"),
                ),
        )
}
