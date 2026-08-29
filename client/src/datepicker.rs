//! A custom date-picker Leptos component built from scratch — no JS libs.
//!
//! It renders a text field with the currently selected ISO date, and on
//! click reveals a popup with a month grid you can navigate through
//! (prev / next month, prev / next year). Clicking a day fires the
//! `on_change` callback with a `SimpleDate` and closes the popup.
//!
//! Highlights of the Leptos features used:
//!   * `#[component]` and the `view!` macro for declarative markup.
//!   * Signals (`create_signal`, `create_memo`) for reactive state.
//!   * `Show` for conditional rendering.
//!   * `For` for keyed lists (the day cells).
//!   * `Callback` for parent → child event wiring.

use leptos::*;
use shared::SimpleDate;

/// Returns `true` for leap years using the standard Gregorian rule.
fn is_leap(year: i32) -> bool {
    (year % 4 == 0 && year % 100 != 0) || year % 400 == 0
}

/// Number of days in a given month (1-indexed).
fn days_in_month(year: i32, month: u32) -> u32 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 => if is_leap(year) { 29 } else { 28 },
        _ => 0,
    }
}

/// Zeller's congruence — day of the week for the 1st of a given month.
/// Returns 0 = Sunday .. 6 = Saturday.
fn first_dow(year: i32, month: u32) -> u32 {
    let (y, m) = if month < 3 { (year - 1, month + 12) } else { (year, month) };
    let k = y % 100;
    let j = y / 100;
    let h = (1 + (13 * (m as i32 + 1)) / 5 + k + k / 4 + j / 4 + 5 * j).rem_euclid(7);
    // Zeller: 0 = Saturday, 1 = Sunday, ...  Convert to 0 = Sunday.
    ((h + 6) % 7) as u32
}

const MONTH_NAMES: [&str; 12] = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

const DOW_NAMES: [&str; 7] = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

#[component]
pub fn DatePicker(
    /// Currently selected date (reactive).
    value: Signal<SimpleDate>,
    /// Called whenever the user picks a new date.
    #[prop(into)] on_change: Callback<SimpleDate>,
) -> impl IntoView {
    // Popup open / closed state.
    let (open, set_open) = create_signal(false);

    // The month currently displayed in the popup — tracks `value` initially
    // but can be advanced independently via the prev/next buttons.
    let (view_year, set_view_year) = create_signal(value.get_untracked().year);
    let (view_month, set_view_month) = create_signal(value.get_untracked().month);

    // Whenever `value` changes from the outside, re-sync the view.
    create_effect(move |_| {
        let v = value.get();
        set_view_year.set(v.year);
        set_view_month.set(v.month);
    });

    // Compute the grid cells for the visible month.
    // Each cell is `(display_day, is_current_month, actual_date)`.
    let cells = create_memo(move |_| {
        let y = view_year.get();
        let m = view_month.get();
        let dim = days_in_month(y, m);
        let first = first_dow(y, m);

        // Previous month's trailing days.
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
        // Fill the trailing cells so the grid is a clean 6 × 7.
        let (next_y, next_m) = if m == 12 { (y + 1, 1) } else { (y, m + 1) };
        let mut next_day = 1u32;
        while out.len() < 42 {
            out.push((next_day, false, SimpleDate::new(next_y, next_m, next_day)));
            next_day += 1;
        }
        out
    });

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

    let display = move || value.get().to_iso();

    view! {
        <div class="datepicker">
            <button
                type="button"
                class="datepicker-input"
                on:click=move |_| set_open.update(|o| *o = !*o)
            >
                {display}
            </button>

            <Show when=move || open.get() fallback=|| view! { <></> }>
                <div class="datepicker-popup">
                    <div class="datepicker-header">
                        <div>
                            <button type="button" on:click=prev_year>{"«"}</button>
                            <button type="button" on:click=prev_month>{"‹"}</button>
                        </div>
                        <div class="label">
                            {move || format!("{} {}",
                                MONTH_NAMES[(view_month.get() - 1) as usize],
                                view_year.get())}
                        </div>
                        <div>
                            <button type="button" on:click=next_month>{"›"}</button>
                            <button type="button" on:click=next_year>{"»"}</button>
                        </div>
                    </div>

                    <div class="datepicker-grid">
                        {DOW_NAMES.iter().map(|d| view! {
                            <div class="datepicker-dow">{*d}</div>
                        }).collect_view()}

                        <For
                            each=move || cells.get().into_iter().enumerate()
                            key=|(i, _)| *i
                            children=move |(_, (day, in_month, date))| {
                                let selected = create_memo(move |_| value.get() == date);
                                let class = move || {
                                    let mut c = String::from("datepicker-day");
                                    if !in_month { c.push_str(" other"); }
                                    if selected.get() { c.push_str(" selected"); }
                                    c
                                };
                                view! {
                                    <button
                                        type="button"
                                        class=class
                                        on:click=move |_| {
                                            on_change.call(date);
                                            set_open.set(false);
                                        }
                                    >
                                        {day}
                                    </button>
                                }
                            }
                        />
                    </div>
                </div>
            </Show>
        </div>
    }
}
