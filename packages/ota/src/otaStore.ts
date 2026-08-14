/**
 * OTA store — Zustand slice holding the hot-update state machine and
 * the actions that drive it.  Actions call `otaClient` and update
 * state via `set()`.  No extra controller layer.
 *
 * Consume via the `useOta` hook, not this store directly.
 */
import { create } from 'zustand';
import type { PluginListenerHandle } from '@capacitor/core';
import { otaClient } from './otaClient';

interface OtaState {
    isDownloading: boolean;
    isApplying: boolean;
    isCheckingManually: boolean;
    statusMessage: string;
    lastCheckAt: number | null;

    bootOnce: () => void;
    check: (silent?: boolean) => Promise<void>;
    startAuto: (intervalMs?: number) => Promise<void>;
    stopAuto: () => void;
}

const attemptedVersions = new Set<string>();
let lastAppliedVersion: string | null = null;
let inFlight: Promise<void> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let appStateListener: PluginListenerHandle | null = null;
let bootHooked = false;

export const useOtaStore = create<OtaState>((set, get) => {
    async function doCheck(silent: boolean): Promise<void> {
        if (get().isDownloading || get().isApplying) return;

        if (otaClient.isWeb()) {
            if (get().statusMessage !== 'OTA disabled (web preview)') {
                set({ statusMessage: 'OTA disabled (web preview)' });
            }
            return;
        }

        if (!silent) set({ isCheckingManually: true, statusMessage: 'Checking version...' });

        try {
            const currentVersion = await otaClient.getCurrentVersion();
            const data = await otaClient.checkServer(currentVersion);
            console.log('[OTA] server responded', { current: currentVersion, ...data });

            if (!data.available || !data.url || !data.version) {
                if (!silent) set({ statusMessage: `Up to date (v${currentVersion})` });
                return;
            }

            if (attemptedVersions.has(data.version)) {
                set({ statusMessage: `Waiting to apply v${data.version}` });
                return;
            }
            attemptedVersions.add(data.version);

            set({ isDownloading: true, statusMessage: `Downloading v${data.version}…` });

            if (lastAppliedVersion === data.version) {
                set({ statusMessage: `Applied v${data.version}, waiting for reload…` });
                return;
            }

            const bundle = await otaClient.downloadBundle(data.url, data.version);

            set({ isApplying: true, statusMessage: 'Applying update...' });
            lastAppliedVersion = data.version;

            otaClient.setJustAppliedFlag(data.version);

            set({ statusMessage: 'Reloading app...' });
            await otaClient.applyBundle(bundle.id);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Update failed';
            console.error('[OTA]', err);
            if (!silent || get().isDownloading || get().isApplying) {
                set({ statusMessage: `Error: ${msg}` });
            }
            set({ isApplying: false, isDownloading: false });
        } finally {
            set({
                isDownloading: false,
                isCheckingManually: false,
                lastCheckAt: Date.now(),
            });
        }
    }

    return {
        isDownloading: false,
        isApplying: false,
        isCheckingManually: false,
        statusMessage: 'Idle',
        lastCheckAt: null,

        bootOnce: () => {
            if (bootHooked) return;
            bootHooked = true;
            otaClient.notifyReady();
            otaClient.consumeJustAppliedFlag();
        },

        check: async (silent = false) => {
            if (inFlight) return inFlight;
            inFlight = doCheck(silent).finally(() => { inFlight = null; });
            return inFlight;
        },

        startAuto: async (intervalMs = 5 * 60 * 1000) => {
            get().stopAuto();
            if (otaClient.isWeb()) return;
            get().check(true).catch(() => { /* noop */ });

            pollTimer = setInterval(() => {
                const s = get();
                if (s.isApplying || s.isDownloading) return;
                s.check(true).catch(() => { /* noop */ });
            }, intervalMs);

            appStateListener = await otaClient.onAppStateChange((isActive) => {
                if (isActive) get().check(true).catch(() => { /* noop */ });
            });
        },

        stopAuto: () => {
            if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
            if (appStateListener?.remove) { appStateListener.remove(); appStateListener = null; }
        },
    };
});
