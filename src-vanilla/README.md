# src-vanilla — Fluent Builder Framework

A tiny, typesafe, Vaadin-flavored UI library for the TaskFinder Capacitor
app. Zero React. Zero JSX. Pure vanilla + TypeScript.

The Capacitor app now boots this framework (see `../index.html`). The old
React app is preserved at `../react.html` for browser preview only.

---

## Architecture — MVC + Services

```
┌──────────┐   read state    ┌────────────┐
│  Views   │────────────────▶│   Store    │  (Model)
│ (pure)   │                 │            │
└────┬─────┘                 └─────▲──────┘
     │ call                        │ update
     ▼                             │
┌──────────┐   call        ┌───────┴──────┐   I/O   ┌────────────┐
│Controllers│─────────────▶│   Services   │────────▶│  fetch     │
│           │              │              │         │  localStorage
│           │              │              │         │  SQLite     │
│           │              │              │         │  Capacitor  │
└───────────┘              └──────────────┘         └────────────┘
```

**Enforced rules**
- **Views** may only read `store.state` and call `controller.*` methods.
  They must not call `fetch`, `localStorage`, Capacitor plugins, or
  `store.update()` directly.
- **Controllers** orchestrate: call services, then update the store.
- **Services** are the ONLY layer that touches the outside world
  (network, storage, DB, native plugins).
- **Store** is dumb state — no side effects.

### Folders
```
src-vanilla/
├── framework/          # The library
│   ├── dom.ts          # UIComponent<T> — typesafe fluent wrapper
│   ├── tags.ts         # H1, Button, TextField, Card, ...
│   ├── store.ts        # Reactive Store<S>
│   ├── router.ts       # Hash router
│   └── index.ts
├── services/           # I/O layer (only place with fetch / storage / native)
│   ├── http.ts         # fetch wrapper
│   ├── storage.ts      # localStorage (swap to Preferences later)
│   ├── db.ts           # SQLite stub
│   ├── ota.ts          # @capgo/capacitor-updater wrapper
│   └── index.ts
├── controllers/        # Orchestrators (services + store)
│   ├── TaskController.ts
│   ├── OtaController.ts
│   └── index.ts
├── views/              # Pure views
│   ├── HomeView.ts
│   ├── AboutView.ts
│   └── OtaOverlay.ts
├── state.ts            # appStore
├── shell.ts            # Nav bar + content slot
└── main.ts             # Entrypoint
```

---

## DOM primitives (all typesafe)

```ts
El('div')
  .cls('card')
  .id('greeting')
  .style({ padding: '12px' })
  .add('Hello ', Span('world'))
  .prepend(H1('Title'))         // insert at start
  .replaceChildren(...)          // swap children
  .removeChild(child)            // targeted removal
  .replaceWith(other)            // swap self
  .insertBefore(child, ref)
  .insertAfter(child, ref)
  .visible(false)                // toggle display
  .remove()                      // detach from parent
  .clear();                      // remove all children
```

Element-specific helpers only compile on the right tag:
```ts
El('input').value('x')     // ✅
El('div').value('x')       // ❌ type error
El('a').href('/home')      // ✅
El('button').href('/x')    // ❌ type error
```

---

## Run in browser (dev)

```bash
# Requires Node.js >= 20 (Vite 8 constraint).
npm run dev
# then open:
#   http://localhost:5173/           ← vanilla app (default)
#   http://localhost:5173/react.html ← legacy React app
```

---

## Run on Capacitor (device)

The Android/iOS shells serve `dist/index.html`, which is built from
this framework. Nothing else needs to change.

```bash
# One-time: install deps + start the Rust update server (in another shell)
npm run server          # cd server && cargo run   (see ../server)

# On your phone: connect to same Wi-Fi as your dev machine.

# Build + sync + run on Android:
npm run android
# (this runs: vite build → cap sync android → cap run android)

# For iOS:
npm run build && npx cap sync ios && npx cap open ios
```

The OTA host defaults to `192.168.0.4:3000`. Override at build time:
```bash
OTA_HOST=192.168.1.42 OTA_PORT=3000 npm run android
```

---

## OTA hot-update flow (already wired)

1. `services/ota.ts` polls `${OTA_HOST}:${OTA_PORT}/api/check-update?current=<v>`
   every 5 minutes on device (never on the web).
2. On a new version, it downloads via `@capgo/capacitor-updater`, applies
   it, and reloads the WebView.
3. `views/OtaOverlay.ts` subscribes to the OTA service and shows a
   full-screen "Applying update..." spinner during the apply/reload phase
   only.

**Publish a hot-update:**
```bash
# Bumps version, builds dist/, zips it into ../bundles/vX.zip,
# updates ../bundles/latest.json — the Axum server serves that manifest.
npm run bundle:ota
```

The device will pick up the new bundle on the next poll (or when brought
to the foreground).

---

## What's next (iteration roadmap)

- [ ] Path params in `Router` (`/task/:id`)
- [ ] Lifecycle hooks (`onMount` / `onUnmount`) on `UIComponent`
- [ ] Two-way binding helper: `TextField().bind(store, 'draft')`
- [ ] Slice stores + selectors (avoid full-view re-render on unrelated updates)
- [ ] Replace `db` stub with real `@capacitor-community/sqlite` adapter
- [ ] Port the real business logic (jobs, geolocation) into services + controllers
