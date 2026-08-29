//! Root component + routing, written using Leptos's **builder API** only.
//! No `view!` macro is used anywhere in the client.
//!
//! Three pages backed by `leptos_router`:
//!   * `/`                       → `UsersListPage`   (list + Edit / Delete)
//!   * `/users/new`              → `CreateUserPage`
//!   * `/users/:id/edit`         → `EditUserPage`
//!
//! Every network operation drives a loading/saving flag. The UI updates
//! only *after* the server responds. The Axum server sleeps 1 s per
//! request so the pattern is clearly visible.

use leptos::html::{button, div, h3, nav, p, span, table, tbody, td, th, thead, tr};
use leptos::*;
use leptos_router::*;
use shared::{CreateUser, SimpleDate, UpdateUser, User};
use uuid::Uuid;

use crate::api;
use crate::user_form::{UserForm, UserFormData, UserFormProps};

// ---- small helpers to cut the boilerplate ------------------------------

/// Wrap a view in a Fragment (what `children` slots expect).
fn frag(v: impl IntoView) -> Fragment {
    Fragment::new(vec![v.into_view()])
}

/// Anchor helper: `link("/", true, "Users")` → `<A href="/" exact=true>Users</A>`.
fn link(href: &'static str, exact: bool, label: &'static str) -> impl IntoView {
    A(AProps::builder()
        .href(href)
        .exact(exact)
        .children(ToChildren::to_children(move || frag(label)))
        .build())
}

/// Same as `link`, but the label can be any view (e.g. an inner `<button>`)
/// and the href can be an owned `String`.
fn link_with<F, IV>(href: String, exact: bool, children: F) -> impl IntoView
where
    F: Fn() -> IV + 'static,
    IV: IntoView + 'static,
{
    A(AProps::builder()
        .href(href)
        .exact(exact)
        .children(ToChildren::to_children(move || frag(children())))
        .build())
}

