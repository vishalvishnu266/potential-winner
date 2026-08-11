/**
 * Environment configuration.
 *
 * Three modes, chosen at build time:
 *
 *   - `mock` : no backend at all. Services return in-memory generated data.
 *              (Best for UI-only iteration; runs with `vite build` alone.)
 *   - `dev`  : hits the local Rust server on the LAN (`OTA_HOST:OTA_PORT`).
 *   - `prod` : hits the production API.
 *
 * Selection precedence:
 *   1. `?env=mock|dev|prod` in the URL hash (dev override, persisted).
 *   2. `localStorage['vanilla:env']` (persisted override).
 *   3. `__APP_ENV__` (injected by vite.config.js from `APP_ENV` env var).
 *   4. `'mock'` (safe default).
 *
 * Services import `env` and branch on `env.mode`.
 */

declare const __APP_ENV__: string | undefined;
declare const __APP_VERSION__: string | undefined;
declare const __OTA_HOST__: string | undefined;
declare const __OTA_PORT__: number | undefined;

export type EnvMode = 'mock' | 'dev' | 'prod';

function readOverride(): EnvMode | null {
  try {
    // URL override wins so you can flip modes without rebuilding.
    const hash = window.location.hash;
    const q = hash.includes('?') ? new URLSearchParams(hash.split('?')[1]) : null;
    const fromUrl = q?.get('env') as EnvMode | null;
    if (fromUrl && ['mock','dev','prod'].includes(fromUrl)) {
      localStorage.setItem('vanilla:env', fromUrl);
      return fromUrl;
    }
    const saved = localStorage.getItem('vanilla:env') as EnvMode | null;
    if (saved && ['mock','dev','prod'].includes(saved)) return saved;
  } catch { /* noop */ }
  return null;
}

const build: EnvMode =
  (typeof __APP_ENV__ === 'string' && ['mock','dev','prod'].includes(__APP_ENV__))
    ? (__APP_ENV__ as EnvMode)
    : 'mock';

export const env = {
  mode: (readOverride() ?? build) as EnvMode,
  version: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev',
  apiBaseUrl: (() => {
    // In `dev`, target the local Rust server on the LAN.
    // In `prod`, use a build-time constant (swap to your prod host later).
    // In `mock`, this is never used.
    const host = typeof __OTA_HOST__ === 'string' ? __OTA_HOST__ : '192.168.0.4';
    const port = typeof __OTA_PORT__ === 'number' ? __OTA_PORT__ : 3000;
    return {
      mock: '',
      dev:  `http://${host}:${port}`,
      prod: 'https://api.dailygig.example.com',
    };
  })(),

  isMock(): boolean { return this.mode === 'mock'; },
  isDev():  boolean { return this.mode === 'dev'; },
  isProd(): boolean { return this.mode === 'prod'; },
  baseUrl(): string { return this.apiBaseUrl[this.mode]; },

  /** Manually change env at runtime (persisted). Reloads to apply. */
  set(mode: EnvMode): void {
    try { localStorage.setItem('vanilla:env', mode); } catch { /* noop */ }
    window.location.reload();
  },
};
