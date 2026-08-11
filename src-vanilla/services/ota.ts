/**
 * OTA service — the only place that talks to `@capgo/capacitor-updater`
 * and the update server.
 *
 * Exposes a small, framework-agnostic API:
 *   - `startAutoUpdate(intervalMs)` / `stopAutoUpdate()`
 *   - `checkForUpdate(silent)`
 *   - `subscribe(listener)` — for the OTA overlay view.
 *   - `state` — read-only snapshot.
 *
 * Ported from `src/composables/useOta.ts` but re-shaped to be a plain
 * singleton with no React dependency.
 */

import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { http } from './http';

// Injected at build time by vite.config.js `define`.
declare const __APP_VERSION__: string;

export interface OtaState {
  isDownloading: boolean;
  isApplying: boolean;
  isCheckingManually: boolean;
  statusMessage: string;
  lastCheckAt: number | null;
  version: string;
  platform: string;
}

type Listener = (state: Readonly<OtaState>) => void;

const state: OtaState = {
  isDownloading: false,
  isApplying: false,
  isCheckingManually: false,
  statusMessage: 'Idle',
  lastCheckAt: null,
  version: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev',
  platform: Capacitor.getPlatform(),
};

const listeners = new Set<Listener>();
function emit(): void { listeners.forEach((l) => l(state)); }

function setState(patch: Partial<OtaState>): void {
  let changed = false;
  for (const k of Object.keys(patch) as (keyof OtaState)[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((state as any)[k] !== (patch as any)[k]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (state as any)[k] = (patch as any)[k];
      changed = true;
    }
  }
  if (changed) emit();
}

let lastAppliedVersion: string | null = null;
const attemptedVersions = new Set<string>();
let inFlight: Promise<void> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let appStateListener: { remove: () => void } | null = null;

// Tell native we booted successfully to prevent auto-rollback.
try { CapacitorUpdater.notifyAppReady(); } catch { /* web */ }

function getApiUrl(): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const host: string = (globalThis as any).__OTA_HOST__ || '192.168.0.4';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const port: number = (globalThis as any).__OTA_PORT__ || 3000;
  return `http://${host}:${port}`;
}

async function getCurrentVersion(): Promise<string> {
  try {
    const current = await CapacitorUpdater.current();
    const v = current?.bundle?.version;
    if (v && v !== 'builtin') return v;
  } catch { /* web / not native */ }
  return state.version;
}

async function doCheck(silent: boolean): Promise<void> {
  if (state.isDownloading || state.isApplying) return;

  if (Capacitor.getPlatform() === 'web') {
    if (state.statusMessage !== 'OTA disabled (web preview)') {
      setState({ statusMessage: 'OTA disabled (web preview)' });
    }
    return;
  }

  if (!silent) setState({ isCheckingManually: true, statusMessage: 'Checking version...' });

  try {
    const currentVersion = await getCurrentVersion();
    const data = await http.get<{
      available: boolean;
      version: string | null;
      url: string | null;
    }>(`${getApiUrl()}/api/check-update?current=${encodeURIComponent(currentVersion)}`);

    if (!data.available || !data.url || !data.version) {
      if (!silent) setState({ statusMessage: `Up to date (v${currentVersion})` });
      return;
    }
    if (attemptedVersions.has(data.version)) {
      setState({ statusMessage: `Waiting to apply v${data.version}` });
      return;
    }
    attemptedVersions.add(data.version);

    setState({ isDownloading: true, statusMessage: `Downloading v${data.version}…` });

    if (lastAppliedVersion === data.version) {
      setState({ statusMessage: `Applied v${data.version}, waiting for reload…` });
      return;
    }

    const bundle = await CapacitorUpdater.download({ url: data.url, version: data.version });
    setState({ isApplying: true, statusMessage: 'Applying update...' });
    await CapacitorUpdater.set({ id: bundle.id });
    lastAppliedVersion = data.version;

    setState({ statusMessage: 'Reloading app...' });
    try {
      await CapacitorUpdater.reload();
    } catch (e) {
      console.warn('[OTA] reload() failed; falling back to window.location.reload', e);
      window.location.reload();
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[OTA]', msg);
    if (!silent || state.isDownloading || state.isApplying) {
      setState({ statusMessage: `Error: ${msg}` });
    }
    setState({ isDownloading: false, isApplying: false });
  } finally {
    setState({ isDownloading: false, isCheckingManually: false, lastCheckAt: Date.now() });
  }
}

export const otaService = {
  get state(): Readonly<OtaState> { return state; },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    listener(state);
    return () => { listeners.delete(listener); };
  },

  async checkForUpdate(silent = false): Promise<void> {
    if (inFlight) return inFlight;
    inFlight = doCheck(silent).finally(() => { inFlight = null; });
    return inFlight;
  },

  startAutoUpdate(intervalMs = 5 * 60 * 1000): void {
    this.stopAutoUpdate();
    if (Capacitor.getPlatform() === 'web') return;

    this.checkForUpdate(true).catch(() => { /* noop */ });
    pollTimer = setInterval(() => {
      if (state.isApplying || state.isDownloading) return;
      this.checkForUpdate(true).catch(() => { /* noop */ });
    }, intervalMs);

    try {
      CapApp.addListener('appStateChange', (s: { isActive: boolean }) => {
        if (s.isActive) this.checkForUpdate(true).catch(() => { /* noop */ });
      }).then((h) => { appStateListener = h; });
    } catch { /* not native */ }
  },

  stopAutoUpdate(): void {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    if (appStateListener?.remove) { appStateListener.remove(); appStateListener = null; }
  },
};
