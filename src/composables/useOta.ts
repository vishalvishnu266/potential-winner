import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { fireSystemNotification } from './useLocalNotifications';

// Injected at build time via vite.config.js `define`
declare const __APP_VERSION__: string;

/**
 * Module-level shared state, mirroring the Vue composable's behavior. We
 * publish changes to React consumers via a small subscriber list so that
 * multiple components (UpdateOverlay, SettingsPage) stay in sync from a
 * single source of truth.
 */
/**
 * OTA state split into three distinct signals so consumers can pick the
 * one they actually need without spurious spinner flashes:
 *
 *  - `isDownloading` — true while `CapacitorUpdater.download()` is running.
 *  - `isApplying`    — true while we are calling .set()/reload() on the
 *                      new bundle.  This is the phase where we DO want
 *                      to freeze the UI with the overlay.
 *  - `isCheckingManually` — true only for a check that the user
 *                      explicitly triggered (tapping the Settings row).
 *                      Silent background polls never flip this.
 *
 * The old `isUpdating` field is preserved as the OR of the first two
 * for backwards compatibility with `UpdateOverlay`.
 */
type OtaState = {
    isDownloading: boolean;
    isApplying: boolean;
    isCheckingManually: boolean;
    statusMessage: string;
    lastCheckAt: number | null;   // ms epoch; null = never
};

const state: OtaState = {
    isDownloading: false,
    isApplying: false,
    isCheckingManually: false,
    statusMessage: 'Idle',
    lastCheckAt: null,
};

const listeners = new Set<() => void>();
function emit() { listeners.forEach((l) => l()); }
/**
 * Merge a state patch AND only re-emit to subscribers when at least one
 * field actually changed.  Previously we emitted on every poll tick even
 * when the message was identical, which caused a re-render storm across
 * every screen that consumed `useOta()` — the whole app appeared to
 * "update every second".
 */
function setState(patch: Partial<OtaState>) {
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

// Guard against re-applying the same version repeatedly (each poll would
// otherwise call .set() again if we don't remember what we already applied).
let lastAppliedVersion: string | null = null;

// Versions we've already *tried* (and either applied or failed on).
// Prevents the auto-poller from hammering `download()` forever when the
// server keeps advertising the same failing version.
const attemptedVersions = new Set<string>();

// Guard against overlapping polls (auto-poll + resume listener + manual click)
let inFlight: Promise<void> | null = null;

let pollTimer: any = null;
let appStateListener: any = null;

// Tell native we booted successfully — must be called once per JS boot to
// prevent the plugin from rolling back to the previous bundle.
try { CapacitorUpdater.notifyAppReady(); } catch { /* web */ }

// If the previous JS bundle scheduled a "just-applied" notification just
// before reloading, and the new bundle boots quickly enough, sessionStorage
// lets us know we're inside a *fresh* post-update boot. Show a subtle in-app
// confirmation and clean up.
try {
    const pending = sessionStorage.getItem('ota:justApplied');
    if (pending) {
        sessionStorage.removeItem('ota:justApplied');
        // Also fire a system notification (best-effort — no-op if perms denied).
        fireSystemNotification({
            title: 'App updated',
            body: `TaskFinder is now running v${pending}.`,
        }).catch(() => { /* ignore */ });
    }
} catch { /* SSR / private-mode */ }

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
    // Don't stack checks / apply cycles.
    if (state.isDownloading || state.isApplying) return;

    // On the web (npm run dev) the @capgo/capacitor-updater plugin has no
    // native side, so download()/set()/reload() all throw. Skip the whole
    // dance so we never get stuck on the "Reloading app..." overlay.
    if (Capacitor.getPlatform() === 'web') {
        // Only set the status once — subsequent polls used to re-set the
        // same string every tick, which still forced a re-render.
        if (state.statusMessage !== 'OTA disabled (web preview)') {
            setState({ statusMessage: 'OTA disabled (web preview)' });
        }
        return;
    }

    // For an *explicit* check we surface a "Checking…" spinner.  For
    // silent background polls we do NOT — they'd otherwise cause the
    // Settings row and any other spinner-bound UI to flash every 5 min.
    if (!silent) {
        setState({ isCheckingManually: true });
    }
    if (!silent) setState({ statusMessage: 'Checking version...' });

    try {
        const currentVersion = await getCurrentVersion();

        const response = await fetch(
            `${getApiUrl()}/api/check-update?version=${encodeURIComponent(currentVersion)}`,
            { cache: 'no-store' }
        );
        if (!response.ok) throw new Error('Failed to reach update server');

        // NOTE: The server returns `{ available, version, url }`
        // (see server/src/main.rs → UpdateResponse). Previously this
        // code read `update_available`, which was always undefined →
        // no update was ever considered "available" and the flow
        // silently ended at "Up to date". Keep field names in sync
        // with the server contract.
        const data = (await response.json()) as {
            available: boolean;
            version: string | null;
            url: string | null;
        };
        console.log('[OTA] server responded', {
            current: currentVersion, ...data,
        });

        // Nothing new — for silent polls, don't spam the status
        // message either.  Only user-initiated checks flip the text.
        if (!data.available || !data.url || !data.version) {
            if (!silent) {
                setState({ statusMessage: `Up to date (v${currentVersion})` });
            }
            return;
        }

        // Already tried this version in this session — either it applied
        // and we're waiting for reload, or it errored earlier.  In either
        // case, do NOT re-download; the poll would otherwise burn CPU
        // and disk on every tick.
        if (attemptedVersions.has(data.version)) {
            setState({ statusMessage: `Waiting to apply v${data.version}` });
            return;
        }
        attemptedVersions.add(data.version);

        // An update IS available and we haven't tried it yet.  From
        // here we DO show progress — flip the download flag so the
        // overlay (isDownloading || isApplying) engages.
        setState({ isDownloading: true, statusMessage: `Downloading v${data.version}…` });

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

        // Fire a system notification confirming the update was applied.
        // We do this in two ways so at least one wins:
        //   1. Schedule a delayed OS notification (survives the reload).
        //   2. Mark sessionStorage so the freshly-booted bundle can fire
        //      an *immediate* notification on next boot.
        try { sessionStorage.setItem('ota:justApplied', data.version); } catch { /* noop */ }
        fireSystemNotification({
            title: 'Update applied',
            body: `TaskFinder updated to v${data.version}. Restarting…`,
            delaySeconds: 2,
            extra: { kind: 'ota', version: data.version },
        }).catch(() => { /* best-effort */ });

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
        // Only surface the error text if this was a user-initiated
        // check or if we already flipped the overlay — otherwise
        // network blips during silent polls would flash a scary error
        // even though nothing is happening.
        if (!silent || state.isDownloading || state.isApplying) {
            setState({ statusMessage: `Error: ${err?.message || 'Update failed'}` });
        }
        // Clear the overlay if we errored during apply — otherwise the
        // "Reloading app…" spinner is stuck forever.
        setState({ isApplying: false, isDownloading: false });
    } finally {
        // Note: on a successful reload we never reach here (WebView is gone).
        // On failure we release the locks so the user can retry.
        setState({
            isDownloading: false,
            isCheckingManually: false,
            lastCheckAt: Date.now(),
        });
    }
}

