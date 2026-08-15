# Task Platform (monorepo)

Two Capacitor apps sharing one Rust/Axum backend and one OTA pipeline:

| App                | Path             | Audience                                | Native `appId`               |
|--------------------|------------------|-----------------------------------------|------------------------------|
| **Customer**       | `apps/customer/` | End users posting work / finding cabs   | `com.yourcompany.taskfinder` |
| **Worker**         | `apps/worker/`   | Freelancers & service firms (crew, ops) | `com.yourcompany.worker`     |

This repo was recently converted from a single-app layout to an
**npm workspaces** monorepo.  No new business logic has been added yet —
`apps/worker` is currently a byte-for-byte copy of the customer shell so
the two apps can diverge independently from a known-good baseline.

## Stack (unchanged)

- **Frontend:** React 18 + Vite + `react-router-dom` + Tailwind v4
- **State:**    Zustand
- **i18n:**     Custom, zero-dependency (English + Tamil)
- **Native:**   Capacitor 8 (Android + iOS)
- **OTA:**      `@capgo/capacitor-updater` + a tiny Axum Rust server
- **Backend:**  Rust / Axum (OTA + health only, for now)

## Repo layout

```
task-platform/
├─ package.json                 ← npm workspaces root, orchestration scripts
├─ tsconfig.base.json           ← shared TS compiler options
│
├─ apps/
│  ├─ customer/                 ← the original app, moved here as-is
│  │  ├─ package.json           name: @app/customer
│  │  ├─ capacitor.config.json  appId: com.yourcompany.taskfinder
│  │  ├─ vite.config.js
│  │  ├─ tsconfig.json          extends ../../tsconfig.base.json
│  │  ├─ index.html
│  │  ├─ src/                   (App.tsx, router, pages, components, ...)
│  │  ├─ public/
│  │  ├─ android/               Capacitor-generated
│  │  └─ ios/                   Capacitor-generated
│  │
│  └─ worker/                   ← new shell, mirror of customer
│     ├─ package.json           name: @app/worker
│     ├─ capacitor.config.json  appId: com.yourcompany.worker
│     ├─ vite.config.js
│     ├─ tsconfig.json          extends ../../tsconfig.base.json
│     ├─ index.html
│     ├─ src/                   (identical shell to customer)
│     └─ public/
│     (android/ & ios/ are NOT committed — run `npm run cap:add:android`
│      and `npm run cap:add:ios` inside apps/worker to generate them)
│
├─ packages/                    ← shared code (single source of truth)
│  ├─ theme/                    Tailwind v4 tokens + fixed emerald brand palette
│  ├─ native/                   Capacitor wrappers (storage, haptics, useTheme, ...)
│  ├─ i18n/                     generic createI18n({ bundles, defaultLocale })
│  ├─ api-contracts/            generated typed client + configureApi
│  ├─ ota/                      configureOta, useOta, otaStore, UpdateOverlay (uses api.checkUpdate)
│  ├─ ui/                       generic <TabBar />, more components to come
│  └─ vite-config/              createAppConfig({ appName, appDir }) — one factory, both apps
│
├─ server/                      ← Rust/Axum backend (unchanged location)
│  ├─ Cargo.toml
│  ├─ migrations/
│  └─ src/main.rs               ← now serves per-app OTA channels
│
├─ bundles/                     ← generated OTA bundles, per-app subfolders
│  ├─ customer/                 latest.json + vX.zip
│  └─ worker/                   latest.json + vX.zip
│
└─ scripts/
   └─ build-bundle.mjs          ← takes --app=<customer|worker>
```

### Shared `packages/`

The app-agnostic shell has been extracted into workspace packages so
`apps/customer` and `apps/worker` share a single source of truth:

| Package              | What lives here                                                                | Consumers                     |
|----------------------|---------------------------------------------------------------------------------|-------------------------------|
| `@pkg/theme`         | Tailwind v4 tokens, dark/light surfaces, single fixed emerald brand palette (`style.css`).  | Both apps import in `main.tsx`|
| `@pkg/native`        | Capacitor wrappers: `initNative`, `syncStatusBar`, `hapticTap`, `storage`, `useTheme`. | Both apps |
| `@pkg/i18n`          | Generic `createI18n({ bundles, defaultLocale, localeMeta })` factory.          | Each app registers its own bundles |
| `@pkg/api-contracts` | Generated typed client + `configureApi({ baseUrl })`. Source of truth: `openapi.json` (regenerated from the Rust server via `npm run api:sync`). | Both apps |
| `@pkg/ota`           | `configureOta({ appName })`, `otaClient`, `useOtaStore`, `useOta`, `UpdateOverlay`. Uses `api.checkUpdate` under the hood — no separate HTTP transport. | Both apps |
| `@pkg/ui`            | Generic `<TabBar tabs={...} getTabForPath={...} />`.                            | Each app supplies its own tab list |
| `@pkg/vite-config`   | `createAppConfig({ appName, appDir })` — React + Tailwind plugins, monorepo `fs.allow`, shared-package pre-bundling, `__APP_*__` compile-time globals, `APP_VERSION` stamping. | Both `vite.config.js` files are now one-liners. |

