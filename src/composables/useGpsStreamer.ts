import { useEffect, useState } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import type {
    BackgroundGeolocationPlugin,
    Location as BgLocation,
    CallbackError as BgError,
} from '@capacitor-community/background-geolocation';

// The plugin only ships types (no JS entrypoint) — the actual bridge is
// exposed via Capacitor's registerPlugin() runtime.
const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>(
    'BackgroundGeolocation',
);

/**
 * True-background GPS streamer.
 *
 * Backed by @capacitor-community/background-geolocation, which on Android
 * spins up a foreground service (with a persistent notification) and on
 * iOS uses the standard significant-location APIs guarded by the
 * `UIBackgroundModes = location` entitlement. This means fixes keep
 * flowing to the server even when:
 *   - the screen is off,
 *   - the app is backgrounded,
 *   - or the user has swiped it away on some Android OEMs.
 *
 * State is stored at module level so the watcher survives component
 * unmount (e.g. navigating away from the Location tab).
 */

type StreamerState = {
    enabled: boolean;
    lastSentAt: number | null;
    lastLat: number | null;
    lastLon: number | null;
    lastStatus: string;
    error: string | null;
    sendCount: number;
    failCount: number;
};

const state: StreamerState = {
    enabled: false,
    lastSentAt: null,
    lastLat: null,
    lastLon: null,
    lastStatus: 'idle',
    error: null,
    sendCount: 0,
    failCount: 0,
};

const listeners = new Set<() => void>();
function emit() { listeners.forEach((l) => l()); }
function setState(patch: Partial<StreamerState>) {
    Object.assign(state, patch);
    emit();
}

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

/**
 * Target ping cadence. The plugin does not accept "every N seconds" — it
 * fires whenever the OS decides a new fix is available. We instead cache
 * the latest fix and let a JS interval POST it every N ms.  This gives us
 * a predictable server-side sample rate while still letting the OS batch
 * GPS reads for battery efficiency.
 */
const SEND_INTERVAL_MS = 5000;

// Distance filter in meters; 0 means "send every update the OS gives us".
const DISTANCE_FILTER_M = 0;

let sendTimer: any = null;
let watcherId: string | null = null;
let clientId: string | null = null;
let latestFix: BgLocation | null = null;

function getApiUrl() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const host: string = (globalThis as any).__OTA_HOST__ || '192.168.0.4';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const port: number = (globalThis as any).__OTA_PORT__ || 3000;
    return `http://${host}:${port}`;
}

function getClientId() {
    if (clientId) return clientId;
    try {
        const KEY = 'gps-streamer-client-id';
        const stored = localStorage.getItem(KEY);
        if (stored) { clientId = stored; return stored; }
        const id = `${Capacitor.getPlatform()}-${Math.random().toString(36).slice(2, 8)}`;
        localStorage.setItem(KEY, id);
        clientId = id;
        return id;
    } catch {
        return 'anonymous';
    }
}

// -----------------------------------------------------------------------------
// Network sender
// -----------------------------------------------------------------------------

async function sendLatest() {
    const fix = latestFix;
    if (!fix) {
        setState({ lastStatus: 'waiting for first fix…' });
        return;
    }
    try {
        const body = {
            latitude: fix.latitude,
            longitude: fix.longitude,
            accuracy: fix.accuracy,
            altitude: fix.altitude,
            speed: fix.speed,
            heading: fix.bearing,
            timestamp: fix.time,
            client_id: getClientId(),
        };

        const res = await fetch(`${getApiUrl()}/api/gps`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            keepalive: true,
            cache: 'no-store',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        setState({
            lastSentAt: Date.now(),
            lastLat: fix.latitude,
            lastLon: fix.longitude,
            lastStatus: 'sent',
            error: null,
            sendCount: state.sendCount + 1,
        });
    } catch (e: any) {
        setState({
            lastStatus: 'send failed',
            error: e?.message || 'send failed',
            failCount: state.failCount + 1,
        });
    }
}

// -----------------------------------------------------------------------------
// Start / stop
// -----------------------------------------------------------------------------

async function start(everyMs = SEND_INTERVAL_MS) {
    if (state.enabled) return;
    setState({
        enabled: true,
        lastStatus: 'starting native watcher…',
        error: null,
        sendCount: 0,
        failCount: 0,
    });

    try {
        watcherId = await BackgroundGeolocation.addWatcher(
            {
                // Text shown in the foreground-service notification on Android.
                backgroundMessage:
                    'Streaming your location to the server. Tap to open the app.',
                backgroundTitle: 'TaskFinder — Location active',
                requestPermissions: true,
                stale: false,
                distanceFilter: DISTANCE_FILTER_M,
            },
            (location: BgLocation | undefined, error: BgError | undefined) => {
                if (error) {
                    // NOT_AUTHORIZED means the user denied the permission dialog.
                    if (error.code === 'NOT_AUTHORIZED') {
                        BackgroundGeolocation.openSettings();
                    }
                    setState({
                        lastStatus: `watcher error: ${error.code || 'unknown'}`,
                        error: error.message || String(error),
                    });
                    return;
                }
                if (!location) return;
                latestFix = location;
                setState({
                    lastLat: location.latitude,
                    lastLon: location.longitude,
                    lastStatus: 'fix received',
                });
            },
        );
    } catch (e: any) {
        setState({
            enabled: false,
            lastStatus: 'failed to start',
            error: e?.message || 'addWatcher failed',
        });
        return;
    }

    // Kick a send immediately (in case we already have a cached fix), then
    // continue at the configured cadence.  The interval lives in JS but is
    // driven by fixes the native watcher pushes in even while the WebView
    // is otherwise idle.
    sendLatest();
    sendTimer = setInterval(sendLatest, Math.max(1000, everyMs));
}

async function stop() {
    if (sendTimer) { clearInterval(sendTimer); sendTimer = null; }
    if (watcherId) {
        try {
            await BackgroundGeolocation.removeWatcher({ id: watcherId });
        } catch { /* ignore */ }
        watcherId = null;
    }
    latestFix = null;
    setState({ enabled: false, lastStatus: 'stopped' });
}

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

export function useGpsStreamer() {
    const [, setTick] = useState(0);
    useEffect(() => {
        const l = () => setTick((t) => t + 1);
        listeners.add(l);
        return () => { listeners.delete(l); };
    }, []);

    return {
        enabled: state.enabled,
        lastSentAt: state.lastSentAt,
        lastLat: state.lastLat,
        lastLon: state.lastLon,
        lastStatus: state.lastStatus,
        error: state.error,
        sendCount: state.sendCount,
        failCount: state.failCount,
        intervalMs: SEND_INTERVAL_MS,
        start,
        stop,
        toggle: () => (state.enabled ? stop() : start()),
    };
}
