//! Fixed bottom tab bar. Uses `leptos_router::use_navigate` for
//! navigation and `use_location` for active-tab styling — all rendered
//! with the plain HTML builder API (no `view!` macro, no `<A>` props
//! wrestling).

use leptos::html::{a, div, span};
use leptos::*;
use leptos_router::{use_location, use_navigate, NavigateOptions};

use crate::pages::route;

/// Render the bottom nav bar.
pub fn bottom_nav() -> impl IntoView {
    div()
        .attr(
            "class",
            "fixed bottom-0 inset-x-0 safe-bottom bg-white/95 backdrop-blur \
             border-t border-slate-200 z-10",
        )
        .child(
            div()
                .attr("class", "grid grid-cols-2")
                .child(nav_tab_link(route::HOME, "🏠", "Home"))
                .child(nav_tab_link(route::SETTINGS, "⚙️", "Settings")),
        )
}

/// One individual tab link. Renders an `<a href>` so long-press/right-click
/// behave like real links, but intercepts click to route via
/// `use_navigate` (no full page reload).
fn nav_tab_link(href: &'static str, icon: &'static str, label: &'static str) -> impl IntoView {
    let location = use_location();
    let navigate = use_navigate();

    // Reactive class string so the active tab is highlighted.
    let class = move || {
        let active = location.pathname.get() == href;
        let base = "flex flex-col items-center justify-center py-2.5 gap-0.5 \
                    text-xs font-medium transition no-underline";
        if active {
            format!("{base} text-indigo-600")
        } else {
            format!("{base} text-slate-500 active:text-slate-700")
        }
    };

    a().attr("href", href)
        .attr("class", class)
        .on(ev::click, move |e| {
            // Prevent the browser's default full-page navigation and
            // hand off to the client-side router instead.
            e.prevent_default();
            navigate(href, NavigateOptions::default());
        })
        .child(span().attr("class", "text-lg leading-none").child(icon))
        .child(span().child(label))
}
