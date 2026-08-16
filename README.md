# Vanilla ERP Platform

A lightweight ERP platform built with a custom Vanilla JS framework and Capacitor, backed by a Rust/Axum server.

## Project Structure

- `apps/customer/` - Vanilla JS app for customers ("Find Help").
- `apps/worker/` - Vanilla JS app for workers ("Find Jobs").
- `server/` - Rust/Axum backend providing API and OTA bundles.
- `scripts/` - Native OTA bundling utilities.

## Core Framework (Vanilla JS)

Both apps use a unified, dependency-free framework located in their respective `www/js/` folders:
- `app.js`: Reactive component system, IndexedDB repository, and service layer.
- `ota.js`: Hot-update client with native Capacitor bridge.
- `version.js`: Auto-generated version metadata.

## Getting Started

1. **Install Dependencies**: `npm install`
2. **Start Server**: `npm run server`
3. **Run Native Apps**:
   - Customer: `npm run android:customer`
   - Worker: `npm run android:worker`

## OTA Updates

Releasing an update is a single command:
```bash
npm run release:ota:customer
# or
npm run release:ota:worker
```
The client apps will automatically detect, download, and apply the update on the next boot (or manual check in Settings).
