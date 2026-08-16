# Task App Native (Vanilla JS)

This is a framework-free Capacitor application using Vaadin Web Components.

## Project Structure
- `www/` - The web application source.
- `www/js/app.js` - Core application logic, components, and service layer.
- `www/js/ota.js` - Dependency-free OTA update client.
- `www/js/version.js` - Version metadata (auto-generated during OTA build).
- `android/` - Capacitor Android platform.

## Local Development
1. Install dependencies at the root: `npm install`
2. Sync the native project: `npm run sync:native`
3. Run on Android: `npm run android:native`

## OTA Updates
To release a new update to the Rust server:
```bash
npm run release:ota:native
```
This will:
1. Generate a new version stamp (e.g., `1.0.0-20260816...`).
2. Update `www/js/version.js`.
3. Zip `www/` into `bundles/taskapp/v<version>.zip`.
4. Update `bundles/taskapp/latest.json`.

The Rust server serves these bundles automatically.