Apps consume packages via workspace name imports (`@pkg/native`,
`@pkg/ota`, etc.). No build step is required — Vite reads the package
TS sources directly. TypeScript path aliases in `tsconfig.base.json`
plus the `optimizeDeps.include` list in each app's `vite.config.js`
keep dev + typecheck happy.

App-specific pieces stay per-app:

- `apps/<app>/src/i18n/{en,ta,types}.ts` — each app owns its own message shape and translations.
- `apps/<app>/src/components/TabBar.tsx` — thin app-flavoured wrapper over `@pkg/ui`'s `TabBar`.
- `apps/<app>/src/{router,pages}/` — apps' route surface.

Every UI/hook imports the typed API directly from `@pkg/api-contracts` — there is no per-app `data/` layer.  If an app ever needs to decorate requests (auth, retries, logging), pass a custom `fetch` via `configureApi({ fetch })` in that app's `main.tsx`.

## Install

```bash
npm install                      # installs both workspaces + runs `api:sync` postinstall
```

npm workspaces hoists shared deps into the root `node_modules/`. Each
app also gets a lightweight `node_modules/` symlink so tools that
resolve from the app dir (Vite, Capacitor) still work.

The root `postinstall` script runs `npm run api:sync`, which
regenerates `packages/api-contracts/src/generated/*.gen.ts` from the
Rust `#[utoipa]` decorations.  These files are **git-ignored** — the
Rust source is the only committed source of truth for the HTTP
contract.  If your machine lacks a Rust toolchain the postinstall
prints a warning and continues; run `npm run api:sync` manually
before your first typecheck / build.

## Common workflows

All commands are runnable from the repo root:

```bash
# Rust OTA / health server (start this first — every dev build hits it)
npm run server

# Dev servers (hit the real Rust backend)
npm run dev:customer             # -> http://localhost:5173  (customer)
npm run dev:worker               # -> http://localhost:5173  (worker)

# Type-check every workspace
npm run typecheck

# Prod builds
npm run build:customer:prod
npm run build:worker:prod
npm run build:all

# Native (build + cap sync + run)
npm run android:customer
npm run android:worker
npm run ios:customer
npm run ios:worker

# One-shot OTA release — regen typed stubs from Rust, then build + zip bundle.
# Output lands in bundles/<app>/vX.zip + latest.json, ready for the server to serve.
npm run release:ota:customer     # customer only
npm run release:ota:worker       # worker only
npm run release:ota              # both apps

# Lower-level OTA bundling (skips api:sync — assumes stubs are current)
npm run bundle:ota:customer
npm run bundle:ota:worker
```

Or run from inside an app directory as before:

```bash
cd apps/customer
npm run dev
npm run android
npm run bundle:ota
```

## OTA — now per-app

The Rust server accepts an `app` query parameter and reads
`bundles/<app>/latest.json`:

```
GET /api/check-update?app=customer&current=<installed-version>
GET /api/check-update?app=worker&current=<installed-version>
```

Behaviour:

- `?app=` is validated (`[A-Za-z0-9_-]{1,32}`) to prevent path traversal.
- If omitted, defaults to `customer` for backwards compatibility with
  the original single-app setup.
- Bundles are served under `/bundles/<app>/vX.zip` (unchanged
  `ServeDir` on `/bundles`, now with per-app subdirectories).

`scripts/build-bundle.mjs` mirrors this layout:

```bash
node scripts/build-bundle.mjs --app=customer
node scripts/build-bundle.mjs --app=worker
```

Output:

```
bundles/
  customer/
    latest.json
    v0.0.0-20260814T120500.zip
  worker/
    latest.json
    v0.0.0-20260814T120530.zip
```

> **Note on the client side:** the OTA client in `@pkg/ota` calls
> `api.checkUpdate({ query: { app: <appName> } })` — the `appName` is
> passed once at boot via `configureOta({ appName })` in each app's
> `main.tsx`, so the server's per-app dispatch works without any
> per-app HTTP code.

## API — spec-first, codegen everywhere

The Rust server is the single source of truth for the HTTP contract.
Handlers and DTOs are decorated with `utoipa`, producing an OpenAPI 3.1
spec that drives both the interactive docs UI and the TypeScript
client.

