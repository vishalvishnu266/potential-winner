# MobileApp — Capacitor + Go/WASM

A mobile application built with **Go compiled to WebAssembly** using
[`go-app` v11](https://github.com/maxence-charriere/go-app) and packaged for
iOS / Android through **[Capacitor](https://capacitorjs.com)**.

## ✨ Features

- ⚡ Go/WASM front-end powered by `go-app/v11`
- 🎨 Design-token driven **light & dark theme** (pure CSS)
- 🌍 Built-in **i18n** with an interface-based Translator (EN / FR / ES)
- 🧱 **Layout primitives** — `Row`, `Column`, `Grid`, `RowRatio`,
  `ColumnRatio`, `Spacer`, `Center`, `Padded`, `Stack`
- 🧩 Consistent **UI components** — `Button`, `Card`, `Text`, `Input`,
  `Select`, `Divider`, `Badge`, `AppBar`
- 📱 Capacitor safe-area & mobile-friendly viewport out of the box

## 📁 Project layout

```
.
├── main.go                         # Server + WASM entry
├── go.mod
├── internal/
│   ├── theme/                      # Light/Dark theme manager (Theme interface)
│   ├── i18n/                       # Localisation (Translator interface)
│   ├── components/
│   │   ├── layout/                 # Row/Column/Grid/Ratio primitives
│   │   └── ui/                     # Button, Card, Text, Input, Select…
│   └── pages/
│       ├── shell.go                # Common navigation shell
│       ├── home.go
│       ├── about.go
│       └── settings.go
├── web/
│   ├── index.html                  # Capacitor entry HTML
│   └── css/
│       ├── theme.css               # Design tokens (light + dark)
│       ├── base.css                # Reset + app shell
│       ├── layout.css              # Layout primitive classes
│       └── components.css          # Component styling
├── scripts/
│   ├── copy-runtime.js             # Copies wasm_exec.js from GOROOT
│   └── copy-static.js              # Assembles ./dist for Capacitor
├── capacitor.config.json
├── package.json
└── README.md
```

## 🚀 Getting started

> You mentioned you don't have Go installed locally — the scripts below
> assume Go **1.21+** is available on the machine where the build runs
> (e.g. CI). Everything else (Capacitor / Node) can stay on your side.

### 1. Install JS dependencies

```bash
npm install
```

### 2. Build the WASM bundle + copy assets

```bash
# macOS / Linux
npm run build

# Windows (PowerShell)
npm run build:win
```

This produces `./dist/` containing:

- `index.html`
- `app.wasm`
- `wasm_exec.js` (copied from `$(go env GOROOT)`)
- `web/css/…`

### 3. Add native platforms & sync

```bash
npx cap add android
npx cap add ios
npm run sync
```

### 4. Run on device / simulator

```bash
npm run run:android     # opens Android Studio
npm run run:ios         # opens Xcode (macOS only)
```

## 🧪 Local browser preview

If Go is available you can also serve the app straight from `main.go`:

```bash
go run .
# → http://localhost:8000
```

## 🎨 Theming

Themes are toggled by setting `data-theme="light|dark"` on the `<html>`
element. All colour, spacing and typography tokens live in
`web/css/theme.css` as CSS custom properties. Add a new theme by
extending that file with `[data-theme="my-theme"] { … }`.

```go
theme.Default.Set(theme.ModeDark)  // programmatic switch
theme.Default.Toggle()             // cycle Light → Dark → System
```

## 🌍 Localisation

`internal/i18n` exposes a `Translator` interface. Add a new locale by
registering a bundle in `i18n.newRegistry()`:

```go
r.bundles[i18n.LocaleDE] = bundle{
    "home.welcome": "Willkommen bei MobileApp",
    // …
}
```

Then anywhere in the UI:

```go
ui.NewText(i18n.T("home.welcome"))
```

## 🧱 Layout primitives

```go
layout.NewRow().Gap(3).Align(layout.AlignCenter).Body(
    ui.NewText("Left"),
    layout.Spacer(),
    ui.NewText("Right"),
)

layout.NewGrid(3).Gap(2).Body( /* nine cards */ )

layout.NewRowRatio().Gap(2).Body(
    layout.R(1, ui.Card1),
    layout.R(3, ui.Card2),   // takes 3× the width of Card1
)
```

## 📝 Notes

- Replace `github.com/yourorg/mobileapp` in `go.mod` and all imports
  with your actual module path.
- `wasm_exec.js` **must** match the version of the Go SDK that built
  `app.wasm`. `scripts/copy-runtime.js` handles this automatically.
- Capacitor's `webDir` is `dist/`, so anything the app needs at runtime
  must be inside that folder after `npm run build`.