async function checkForUpdate(silent = false) {
    // De-dupe concurrent triggers (poll + resume + manual click)
    if (inFlight) return inFlight;
    inFlight = doCheck(silent).finally(() => { inFlight = null; });
    return inFlight;
}

/**
 * Start the background OTA poller.
 *
 * Design fixes for the "app updates every second" bug the user reported:
 *   1. On the *web* platform there is no native updater plugin, so
 *      polling only produces noise — skip it entirely.  Manual clicks
 *      in Settings still work.
 *   2. Default interval bumped from 15 seconds → 5 minutes.  Fifteen
 *      seconds meant users saw the status update card refreshing while
 *      trying to interact with the app.  Five minutes is plenty for OTA
 *      and matches what most production apps do.
 *   3. `attemptedVersions` (see doCheck) makes sure a repeated poll
 *      never re-downloads/re-applies the same version.
 */
function startAutoUpdate(intervalMs = 5 * 60 * 1000) {
    stopAutoUpdate();

    // Skip auto-polling in web previews — nothing meaningful can happen
    // there and it just churns state on every tick.
    if (Capacitor.getPlatform() === 'web') return;

    // Kick one off immediately (silent)
    checkForUpdate(true).catch(() => { /* noop */ });

    pollTimer = setInterval(() => {
        // Extra guard: skip polling while an apply is in flight so we
        // never get "old UI showing for a tick between reloads".
        if (state.isApplying || state.isDownloading) return;
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

    // Back-compat: `isUpdating` is now the OR of "actively downloading"
    // and "actively applying".  Silent polls no longer set it.
    const isUpdating = state.isDownloading || state.isApplying;

    return {
        checkForUpdate,
        startAutoUpdate,
        stopAutoUpdate,
        statusMessage: state.statusMessage,
        isUpdating,                                      // legacy alias
        isDownloading: state.isDownloading,
        isApplying: state.isApplying,
        isCheckingManually: state.isCheckingManually,
        lastCheckAt: state.lastCheckAt,
        platform: Capacitor.getPlatform(),
    };
}