/// Route helper.
fn route<F, IV>(path: &'static str, view: F) -> impl IntoView
where
    F: Fn() -> IV + 'static,
    IV: IntoView + 'static,
{
    Route(RouteProps::builder().path(path).view(view).build())
}

#[component]
pub fn App() -> impl IntoView {
    // Everything renders inside <Router>. IMPORTANT: build the entire
    // sub-tree inside the `children` closure so nothing gets cloned/moved
    // twice.
    Router(RouterProps::builder()
        .children(ToChildren::to_children(move || {
            let nav_bar = nav()
                .classes("nav-links")
                .child(link("/", true, "Users"))
                .child(link("/users/new", false, "Add user"));

            let routes = Routes(RoutesProps::builder()
                .children(ToChildren::to_children(|| {
                    Fragment::new(vec![
                        route("/", UsersListPage).into_view(),
                        route("/users/new", CreateUserPage).into_view(),
                        route("/users/:id/edit", EditUserPage).into_view(),
                    ])
                }))
                .build());

            let container = div()
                .classes("container")
                .child(leptos::html::h1().child("Leptos + Axum User CRUD"))
                .child(nav_bar)
                .child(routes);

            frag(container)
        }))
        .build())
}

// -------------------------------------------------------------------------
// /  – Users list
// -------------------------------------------------------------------------

#[component]
fn UsersListPage() -> impl IntoView {
    let (users, set_users) = create_signal::<Vec<User>>(Vec::new());
    let (error, set_error) = create_signal::<Option<String>>(None);
    let (loading, set_loading) = create_signal(false);
    let (deleting, set_deleting) = create_signal::<Option<Uuid>>(None);

    let refresh = move || {
        set_loading.set(true);
        spawn_local(async move {
            match api::list_users().await {
                Ok(list) => { set_users.set(list); set_error.set(None); }
                Err(e) => set_error.set(Some(format!("Failed to load users: {e}"))),
            }
            set_loading.set(false);
        });
    };

    {
        let refresh = refresh.clone();
        create_effect(move |_| { refresh(); });
    }

    let delete_user = move |id: Uuid| {
        if deleting.get().is_some() { return; }
        set_deleting.set(Some(id));
        let refresh = refresh.clone();
        spawn_local(async move {
            match api::delete_user(id).await {
                Ok(()) => { set_deleting.set(None); refresh(); }
                Err(e) => {
                    set_error.set(Some(format!("Delete failed: {e}")));
                    set_deleting.set(None);
                }
            }
        });
    };

    // Reactive fragments -----------------------------------------------------
    let error_line = move || match error.get() {
        Some(e) => div().classes("error").child(e).into_view(),
        None => ().into_view(),
    };

    let loading_line = move || {
        if loading.get() {
            div()
                .classes("loading")
                .child(span().classes("spinner"))
                .child("Loading users from server…")
                .into_view()
        } else {
            ().into_view()
        }
    };

    let empty_line = move || {
        if !loading.get() && users.get().is_empty() {
            p().attr("style", "color:#6b7280")
                .child("No users yet — ")
                .child(link("/users/new", false, "add one"))
                .child(".")
                .into_view()
        } else {
            ().into_view()
        }
    };

    let table_view = move || {
        if users.get().is_empty() {
            return ().into_view();
        }

        let rows = For(ForProps::builder()
            .each(move || users.get())
            .key(|u: &User| u.id)
            .children(move |u: User| {
                let id = u.id;
                let edit_href = format!("/users/{id}/edit");
                let is_deleting = create_memo(move |_| deleting.get() == Some(id));

                let delete_btn = button()
                    .classes("danger")
                    .prop("disabled", move || deleting.get().is_some())
                    .on(ev::click, move |_| delete_user(id))
                    .child(move || {
                        if is_deleting.get() {
                            span().classes("spinner").into_view()
                        } else {
                            ().into_view()
                        }
                    })
                    .child(move || if is_deleting.get() { "Deleting…" } else { "Delete" });

                let edit_btn = link_with(edit_href, false, || {
                    button().classes("secondary").child("Edit")
                });

                tr()
                    .attr("style", move || {
                        if is_deleting.get() { "opacity: 0.5;" } else { "" }
                    })
                    .child(td().child(u.name.clone()))
                    .child(td().child(u.age))
                    .child(td().child(u.dob.to_iso()))
                    .child(
                        td().child(
                            div()
                                .classes("actions")
                                .child(edit_btn)
                                .child(delete_btn),
                        ),
                    )
                    .into_view()
            })
            .build());

        table()
            .child(
                thead().child(
                    tr()
                        .child(th().child("Name"))
                        .child(th().child("Age"))
                        .child(th().child("DOB"))
                        .child(th()),
                ),
            )
            .child(tbody().child(rows))
            .into_view()
    };

    div()
        .classes("card")
        .child(h3().child("Users"))
        .child(error_line)
        .child(loading_line)
        .child(empty_line)
        .child(table_view)
        .into_view()
}

// -------------------------------------------------------------------------
// /users/new  – Create page
// -------------------------------------------------------------------------

#[component]
fn CreateUserPage() -> impl IntoView {
    let (error, set_error) = create_signal::<Option<String>>(None);
    let (saving, set_saving) = create_signal(false);
    let navigate = use_navigate();

    let initial = UserFormData {
        name: String::new(),
        age: 0,
        dob: SimpleDate::new(2000, 1, 1),
    };

    let on_submit = {
        let navigate = navigate.clone();
        Callback::new(move |data: UserFormData| {
            let navigate = navigate.clone();
            set_saving.set(true);
            set_error.set(None);
            spawn_local(async move {
                let payload = CreateUser { name: data.name, age: data.age, dob: data.dob };
                match api::create_user(payload).await {
                    Ok(_) => { set_saving.set(false); navigate("/", NavigateOptions::default()); }
                    Err(e) => {
                        set_error.set(Some(format!("Create failed: {e}")));
                        set_saving.set(false);
                    }
                }
            });
        })
    };

    let on_cancel = {
        let navigate = navigate.clone();
        Callback::new(move |_| {
            if !saving.get() {
                navigate("/", NavigateOptions::default());
            }
        })
    };

    let form = UserForm(UserFormProps::builder()
        .initial(initial)
        .submit_label("Add".to_string())
        .on_submit(on_submit)
        .on_cancel(on_cancel)
        .saving(Signal::derive(move || saving.get()))
        .build());

    let error_line = move || match error.get() {
        Some(e) => div().classes("error").child(e).into_view(),
        None => ().into_view(),
    };

    div()
        .classes("card")
        .child(h3().child("Add user"))
        .child(form)
        .child(error_line)
        .into_view()
}

// -------------------------------------------------------------------------
// /users/:id/edit  – Edit page
// -------------------------------------------------------------------------

#[component]
fn EditUserPage() -> impl IntoView {
    let params = use_params_map();
    let navigate = use_navigate();
    let (error, set_error) = create_signal::<Option<String>>(None);
    let (loaded, set_loaded) = create_signal::<Option<UserFormData>>(None);
    let (user_id, set_user_id) = create_signal::<Option<Uuid>>(None);
    let (saving, set_saving) = create_signal(false);

    // Load the user whose id is in the URL.
    create_effect(move |_| {
        let id_str = params.with(|p| p.get("id").cloned()).unwrap_or_default();
        let Ok(id) = Uuid::parse_str(&id_str) else {
            set_error.set(Some(format!("Invalid user id: {id_str}")));
            return;
        };
        set_user_id.set(Some(id));
        spawn_local(async move {
            match api::list_users().await {
                Ok(list) => match list.into_iter().find(|u| u.id == id) {
                    Some(u) => set_loaded.set(Some(UserFormData {
                        name: u.name, age: u.age, dob: u.dob,
                    })),
                    None => set_error.set(Some("User not found".into())),
                },
                Err(e) => set_error.set(Some(format!("Load failed: {e}"))),
            }
        });
    });

    let on_submit = {
        let navigate = navigate.clone();
        Callback::new(move |data: UserFormData| {
            let navigate = navigate.clone();
            let Some(id) = user_id.get() else { return; };
            set_saving.set(true);
            set_error.set(None);
            spawn_local(async move {
                let payload = UpdateUser {
                    name: Some(data.name),
                    age: Some(data.age),
                    dob: Some(data.dob),
                };
                match api::update_user(id, payload).await {
                    Ok(_) => { set_saving.set(false); navigate("/", NavigateOptions::default()); }
                    Err(e) => {
                        set_error.set(Some(format!("Update failed: {e}")));
                        set_saving.set(false);
                    }
                }
            });
        })
    };

    let on_cancel = {
        let navigate = navigate.clone();
        Callback::new(move |_| {
            if !saving.get() {
                navigate("/", NavigateOptions::default());
            }
        })
    };

    // Body: either "Loading…" or the form, depending on whether the user
    // has been fetched. Errors that occur before the form loads are shown
    // in the same spot as the loading indicator.
    let body = move || {
        if let Some(data) = loaded.get() {
            UserForm(UserFormProps::builder()
                .initial(data)
                .submit_label("Update".to_string())
                .on_submit(on_submit)
                .on_cancel(on_cancel)
                .saving(Signal::derive(move || saving.get()))
                .build())
                .into_view()
        } else {
            p().classes("loading")
                .child(move || {
                    if error.get().is_none() {
                        span().classes("spinner").into_view()
                    } else {
                        ().into_view()
                    }
                })
                .child(move || match error.get() {
                    Some(e) => e,
                    None => "Loading user from server…".to_string(),
                })
                .into_view()
        }
    };

    let error_line = move || {
        // Only show the error line here once the form is visible; before
        // that, the error is rendered inside `body`.
        if error.get().is_some() && loaded.get().is_some() {
            div().classes("error").child(error.get().unwrap_or_default()).into_view()
        } else {
            ().into_view()
        }
    };

    div()
        .classes("card")
        .child(h3().child("Edit user"))
        .child(body)
        .child(error_line)
        .into_view()
}
