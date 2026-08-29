//! Leptos CSR entrypoint.

use leptos::*;

mod api;
mod app;
mod datepicker;
mod user_form;

fn main() {
    console_error_panic_hook::set_once();
    // No `view!` macro anywhere — the whole UI is built with the
    // Leptos builder API (see `app.rs`, `user_form.rs`, `datepicker.rs`).
    mount_to_body(|| app::App(app::AppProps {}));
}
