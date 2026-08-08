import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

// Injected at build time via vite.config.js `define`
declare const __APP_VERSION__: string;

/**
 * Module-level shared state, mirroring the Vue composable's behavior. We
 * publish changes to React consumers via a small subscriber list so that
 * multiple components (UpdateOverlay, SettingsPage) stay in sync from a
 * single source of truth.
 */
type OtaState = {
    isUpdating: boolean;
    isApplying: boolean;
    statusMessage: string;
};

const state: OtaState = {
    isUpdating: false,
    isApplying: false,
    statusMessage: 'Idle',
};

const listeners = new Set<() => void>();
function emit() { listeners.forEach((l) => l()); }
function setState(patch: Partial<OtaState>) {
    Object.assign(state, patch);
    emit();
}

// Guard against re-applying the same version repeatedly (each poll would
// otherwise call .set() again if we don't remember what we already applied).
let lastAppliedVersion: string | null = null;

// Guard against overlapping polls (auto-poll + resume listener + manual click)
let inFlight: Promise<void> | null = null;

let pollTimer: any = null;
let appStateListener: any = null;

// Tell native we booted successfully — must be called once per JS boot to
// prevent the plugin from rolling back to the previous bundle.
try { CapacitorUpdater.notifyAppReady(); } catch { /* web */ }

function getApiUrl() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const host: string = (globalThis as any).__OTA_HOST__ || '192.168.0.4';
    const port: number = (globalThis as any).__OTA_PORT__ || 3000;
    return `http://${host}:${port}`;
}

async function getCurrentVersion(): Promise<string> {
    try {
        const current = await CapacitorUpdater.current();
        const v = current?.bundle?.version;
        if (v && v !== 'builtin') return v;
    } catch { /* web / not native */ }
    return __APP_VERSION__;
}

async function doCheck(silent: boolean): Promise<void> {
    if (state.isUpdating || state.isApplying) return;
    setState({ isUpdating: true });
    if (!silent) setState({ statusMessage: 'Checking version...' });

    try {
        const currentVersion = await getCurrentVersion();

        const response = await fetch(
            `${getApiUrl()}/api/check-update?version=${encodeURIComponent(currentVersion)}`,
            { cache: 'no-store' }
        );
        if (!response.ok) throw new Error('Failed to reach update server');

        const data = (await response.json()) as {
            update_available: boolean;
            version: string;
            url?: string;
        };

        // Nothing new
        if (!data.update_available || !data.url) {
            setState({ statusMessage: `Up to date (v${currentVersion})` });
            return;
        }

        // Already applied this version in a previous poll — reload was likely
        // pending. Do NOT re-download or re-set.
        if (lastAppliedVersion === data.version) {
            setState({ statusMessage: `Applied v${data.version}, waiting for reload…` });
            return;
        }

        setState({ statusMessage: `Downloading v${data.version}...` });
        const bundle = await CapacitorUpdater.download({
            url: data.url,
            version: data.version,
        });

        // From this moment we must not run another check / apply.
        setState({ isApplying: true, statusMessage: 'Applying update...' });
        await CapacitorUpdater.set({ id: bundle.id });
        lastAppliedVersion = data.version;

        // Give the WebView one clean reload. On native this replaces the
        // running bundle; on web we fall back to a manual reload.
        setState({ statusMessage: 'Reloading app...' });
        try {
            await CapacitorUpdater.reload();
            // reload() returns — but the WebView is being torn down; anything
            // after this line may not run. That's fine.
        } catch (e) {
            // Native reload failed for some reason → force a full page reload
            // ourselves so the new bundle actually takes effect.
            console.warn('[OTA] CapacitorUpdater.reload() failed, falling back', e);
            window.location.reload();
        }
    } catch (err: any) {
        console.error('[OTA]', err);
        setState({ statusMessage: `Error: ${err?.message || 'Update failed'}` });
    } finally {
        // Note: on a successful reload we never reach here (WebView is gone).
        // On failure we release the lock so the user can retry.
        setState({ isUpdating: false });
    }
}

async function checkForUpdate(silent = false) {
    // De-dupe concurrent triggers (poll + resume + manual click)
    if (inFlight) return inFlight;
    inFlight = doCheck(silent).finally(() => { inFlight = null; });
    return inFlight;
}

function startAutoUpdate(intervalMs = 15000) {
    stopAutoUpdate();

    // Kick one off immediately (silent)
    checkForUpdate(true).catch(() => { /* noop */ });

    pollTimer = setInterval(() => {
        // Extra guard: skip polling while an apply is in flight so we
        // never get "old UI showing for a tick between reloads".
        if (state.isApplying || state.isUpdating) return;
        checkForUpdate(true).catch(() => { /* noop */ });
    }, intervalMs);

    // Re-check when the app returns to the foreground
    try {
        CapApp.addListener('appStateChange', (s: { isActive: boolean }) => {
            if (s.isActive) checkForUpdate(true).catch(() => { /* noop */ });
        }).then((h) => { appStateListener = h; });
    } catch { /* not native */ }
}

function stopAutoUpdate() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    if (appStateListener?.remove) { appStateListener.remove(); appStateListener = null; }
}

export function useOta() {
    // Force re-render whenever module-level state changes.
    const [, setTick] = useState(0);
    useEffect(() => {
        const l = () => setTick((t) => t + 1);
        listeners.add(l);
        return () => { listeners.delete(l); };
    }, []);

    return {
        checkForUpdate,
        startAutoUpdate,
        stopAutoUpdate,
        statusMessage: state.statusMessage,
        isUpdating: state.isUpdating,
        isApplying: state.isApplying,
        platform: Capacitor.getPlatform(),
    };
}
