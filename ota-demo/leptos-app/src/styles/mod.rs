//! Typed handles to every CSS module in the app.
//!
//! `stylance::import_crate_style!` reads the `.module.css` file at compile
//! time and generates one Rust `pub const <ident>: &str` per class
//! selector. Referencing a non-existent class becomes a compile error.
//!
//! The emitted CSS (with hash-scoped class names) is written to
//! `assets/generated/stylance.css` by the `stylance` binary that runs as
//! a Trunk pre-build hook (see `Trunk.toml`). It's outside `dist/`
//! because Trunk wipes `dist/` at the start of every build.
//!
//! Convention: keep class names snake_case in the .module.css files so
//! they map cleanly to Rust idents.

pub mod app {
    stylance::import_crate_style!(app, "src/styles/app.module.css");
}

pub mod status_pill {
    stylance::import_crate_style!(status_pill, "src/styles/status_pill.module.css");
}

pub mod action_button {
    stylance::import_crate_style!(action_button, "src/styles/action_button.module.css");
}

pub mod log_pane {
    stylance::import_crate_style!(log_pane, "src/styles/log_pane.module.css");
}
