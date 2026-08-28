//! Central place for all client-side routing.
//!
//! * `path::*`  — canonical route paths as constants.
//! * `routes()` — the `<Routes>` block (one `<Route>` per page).
//! * `shell`    — the header/body/bottom-nav layout wrapped around the routes.
//!
//! Nothing outside this module knows about `leptos_router`, so swapping the
//! router (or adding a nested layout) is a local change.

pub mod shell;

use leptos::*;
use leptos_router::{Route, RouteProps, Routes, RoutesProps};

use crate::pages::{home::home_page, settings::settings_page};

/// Canonical route paths. Keep call-sites (`<A href=…>`, `use_navigate`,
/// `use_location`-based active checks) referring to these constants
/// instead of raw strings.
pub mod path {
    pub const HOME: &str = "/";
    pub const SETTINGS: &str = "/settings";
}

/// Build the `<Routes>` block. Pages read shared state from context
/// (`AppState::expect()`), so no props are drilled in from here.
pub fn routes() -> impl IntoView {
    Routes(
        RoutesProps::builder()
            .children(ToChildren::to_children(move || {
                Fragment::new(vec![
                    Route(
                        RouteProps::builder()
                            .path(path::HOME)
                            .view(|| home_page().into_view())
                            .build(),
                    )
                    .into_view(),
                    Route(
                        RouteProps::builder()
                            .path(path::SETTINGS)
                            .view(|| settings_page().into_view())
                            .build(),
                    )
                    .into_view(),
                ])
            }))
            .build(),
    )
}
