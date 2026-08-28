//! Fixed bottom tab bar.
//!
//! Two items: **Home** (`/`) and **Settings** (`/settings`). Tapping
//! either navigates via `use_navigate` (client-side, no full reload) and
//! fires a short native haptic pulse so the user feels the transition.
//!
//! Active-tab styling is derived from `use_location`. Icons are inline
//! SVGs (Heroicons-style, 24×24, `stroke="currentColor"`) so they inherit
//! the tab's active/inactive color and render pixel-perfectly across
//! every Android WebView version — no font-emoji drift.

use leptos::html::{a, div, span};
use leptos::*;
use leptos_router::{use_location, use_navigate, NavigateOptions};
use wasm_bindgen_futures::spawn_local;

use crate::platform::haptics::vibrate;
use crate::router::path;

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
                .child(nav_link(path::HOME, ICON_HOME, "Home"))
                .child(nav_link(path::SETTINGS, ICON_SETTINGS, "Settings")),
        )
}

/// A router link rendered as an `<a>` with `href` (so long-press etc.
/// behave like real links) whose click is intercepted to route via
/// `use_navigate` — plus a short native haptic pulse for tactile feedback.
fn nav_link(href: &'static str, icon_svg: &'static str, label: &'static str) -> impl IntoView {
    let location = use_location();
    let navigate = use_navigate();

    let class = move || {
        let active = location.pathname.get() == href;
        let base = "flex flex-col items-center justify-center py-2 gap-1 \
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
            e.prevent_default();
            // Fire-and-forget haptic — no need to await; errors here
            // aren't user-actionable (e.g. desktop browser with no
            // vibrate API just silently does nothing).
            spawn_local(async move {
                let _ = vibrate().await;
            });
            navigate(href, NavigateOptions::default());
        })
        // Icon: inline SVG injected via `inner_html`. `currentColor` in
        // the SVG picks up the tab's text color, so active/inactive
        // theming Just Works.
        .child(
            span()
                .attr("class", "inline-flex h-6 w-6 items-center justify-center")
                .inner_html(icon_svg),
        )
        .child(span().attr("class", "leading-none").child(label))
}

// ---------------------------------------------------------------------------
// Icons (Heroicons v2 "outline", 24×24)
// ---------------------------------------------------------------------------
//
// Kept as `&'static str` so the WASM bundle can embed them once. All use
// `stroke="currentColor"` and `fill="none"` so they inherit the parent's
// text color for active/inactive styling.

/// Heroicons v2 outline — `home`.
const ICON_HOME: &str = r##"<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor" class="h-6 w-6">
  <path stroke-linecap="round" stroke-linejoin="round"
        d="M2.25 12 12 2.25 21.75 12M4.5 9.75v9.75a1.5 1.5 0 0 0 1.5 1.5H9V15h6v6h3a1.5 1.5 0 0 0 1.5-1.5V9.75" />
</svg>"##;

/// Heroicons v2 outline — `cog-6-tooth`.
const ICON_SETTINGS: &str = r##"<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor" class="h-6 w-6">
  <path stroke-linecap="round" stroke-linejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z" />
  <path stroke-linecap="round" stroke-linejoin="round"
        d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
</svg>"##;
