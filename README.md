# DailyGig (TaskFinder)

A mobile-only Vue 3 + Capacitor app where users can find day-to-day tasks and
book rides near them. Ships with an **Axum-based OTA update server** so JS/CSS
changes can be pushed to the running app without a Play Store release.

- **Frontend:** Vue 3 + Vite + vue-router
- **Native shell:** Capacitor 8 (Android + iOS)
- **OTA:** `@capgo/capacitor-updater` + local Axum server
- **Bottom tab bar:** Home · Tasks · Rides · Settings (OTA lives in Settings)

---

## 1. Prerequisites

| Tool | Why |
|------|-----|
| Node.js ≥ 18 | Vite + Capacitor CLI |
| npm ≥ 9 | Package manager |
| Rust + Cargo | Axum OTA server |
| Android Studio | Emulator + APK builds |
| `adb` on PATH | Device commands (`$ANDROID_HOME/platform-tools`) |
| Xcode (Mac only) | iOS builds |

Verify everything with:

```zsh
./scripts/dev.sh doctor
```

---

## 2. First-time setup

```zsh
# Install JS deps
npm install

# Build the Vue app once so android/app/src/main/assets/public exists
npm run build

# Copy dist/ into the native Android project + install plugin sources
npx cap sync android
```

(Optional) make the helper script executable:

```zsh
chmod +x ./scripts/dev.sh
```

---

## 3. Everyday commands

### Option A — one-shot helper script (recommended)

| What you want to do | Command |
|---------------------|---------|
| Rebuild Vue + copy into Android project | `./scripts/dev.sh sync` |
| Build + install + launch on device/emulator | `./scripts/dev.sh run` |
| Push a **hot OTA update** to a running app | `./scripts/dev.sh ota` |
| Fix stuck / stale UI (uninstall + wipe OTA cache) | `./scripts/dev.sh clean` |
| Start the Axum OTA server (:3000) | `./scripts/dev.sh server` |
| Print env + device info | `./scripts/dev.sh doctor` |
| Default (safe: sync + ota, no device touched) | `./scripts/dev.sh` |

Add a shortcut to `~/.zshrc` if you like:

```zsh
alias dg='./scripts/dev.sh'
# then use: dg run, dg ota, dg clean, ...
```

### Option B — raw npm / npx commands

```zsh
# Run Vite in the browser (fast iteration, no Capacitor)
npm run dev

# Build production Vue assets into dist/
npm run build

# Preview the built dist/ locally
npm run preview

# Build a versioned OTA bundle (bundles/v<version>.zip + latest.json)
npm run bundle:ota

# Start the Axum OTA server on :3000
npm run server

# Full mobile round-trip: build → sync → launch on Android
npm run android
```

### Option C — raw Capacitor CLI

```zsh
# Copy dist/ into android/app/src/main/assets/public
npx cap copy android

# Copy assets AND update plugin sources (use after changing Capacitor plugins)
npx cap sync android

# Install & launch on the connected device/emulator
npx cap run android

# Open the native project in Android Studio
npx cap open android

# Same commands for iOS
npx cap sync ios
npx cap run ios
npx cap open ios
```

---

## 3.1 Physical phone over Wi-Fi (wireless debugging)

By default the OTA client points at **`http://192.168.0.4:3000`** — the LAN
IP of the machine running the Axum server. If your Mac has a different IP,
override it at build time:

```zsh
# Find your Mac's LAN IP
ipconfig getifaddr en0     # e.g. 192.168.1.42
# or:
./scripts/dev.sh doctor    # prints all LAN IPs

# Rebuild + push OTA with that IP
OTA_HOST=192.168.1.42 ./scripts/dev.sh sync
OTA_HOST=192.168.1.42 ./scripts/dev.sh ota

# Start the server bound to the same IP
OTA_HOST=192.168.1.42 ./scripts/dev.sh server
```

Then on the phone (over `adb` wireless debugging):

```zsh
./scripts/dev.sh clean     # uninstall old build with baked-in IP
./scripts/dev.sh run       # installs fresh APK on the phone
```

**Requirements for the phone to reach your Mac:**

- Phone and Mac must be on the **same Wi-Fi** (not guest network)
- No firewall blocking port `3000` on the Mac
  (macOS: System Settings → Network → Firewall)
- Mac's IP must be listed in `android/app/src/main/res/xml/network_security_config.xml`
  (already includes `192.168.0.4` — add yours if different)

Quick smoke test from your phone's browser:

```
http://192.168.0.4:3000/health
```

Should return `{"ok":true,...}`. If it doesn't, the phone can't reach the
server — check Wi-Fi / firewall.

---

## 4. Typical dev flow

Two terminals:

```zsh
# Terminal 1 — OTA server (leave running)
./scripts/dev.sh server
# or:  npm run server
```

```zsh
# Terminal 2 — first install on the emulator
./scripts/dev.sh run
# or:  npm run android
```

Then edit Vue code and push a hot update **without closing the app**:

```zsh
./scripts/dev.sh ota
# or:  npm run bundle:ota
```

The running app polls the server every 15 s and calls
`CapacitorUpdater.reload()` when a new bundle is found. Users see a ~200 ms
reload — no need to reopen the app.

---

## 5. OTA update flow explained

1. `npm run bundle:ota` builds `dist/` and zips it as
   `bundles/v<version>.zip`, then writes `bundles/latest.json` with the
   newest version + filename.
2. The Axum server (`server/src/main.rs`) reads `latest.json` on every
   `/api/check-update` request — **no need to restart the server after a new build**.
3. The Vue app (`src/composables/useOta.ts`):
   - Polls `/api/check-update` every 15 s while open
   - Re-checks whenever the app resumes
   - Downloads new bundles via `@capgo/capacitor-updater`
   - Hot-reloads the WebView with `CapacitorUpdater.reload()`
4. The **Settings tab** also has a manual **Check for updates** button.

---

## 6. Project layout

```
task-finder/
├─ src/
│  ├─ App.vue              # Shell with <router-view/> + <TabBar/>
│  ├─ main.js
│  ├─ style.css            # Mobile-first global styles
│  ├─ router/index.ts      # 4 tab routes
│  ├─ components/
│  │  ├─ TabBar.vue        # Bottom navigation
│  │  └─ PageHeader.vue
│  ├─ composables/
│  │  ├─ useOta.ts         # OTA polling + download + reload
│  │  └─ useNative.ts      # StatusBar / SplashScreen / Haptics
│  └─ pages/
│     ├─ HomePage.vue
│     ├─ TasksPage.vue
│     ├─ RidesPage.vue
│     └─ SettingsPage.vue  # OTA "Check for updates" lives here
├─ server/                 # Axum OTA server (Rust)
│  └─ src/main.rs
├─ scripts/
│  ├─ dev.sh               # Zsh helper (run, sync, ota, clean, server, doctor)
│  └─ build-bundle.mjs     # Versioned OTA bundle builder
├─ bundles/                # Generated OTA .zip files + latest.json
├─ android/                # Capacitor native Android project
├─ ios/                    # Capacitor native iOS project
├─ dist/                   # Vite build output
├─ capacitor.config.json
├─ vite.config.js
└─ package.json
```

---

## 7. Troubleshooting

### "I pressed ▶ in Android Studio but my Vue changes aren't showing"

Android Studio only rebuilds the APK. It does **not** rebuild Vue or copy
`dist/` into the Android project. Always run this first:

```zsh
./scripts/dev.sh sync     # or: npm run build && npx cap sync android
```

Then press ▶.

### "Old UI is still stuck even after `sync`"

A previously downloaded OTA bundle is cached inside the app. Nuke it:

```zsh
./scripts/dev.sh clean
# Then reinstall:
./scripts/dev.sh run
```

Equivalent manual steps:

```zsh
adb uninstall com.yourcompany.taskfinder
npm run build
npx cap sync android
npx cap run android
```

### Manifest merger / "permissive app" error in Android Studio

The manifest and `network_security_config.xml` were fixed to allow cleartext
HTTP to `10.0.2.2` (host machine as seen from the emulator). If you edit
`AndroidManifest.xml` again, keep every attribute **inside** the
`<application ...>` tag (before its closing `>`).

### The OTA server says "No bundles found"

Run `./scripts/dev.sh ota` (or `npm run bundle:ota`) at least once so
`bundles/latest.json` exists.

### Fresh Android Studio checkout — Gradle failing to sync

Run once from the repo root:

```zsh
npm install
npm run build
npx cap sync android
```

…then reopen the `android/` folder in Android Studio.

---

## 8. Store review notes

- OTA updates are allowed by Apple as long as they don't add features that
  weren't part of the reviewed app scope.
- The 4 tabs + native chrome (status bar, haptics, splash screen) satisfy
  Apple's "minimum functionality" and "Safari wrapper" guidelines.
- **Production** must use HTTPS. `10.0.2.2` cleartext is dev-only —
  swap `PUBLIC_BASE_URL` in `server/src/main.rs` before shipping.

---

## 9. App metadata

| Field | Value |
|-------|-------|
| App ID | `com.yourcompany.taskfinder` |
| App name | `TaskFinder` (branded `DailyGig`) |
| Web dir | `dist` |
| OTA server port | `3000` |
| Emulator host URL | `http://10.0.2.2:3000` |
