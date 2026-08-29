//! Custom date-picker written entirely with Leptos's **builder API** —
//! no `view!` macro anywhere. Every element is a plain Rust function
//! (`div()`, `button()`, `span()`, …) with `.classes()`, `.attr()`,
//! `.on()`, `.child()` chained fluently.
//!
//! Same behaviour as before:
//!   * text-style trigger showing the ISO date
//!   * popup 6×7 grid with prev/next month + prev/next year
//!   * `on_change: Callback<SimpleDate>` fired on click
//!
//! Leptos primitives on display: `create_signal`, `create_memo`,
//! `create_effect`, `Show`, `For`, `Callback`, `IntoView`.

use leptos::html::{button, div, span, ElementDescriptor};
use leptos::*;
use shared::SimpleDate;

// ---------- date helpers -------------------------------------------------

fn is_leap(year: i32) -> bool {
    (year % 4 == 0 && year % 100 != 0) || year % 400 == 0
}

fn days_in_month(year: i32, month: u32) -> u32 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 => if is_leap(year) { 29 } else { 28 },
        _ => 0,
    }
}

/// Zeller's congruence. Returns 0 = Sunday .. 6 = Saturday.
fn first_dow(year: i32, month: u32) -> u32 {
    let (y, m) = if month < 3 { (year - 1, month + 12) } else { (year, month) };
    let k = y % 100;
    let j = y / 100;
    let h = (1 + (13 * (m as i32 + 1)) / 5 + k + k / 4 + j / 4 + 5 * j).rem_euclid(7);
    ((h + 6) % 7) as u32
}

const MONTH_NAMES: [&str; 12] = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];
const DOW_NAMES: [&str; 7] = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// ---------- component ----------------------------------------------------

/// Little helper: a header nav button (‹ › « »).
fn nav_btn<F>(label: &'static str, on_click: F) -> HtmlElement<leptos::html::Button>
where
    F: Fn(ev::MouseEvent) + 'static,
{
    button()
        .attr("type", "button")
        .on(ev::click, on_click)
        .child(label)
}

#[component]
pub fn DatePicker(
    /// Currently selected date (reactive).
    value: Signal<SimpleDate>,
    /// Called whenever the user picks a new date.
    #[prop(into)] on_change: Callback<SimpleDate>,
) -> impl IntoView {
    let (open, set_open) = create_signal(false);
    let (view_year, set_view_year) = create_signal(value.get_untracked().year);
    let (view_month, set_view_month) = create_signal(value.get_untracked().month);

    create_effect(move |_| {
        let v = value.get();
        set_view_year.set(v.year);
        set_view_month.set(v.month);
    });

    // Grid cells: (display_day, is_current_month, actual_date)
    let cells = create_memo(move |_| {
        let y = view_year.get();
        let m = view_month.get();
        let dim = days_in_month(y, m);
        let first = first_dow(y, m);

        let (prev_y, prev_m) = if m == 1 { (y - 1, 12) } else { (y, m - 1) };
        let prev_dim = days_in_month(prev_y, prev_m);

        let mut out: Vec<(u32, bool, SimpleDate)> = Vec::with_capacity(42);
        for i in 0..first {
            let d = prev_dim - first + 1 + i;
            out.push((d, false, SimpleDate::new(prev_y, prev_m, d)));
        }
        for d in 1..=dim {
            out.push((d, true, SimpleDate::new(y, m, d)));
        }
        let (next_y, next_m) = if m == 12 { (y + 1, 1) } else { (y, m + 1) };
        let mut next_day = 1u32;
        while out.len() < 42 {
            out.push((next_day, false, SimpleDate::new(next_y, next_m, next_day)));
            next_day += 1;
        }
        out
    });

    // Nav callbacks
    let prev_month = move |_| {
        let (y, m) = (view_year.get(), view_month.get());
        if m == 1 { set_view_year.set(y - 1); set_view_month.set(12); }
        else { set_view_month.set(m - 1); }
    };
    let next_month = move |_| {
        let (y, m) = (view_year.get(), view_month.get());
        if m == 12 { set_view_year.set(y + 1); set_view_month.set(1); }
        else { set_view_month.set(m + 1); }
    };
    let prev_year = move |_| set_view_year.update(|y| *y -= 1);
    let next_year = move |_| set_view_year.update(|y| *y += 1);

    // ---- Trigger button (always visible) --------------------------------
    let trigger = button()
        .attr("type", "button")
        .classes("datepicker-input")
        .on(ev::click, move |_| set_open.update(|o| *o = !*o))
        .child(move || value.get().to_iso());

    // ---- Popup (conditional) --------------------------------------------
    let popup = move || {
        // Header row with month/year label and nav buttons.
        let header = div()
            .classes("datepicker-header")
            .child(
                div()
                    .child(nav_btn("«", prev_year))
                    .child(nav_btn("‹", prev_month)),
            )
            .child(
                div()
                    .classes("label")
                    .child(move || format!(
                        "{} {}",
                        MONTH_NAMES[(view_month.get() - 1) as usize],
                        view_year.get(),
                    )),
            )
            .child(
                div()
                    .child(nav_btn("›", next_month))
                    .child(nav_btn("»", next_year)),
            );

        // Day-of-week header row.
        let dow_cells = DOW_NAMES
            .iter()
            .map(|d| div().classes("datepicker-dow").child(*d))
            .collect_view();

        // Day cells via <For/>. Building it as a component call.
        let day_cells = For(ForProps::builder()
            .each(move || cells.get().into_iter().enumerate())
            .key(|(i, _)| *i)
            .children(move |(_, (day, in_month, date))| {
                let selected = create_memo(move |_| value.get() == date);
                let class = move || {
                    let mut c = String::from("datepicker-day");
                    if !in_month { c.push_str(" other"); }
                    if selected.get() { c.push_str(" selected"); }
                    c
                };
                button()
                    .attr("type", "button")
                    .attr("class", class)
                    .on(ev::click, move |_| {
                        on_change.call(date);
                        set_open.set(false);
                    })
                    .child(day)
                    .into_view()
            })
            .build());

        let grid = div()
            .classes("datepicker-grid")
            .child(dow_cells)
            .child(day_cells);

        div()
            .classes("datepicker-popup")
            .child(header)
            .child(grid)
    };

    let show_popup = Show(ShowProps::builder()
        .when(move || open.get())
        .fallback(|| ().into_view())
        .children(ToChildren::to_children(move || popup().into_view()))
        .build());

    // ---- Root -----------------------------------------------------------
    div()
        .classes("datepicker")
        .child(trigger)
        .child(show_popup)
        .into_view()
}

// Ensure the compiler keeps `ElementDescriptor` import lint-quiet if the
// module ever changes shape — no runtime cost.
#[allow(dead_code)]
fn _elem_desc_marker<E: ElementDescriptor>() {}
