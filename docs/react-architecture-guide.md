# Task Finder — React & Architecture Guide

A ground-up tour of **this codebase** for someone new to React. Every
concept is illustrated with a real file from the project so you can
click through and see it in context.

---

## Table of contents

1. [The 30-second overview](#the-30-second-overview)
2. [The tech stack](#the-tech-stack)
3. [The folder layout](#the-folder-layout)
4. [How the app boots](#how-the-app-boots)
5. [React fundamentals used everywhere](#react-fundamentals-used-everywhere)
   - JSX / TSX
   - Function components
   - Props
   - The three hooks you'll see 90% of the time (`useState`, `useEffect`, `useMemo`)
   - The three you'll see occasionally (`useRef`, `useCallback`, `useEffect` cleanup)
6. [Custom hooks — the "composables" pattern](#custom-hooks--the-composables-pattern)
7. [State management in this app](#state-management-in-this-app)
8. [Routing & navigation](#routing--navigation)
9. [Styling: Tailwind + reusable components](#styling-tailwind--reusable-components)
10. [Talking to native code (Capacitor)](#talking-to-native-code-capacitor)
11. [The OTA / hot-update pipeline](#the-ota--hot-update-pipeline)
12. [Data flow: a full end-to-end example](#data-flow-a-full-end-to-end-example)
13. [Conventions & idioms you'll see](#conventions--idioms-youll-see)
14. [Common pitfalls](#common-pitfalls)
15. [Where to go next](#where-to-go-next)

---

## The 30-second overview

You are building a **cross-platform ride-sharing / job-finding app** that
runs on Android and iOS via **Capacitor**, and also runs in a plain
browser for fast development (`npm run dev`).

- The **UI is written in React + TypeScript**, bundled by **Vite**.
- The **native shell** (WebView, permissions, plugins) is **Capacitor**.
- The **Rust server** in `server/` powers over-the-air updates and (soon) will host the jobs API.
- **Tailwind CSS v4** provides all styling utilities.
- The app supports **live JS updates without a Play Store release** via
  the Capacitor Updater plugin — a fresh `.zip` bundle can be pushed in
  seconds.

---

## The tech stack

| Piece | What it does |
|-------|--------------|
| **React 19** | The UI library — turns your component functions into a rendered DOM tree. |
| **TypeScript** | JavaScript with types. Catches typos and wrong argument shapes at build time. |
| **Vite 8** | Bundler + dev server. Ridiculously fast HMR (hot module replacement). |
| **React Router** | Client-side routing (`/nearby`, `/device`, `/task/:id` etc). |
| **Tailwind CSS v4** | Utility-first CSS. You write `className="p-3 rounded-2xl"` instead of maintaining a stylesheet. |
| **Capacitor 8** | Bridges your web app to native Android / iOS APIs. |
| **Capacitor Community plugins** | Ready-made bridges for Geolocation, Camera, SQLite, background location, etc. |
| **@capgo/capacitor-updater** | Downloads a new JS bundle at runtime and swaps it in — no app-store review. |
| **Rust + Axum (`server/`)** | Tiny HTTP server exposing `/api/check-update`, `/bundles/*`, `/api/gps`. |

---

## The folder layout

```
src/
├── main.tsx              ← Entry point (mounts <App/> into #app)
├── App.tsx               ← Top-level shell (router + tab bar + update overlay)
├── style.css             ← Global CSS (Tailwind + safe-area helpers)
│
├── router/index.tsx      ← Route table & tab-matcher
│
├── pages/                ← One file per screen
│   ├── NearbyPage.tsx    ← Job list + radar
│   ├── LocationPage.tsx  ← GPS test & streamer
│   ├── DevicePage.tsx    ← Device info
│   ├── SettingsPage.tsx  ← Settings
│   ├── SandboxPage.tsx   ← Capacitor primitives playground
│   ├── TaskDetailPage.tsx
│   └── RideDetailPage.tsx
│
├── components/           ← Reusable presentational UI
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Input.tsx
│   ├── KeyValueRow.tsx
│   ├── PageHeader.tsx
│   ├── Section.tsx
│   ├── SettingsRow.tsx
│   ├── TabBar.tsx
│   └── UpdateOverlay.tsx
│
├── composables/          ← Custom hooks that wrap Capacitor plugins / cross-cutting logic
│   ├── useNative.ts, useDeepLinks.ts
│   ├── useCamera.ts, useDevice.ts, useLocation.ts, useHeading.ts
│   ├── useGpsStreamer.ts, useSqlite.ts, useStorage.ts
│   ├── useOta.ts, useLocalNotifications.ts
│   └── useIntents.ts
│
└── data/                 ← Pure data helpers (mock data, geo math)
    └── mockJobs.ts
```

**Rule of thumb:**
- **`pages/*`** — a top-level screen. Owns layout + local UI state.
- **`components/*`** — a reusable widget. Takes props, has no knowledge of the wider app.
- **`composables/*`** — a **custom hook**. Owns cross-cutting behaviour: talking to a plugin, keeping global-ish state, subscribing to events.
- **`data/*`** — pure TypeScript utilities, no React.

---

## How the app boots

Trace a startup step-by-step:

### 1. `index.html`
```html
<div id="app"></div>
<script type="module" src="/src/main.tsx"></script>
```
The browser (or WebView) loads `main.tsx`.

### 2. `src/main.tsx`
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './style.css';

ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
```

What each line does:
- `createRoot(...)` → attaches React to the DOM node with id `app`.
- `<React.StrictMode>` → dev-only wrapper that runs effects twice to help you catch bugs.
- `<BrowserRouter>` → gives every child access to the router (so hooks like `useNavigate` work).
- `<App />` → mounts the top-level shell.

### 3. `src/App.tsx`
```tsx
export default function App() {
  const navigate = useNavigate();
  const { startAutoUpdate } = useOta();

  useEffect(() => {
    initNative();
    initDeepLinks(navigate);
    startAutoUpdate(15_000);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <main className="flex-1 overflow-y-auto pb-tabbar">
        <AppRoutes />
      </main>
      <TabBar />
      <UpdateOverlay />
    </div>
  );
}
```
This is the **skeleton**:
- `useEffect` fires **once** on mount to bootstrap the native side.
- `<AppRoutes />` renders the current page based on the URL.
- `<TabBar />` is the sticky bottom nav.
- `<UpdateOverlay />` is a full-screen spinner that appears only while an OTA update is being applied.

### 4. Router picks a page
`AppRoutes` reads the URL and mounts the right page component from `pages/`.

---

## React fundamentals used everywhere

### JSX / TSX — HTML inside JavaScript

```tsx
return <button className="p-3 bg-primary">Hello</button>;
```
- `.tsx` = TypeScript + JSX. Vite compiles it into real JavaScript.
- Attribute names are camelCase: `className`, `onClick`, `tabIndex`.
- Curly braces embed expressions: `<div>{name.toUpperCase()}</div>`.

### Function components

Every screen and widget in this codebase is just a **function that returns JSX**:

```tsx
export default function PageHeader({ title, subtitle }: Props) {
  return (
    <header>
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </header>
  );
}
```

React calls this function whenever it needs to render or re-render. That's it — there is no class, no `render()` method, no lifecycle to memorise.

### Props — a component's inputs

Everything a parent passes to a child arrives as one object called `props`. Destructure them:

```tsx
interface Props { title: string; subtitle?: string; }

function PageHeader({ title, subtitle }: Props) { ... }
```
`subtitle?: string` means "optional". React doesn't care about types — TypeScript does. But at build time TS catches wrong shapes.

### `useState` — the "remember this value between renders" hook

```tsx
const [count, setCount] = useState(0);
```
- `count` is the current value.
- `setCount(newValue)` schedules a re-render with the new value.
- Never mutate `count` directly (`count = 5`) — that won't re-render.

Real example — `NearbyPage.tsx`:
```tsx
const [view, setView] = useState<View>('list');
const [radius, setRadius] = useState<number>(5);
```
Two independent pieces of state, both local to `NearbyPage`. Clicking a radius chip calls `setRadius(1)` → the component re-runs → the jobs list is recomputed with the new radius.

### `useEffect` — the "do something after render" hook

```tsx
useEffect(() => {
  // side-effect (fetch data, subscribe to events, etc.)
  return () => {
    // cleanup — runs when the component unmounts OR before the next effect
  };
}, [dependency1, dependency2]);
```

The **dependency array** at the end controls *when* the effect runs:
- `[]` → run **once** on mount, cleanup on unmount.
- `[radius]` → run every time `radius` changes.
- omitted → run **every render** (rarely what you want).

Real example — `useHeading.ts`:
```tsx
useEffect(() => () => detach(), []);  // detach listeners on unmount
```

Another one — `NearbyPage.tsx`:
```tsx
useEffect(() => {
  const t = setInterval(() => setTick(n => n + 1), 30_000);
  return () => clearInterval(t);
}, []);
```
The **cleanup function** (returned from inside `useEffect`) is critical whenever you subscribe to something (`setInterval`, DOM events, WebSockets) — without it you leak.

### `useMemo` — the "cache this expensive result" hook

```tsx
const jobs = useMemo(() => {
  return generateNearbyJobs(...).filter(...).sort(...);
}, [position, radius, category, tick]);
```
- The function inside runs **only when a dependency changes**.
- Otherwise React returns the previously-computed value.
- Use it when you're doing real work — filtering big arrays, math, expensive lookups.
- Do **not** wrap trivial expressions in it (`useMemo` itself has a cost).

### `useRef` — the "value that survives re-renders but doesn't cause them" hook

Two uses in this codebase:

**1. Storing a DOM node** — `SandboxPage.tsx`:
```tsx
const inputRef = useRef<HTMLInputElement | null>(null);
<input ref={inputRef} />
```
Later: `inputRef.current?.focus()`.

**2. Mutable value that's not shown in the UI** — `NearbyPage.tsx`:
```tsx
const pinchStartRef = useRef<{ dist: number; zoom: number } | null>(null);
```
Changing `.current` never re-renders. Perfect for gesture bookkeeping.

### `useCallback` — the "same function reference across renders" hook

You'll see this in composables:
```tsx
const check = useCallback(async () => { ... }, []);
```
Returns the *same* function instance across renders (unless dependencies change). Matters when passing a function to a child that's optimised with `React.memo`, or as a dep in another effect.

### Cleanup patterns you'll spot

Every hook that subscribes to something returns a cleanup:
```tsx
useEffect(() => {
  const listener = () => setTick(t => t + 1);
  listeners.add(listener);
  return () => { listeners.delete(listener); };  // ← cleanup
}, []);
```
Miss this → memory leak.

---

## Custom hooks — the "composables" pattern

Any function whose name starts with `use` and calls other hooks is a **custom hook**. In this codebase they live in `src/composables/*` (Vue-inspired naming).

### Why the pattern?

- **Encapsulation** — `useCamera()` hides the ugliness of the Camera plugin behind a clean `{ takePhoto, dataUrl, error }` API.
- **Reuse** — any component can call `useLocation()` and get the same behaviour.
- **Testability** — you can swap the implementation without touching UI.

### Anatomy of a simple composable — `useDevice.ts`

```tsx
export function useDevice() {
  const [info, setInfo] = useState<DeviceInfo | null>(null);
  const [battery, setBattery] = useState<...>();
  const [network, setNetwork] = useState<...>();

  const refresh = useCallback(async () => {
    setInfo(await Device.getInfo());
    setBattery(await Device.getBatteryInfo());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { info, battery, network, refresh };
}
```
- Manages its own state.
- Fetches once on mount.
- Exposes a `refresh()` you can call from a button.

### Anatomy of a **module-level-state** composable — `useGpsStreamer.ts`

Some state must **survive** individual component unmounts (e.g. a GPS timer that must keep pinging the server even when the user leaves the Location tab). Hooks alone can't do that — a `useState` in `LocationPage` is torn down when the tab changes.

The pattern:
```tsx
// module scope — lives for the whole app lifetime
const state = { enabled: false, sendCount: 0, ... };
const listeners = new Set<() => void>();

function setState(patch) {
  Object.assign(state, patch);
  listeners.forEach(l => l());  // notify all mounted components
}

export function useGpsStreamer() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const l = () => setTick(t => t + 1);   // force this component to re-render
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return { ...state, start, stop };
}
```

This is a **hand-rolled global store**. It's the same shape as Redux / Zustand but ~15 lines of code. When you outgrow it (3+ stores, more complex mutations) switch to Zustand.

---

## State management in this app

You don't need a library **yet**. Here's the taxonomy in use:

| State type | Where it lives | Example |
|---|---|---|
| **Local UI state** | `useState` inside a component | `selected` job in `NearbyPage` |
| **Form input state** | `useState` bound to `<input value=…>` | note body in `SandboxPage` |
| **Cross-cutting global state** | Module-level object + listeners inside a composable | `useOta`, `useGpsStreamer` |
| **Cross-boot persistence** | `localStorage`, `sessionStorage`, SQLite | GPS client-id, OTA "just applied" flag, notes |
| **URL-carried state** | React Router params / query string | `/task/:id?ref=push` |
| **Server state (future)** | TanStack Query when you add a real backend | `useJobsNearby()` |

**No Redux, no Context, no MobX** — the app is small enough that the above is plenty. Introduce a library the day it saves more code than it adds.

---

## Routing & navigation

### The route table — `src/router/index.tsx`
```tsx
const NearbyPage = lazy(() => import('../pages/NearbyPage'));

export default function AppRoutes() {
  return (
    <Suspense fallback={<div />}>
      <Routes>
        <Route path="/" element={<Navigate to="/sandbox" replace />} />
        <Route path="/nearby" element={<NearbyPage />} />
        <Route path="/location" element={<LocationPage />} />
        ...
      </Routes>
    </Suspense>
  );
}
```
Two things worth noticing:

**1. `lazy(() => import(...))`**
Splits each page into its own JS chunk. Vite only loads the page's code
when the user actually visits it → smaller initial download. `<Suspense
fallback={...}>` shows a placeholder while the chunk is being fetched.

**2. `getTabForPath(pathname)`**
Determines which tab is "active" for the current URL. This is what lets
`/task/42` still highlight the Sandbox tab.

### Navigating programmatically
Inside any component:
```tsx
const navigate = useNavigate();
<Button onClick={() => navigate('/task/42?ref=push')}>Open task</Button>
```

### Reading URL params
```tsx
const params = useParams();          // { id: '42' }
const [search] = useSearchParams();  // ?ref=push
const ref = search.get('ref');
```

---

## Styling: Tailwind + reusable components

The app uses **Tailwind CSS v4** (`src/style.css`):

```css
@import "tailwindcss";

@theme {
  --color-primary: #2563eb;
  --color-surface: #ffffff;
  ...
}
```

The `@theme` block turns your custom colours into utility classes:
`bg-primary`, `text-muted`, `border-border` etc.

### Two ways to reuse styles

**1. Reusable components** (preferred for anything with structure)
```tsx
<Button fullWidth variant="primary" onClick={...}>Save</Button>
```
The visual language lives inside `components/Button.tsx`. Change it once, updates everywhere.

**2. Class-string constants** for small local patterns
```tsx
const btnRow = 'mt-2.5 flex gap-2';
<div className={btnRow}>...</div>
```
Idiomatic React — use it *within* a component, not across the app.

### Safe-area / native-feel helpers
`style.css` adds `.pt-safe-top`, `.pb-safe-bottom`, `.pb-tabbar` for the notch / home-indicator on iOS.

---

## Talking to native code (Capacitor)

Capacitor exposes native APIs as **plugins** that you import like any npm package:

```ts
import { Geolocation } from '@capacitor/geolocation';
const pos = await Geolocation.getCurrentPosition();
```

Three things you'll bump into:

### 1. Some things only work on device
`Camera.getPhoto()` will *sort of* work in `npm run dev` (falls back to a file picker), but `Geolocation` on desktop uses the browser's GPS API which needs HTTPS and user gesture. If something behaves weirdly in dev, try it on a real phone.

### 2. Permissions have to be requested
Every plugin that touches user data has `checkPermissions()` and `requestPermissions()`. This codebase wraps them in composables:
```tsx
const { permission, requestPermission } = useLocation();
if (permission !== 'granted') await requestPermission();
```

### 3. Some plugins ship types only — use `registerPlugin`
See `useGpsStreamer.ts`:
```tsx
import { registerPlugin } from '@capacitor/core';
import type { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation';
const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');
```

---

## The OTA / hot-update pipeline

`useOta.ts` is one of the trickier pieces — worth understanding because it's how you'll ship updates without a Play Store release.

Flow:
1. On boot, `notifyAppReady()` tells native "this bundle works, don't roll back".
2. Every 15 s (started in `App.tsx`), poll `GET /api/check-update?version=X` on your server.
3. If a newer version exists, `CapacitorUpdater.download({ url })` grabs the new bundle zip.
4. `CapacitorUpdater.set({ id })` marks it as the next boot.
5. `CapacitorUpdater.reload()` restarts the WebView with the new code.
6. A system notification is scheduled for +2 s so the user sees "Update applied, restarting…".
7. On the next boot, `sessionStorage.getItem('ota:justApplied')` flag triggers a follow-up "You're now on vX" notification.

There's a **web-mode short-circuit** at the top so `npm run dev` never triggers this dance:
```ts
if (Capacitor.getPlatform() === 'web') { ... return; }
```

---

## Data flow: a full end-to-end example

Follow a single user action through the whole app.

### **User taps "🧭 Navigate" on a job card**

**1. Component tree**
```
<NearbyPage>
  ├─ <ListView jobs onSelect={setSelected} />         ← user tap here
  └─ <ActionSheet job={selected} onClose={...} />
       └─ <Button onClick={() => navigateTo(...)}>
```

**2. State transition**
```tsx
const [selected, setSelected] = useState<Job | null>(null);
<Card onClick={() => onSelect(j)}>       // sets selected = j
```

**3. React re-renders `NearbyPage`**
Because `selected` changed, the JSX now includes `<ActionSheet job={selected} />`, which mounts a slide-up modal.

**4. User taps a button inside the sheet**
```tsx
<Button onClick={() => { navigateTo(job.latitude, job.longitude); onClose(); }}>
```

**5. Custom helper fires a native intent** — `useIntents.ts`:
```tsx
export function navigateTo(lat, lon) {
  const platform = Capacitor.getPlatform();
  if (platform === 'android') {
    window.open(`google.navigation:q=${lat},${lon}&mode=d`, '_system');
  } else {
    window.open(`https://www.google.com/maps/dir/?...`, '_system');
  }
}
```
Android hands the `google.navigation:` URL to the OS, which routes it
to the installed Google Maps app → turn-by-turn navigation starts.

**6. `onClose()` sets `selected = null`** → React re-renders → the sheet unmounts. Done.

No global store, no dispatch, no reducer — just plain state changes propagating through props and event handlers.

---

## Conventions & idioms you'll see

### Destructuring with defaults
```tsx
function Button({ variant = 'default', size = 'md', className = '' }: Props) {
```

### Conditional rendering
```tsx
{position && <MyMap position={position} />}       // render only if truthy
{isLoading ? <Spinner /> : <Content />}            // if/else
```

### Rendering a list
```tsx
{jobs.map((j) => <JobCard key={j.id} job={j} />)}
```
The `key` prop tells React how to track items across re-renders. **Always
use a stable id, never the array index** when items can be reordered.

### Forwarding refs
```tsx
const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { ...props }, ref,
) { return <button ref={ref} {...props} />; });
```
Lets a parent get a handle to the underlying `<button>` DOM node.

### Union prop types
```tsx
type ButtonVariant = 'default' | 'primary' | 'danger' | 'ghost';
```
TypeScript will complain if you pass `variant="warning"`.

### `React.FC` — avoided in this codebase
Instead of `const X: React.FC<Props> = (props) => …` we use plain
`function X(props: Props)`. Cleaner, better default generics, and it's
the current React team recommendation.

### `dangerouslySetInnerHTML`
Used in `TabBar.tsx` for the SVG icons. Only safe when the HTML string
is a **compile-time constant** you fully control (as it is here).

---

## Common pitfalls

1. **Forgetting the dependency array** on `useEffect` → the effect
   re-runs every render and can loop forever if it also sets state.
2. **Mutating state directly**: `state.count++` → won't re-render. Use
   `setCount(c => c + 1)` instead.
3. **Stale closures**: `useEffect(() => { setInterval(() => tick(count), 1000) }, [])` will forever see the initial value of `count`. Fix: include `count` in the deps, or use the functional form of `setState`.
4. **Missing key on lists** → React warns, and reordering breaks.
5. **Testing native features in `npm run dev`** — geolocation and camera
   behave differently in the browser. Always verify on device.
6. **Editing native files instead of `capacitor.config.json`** — most
   config regenerates on `cap sync` and your changes get wiped.
7. **Skipping `npx cap sync` after installing a new plugin** — you'll
   see "plugin not implemented" at runtime.
8. **Blocking the UI with a huge `useMemo`** — memoisation doesn't make
   the first render faster, only subsequent ones.

---

## Where to go next

**Official learning resources (in this order):**
1. [React docs — "Learn React"](https://react.dev/learn) — the official tutorial. 2-3 hours, extremely well written.
2. [React docs — "Escape hatches"](https://react.dev/learn/escape-hatches) — refs, effects, custom hooks explained in depth.
3. [TypeScript for React](https://react-typescript-cheatsheet.netlify.app/) — quick cheat sheet for TS-specific patterns.
4. [React Router docs](https://reactrouter.com/) — deeper dive on nested routes and loaders.
5. [Tailwind CSS docs](https://tailwindcss.com/docs) — the utility reference you'll live in.

**When you eventually need bigger tools:**
- [Zustand](https://github.com/pmndrs/zustand) — the small state-management library that would fit this codebase's patterns best.
- [TanStack Query](https://tanstack.com/query/latest) — when you add a real backend and need caching / refetch / retries.
- [Testing Library + Vitest](https://testing-library.com/docs/react-testing-library/intro/) — component testing without headaches.

**Suggested tour of this repo (in reading order):**
1. `src/main.tsx` → 2. `src/App.tsx` → 3. `src/router/index.tsx`
4. `src/components/Button.tsx` (simplest reusable component)
5. `src/composables/useDevice.ts` (simplest composable)
6. `src/pages/DevicePage.tsx` (page that uses that composable)
7. `src/composables/useGpsStreamer.ts` (advanced — module-level store)
8. `src/pages/NearbyPage.tsx` (biggest page, lots of hooks working together)

---

*Written for the Task Finder codebase. Whenever a pattern is unclear,
open the referenced file — the comments there go into more depth.*
