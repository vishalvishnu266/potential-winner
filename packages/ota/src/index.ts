/**
 * @pkg/ota — OTA hot-update pipeline shared by every app in the monorepo.
 *
 * Public surface:
 *   • configureOta({ baseUrl, appName })  — call ONCE before use.
 *   • useOta()                            — React hook (state + actions).
 *   • useOtaStore                         — raw Zustand store, if needed.
 *   • UpdateOverlay                       — full-screen "applying…" modal.
 *   • otaClient                           — low-level, dependency-free client.
 *
 * The channel is determined by `appName`, which the server maps to
 * `bundles/<appName>/latest.json`.  Each app configures its own.
 */
export { configureOta } from './config';
export { otaClient } from './otaClient';
export { useOtaStore } from './otaStore';
export { useOta } from './useOta';
export { default as UpdateOverlay } from './UpdateOverlay';
export type { CheckUpdateResponse } from './otaClient';
