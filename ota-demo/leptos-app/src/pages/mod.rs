//! Full-screen page views rendered inside the app shell (`ui::app`).
//!
//! Each page is a plain function returning `impl IntoView`, composed with
//! Leptos' HTML builder API. Routes for these pages are declared in
//! `ui::app` using `leptos_router`.

pub mod home;
pub mod settings;

/// Canonical route paths. Keeping them as constants avoids typos between
/// the `<Route path=…>` declarations and the `<A href=…>` links.
pub mod route {
    pub const HOME: &str = "/";
    pub const SETTINGS: &str = "/settings";
}