```
server/src/api.rs                                         (Rust — hand-written)
     │  #[utoipa::path(...)] on each handler,
     │  #[derive(ToSchema)] on each DTO
     ▼
GET /api-docs/openapi.json     ─┐
GET /docs (Scalar UI)           │  served at runtime by the Rust server
                                │
cargo run --bin export-openapi ─┘
     │  writes deterministic JSON
     ▼
packages/api-contracts/openapi.json                       (committed)
     │
npm run api:codegen  (@hey-api/openapi-ts)
     ▼
packages/api-contracts/src/generated/                     (git-ignored *.gen.ts)
     │  types.gen.ts   — request/response TS types
     │  services.gen.ts — one typed function per endpoint
     │  schemas.gen.ts  — runtime schema objects
     ▼
apps/{customer,worker}/src/**/*  imports it as `@pkg/api-contracts`
```

### The workflow — three commands total

```bash
npm run api:export         # Rust → openapi.json
npm run api:codegen        # openapi.json → TS client + types
npm run api:sync           # both, in order (use this)
```

Add a new endpoint:

1. Add the Rust handler + `#[derive(ToSchema)]` DTO + `#[utoipa::path(...)]` in `server/src/api.rs`.
2. Register the route in `api::router()` (one line: `.routes(routes!(my_handler))`).
3. From the repo root: `npm run api:sync`.
4. `api.myHandler({...})` is now callable and fully typed in both apps.

### Calling the API

```ts
import { api, configureApi } from '@pkg/api-contracts';

// Done once at boot in main.tsx:
configureApi({ baseUrl: 'http://192.168.0.4:3000' });

// Everywhere else, from any component/hook/effect:
const { ok }       = await api.health();
const { available, url, version } = await api.checkUpdate({
    query: { current: 'v0.1', app: 'customer' },
});
```

Requests + responses are typed end-to-end.  Change a Rust `#[derive(ToSchema)]` DTO and `tsc --noEmit` will pinpoint every affected call site.

### No mocks — one source of truth

Every build talks to the real Rust server.  There is no client-side
mock adapter and no `APP_ENV=mock` code path.  If you need to see the
UI without a backend running, either stand up the Rust server locally
(`npm run server`) or hand-write a fixture in the component / hook
that needs it.

Rationale: the mock adapter we used to have re-derived responses from
OpenAPI `example` values, which added ~200 lines of parser we owned
and produced anaemic data that didn't reflect real backend behaviour.
Deleting it removed a whole drift axis.

### Docs UI

While the Rust server is running:

- `http://localhost:3000/docs`                — Scalar interactive docs
- `http://localhost:3000/api-docs/openapi.json` — the raw spec

## Adding a feature (checklist)

**Per-app (customer OR worker only):**

1. Add the endpoint to `server/src/api.rs` (Rust — see "API workflow" above).
2. Run `npm run api:sync` from the repo root.
3. Call `api.myEndpoint({...})` directly from your component or hook (`import { api } from '@pkg/api-contracts'`).
4. Add i18n keys to `apps/<app>/src/i18n/types.ts` and translate in `en.ts` + `ta.ts`.
5. Add a new route in `apps/<app>/src/router/index.tsx` and (optionally) a tab in `apps/<app>/src/components/TabBar.tsx`.

**Cross-cutting concerns (shared code):**

- **UI primitive** used identically in both apps → add to `@pkg/ui` (presentation-only + generic).
- **Native side-effect** (permissions, plugin wrapper) → add to `@pkg/native`.
- **New i18n key that both apps need** → for now, add to each app's `i18n/types.ts` (their `Messages` shapes are per-app so they can diverge). If a truly shared string emerges, we can lift a `SharedMessages` type into `@pkg/i18n`.
- **Anything the API returns** → already shared — it lives in `@pkg/api-contracts/src/generated/`, regenerated from Rust.

## Install & run

The old lockfile under `apps/customer/` was deleted as part of the extraction — the root workspace hoists everything now:

```bash
npm install                      # from repo root, installs all workspaces
npm run dev:customer             # -> http://localhost:5173
npm run dev:worker               # -> http://localhost:5173  (stop customer first)
```

## Migration notes (what changed in this pivot)

- All previously top-level app files (`src/`, `android/`, `ios/`,
  `public/`, `index.html`, `vite.config.js`, `tsconfig.json`,
  `capacitor.config.json`, `package.json`, `package-lock.json`) now live
  under `apps/customer/`.
- Root `package.json` declares npm workspaces: `apps/*`, `packages/*`.
- Root `tsconfig.base.json` holds the shared compiler config; each app's
  `tsconfig.json` extends it.
- `scripts/build-bundle.mjs` now requires `--app=<name>` and writes to
  `bundles/<app>/` instead of `bundles/`.
- `server/src/main.rs::check_update` reads per-app manifests and returns
  per-app URLs.
- `apps/worker/` is a fresh copy of the customer shell with a distinct
  `appId` (`com.yourcompany.worker`) and no native `android/`/`ios/`
  folders yet (regenerate with `npx cap add android|ios`).

No product/business logic (jobs, cabs, sponsors, ERP, AI agents) has
been introduced by this conversion — that lands in follow-up commits.
