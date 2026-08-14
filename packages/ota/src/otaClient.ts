/**
 * OTA client — thin wrapper around the OTA HTTP call + Capacitor plugin.
 *
 * The HTTP piece delegates to the generated `api.checkUpdate({...})`
 * from `@pkg/api-contracts`, so any change to the Rust `check_update`
 * handler flows through immediately (typed, mocked, and hittable in
 * one place).
 *
 * The only module that talks to `@capgo/capacitor-updater`,
 * `@capacitor/app`, and `sessionStorage`.  React-free so it can be
 * reused from any hook, effect, or plain script.
 */

import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { api, type CheckUpdateResponse } from '@pkg/api-contracts';
import { getOtaConfig } from './config';

export type { CheckUpdateResponse };

export const otaClient = {
    platform(): string {
        return Capacitor.getPlatform();
    },

    isWeb(): boolean {
        return Capacitor.getPlatform() === 'web';
    },

    /** Fetch the running bundle version (native) or fall back to build version. */
    async getCurrentVersion(): Promise<string> {
        try {
            const current = await CapacitorUpdater.current();
            const v = current?.bundle?.version;
            if (v && v !== 'builtin') return v;
        } catch { /* web / not native */ }
        return getOtaConfig().buildVersion ?? '0.0.0';
    },

    /** Ask the server (via the generated client) whether a newer bundle is available. */
    async checkServer(currentVersion: string): Promise<CheckUpdateResponse> {
        const { appName } = getOtaConfig();
        return api.checkUpdate({
            query: { current: currentVersion, app: appName },
        });
    },

    /** Download a bundle. Returns the bundle descriptor for `applyBundle`. */
    async downloadBundle(url: string, version: string) {
        return CapacitorUpdater.download({ url, version });
    },

    /** Swap the running bundle and reload the WebView. */
    async applyBundle(bundleId: string): Promise<void> {
        await CapacitorUpdater.set({ id: bundleId });
        try {
            await CapacitorUpdater.reload();
        } catch (e) {
            console.warn('[OTA] CapacitorUpdater.reload() failed, falling back', e);
            window.location.reload();
        }
    },

    /** Notify the native side that this JS boot succeeded (prevents rollback). */
    notifyReady(): void {
        try { CapacitorUpdater.notifyAppReady(); } catch { /* web */ }
    },

    /** Subscribe to app foreground/background transitions. Native only. */
    async onAppStateChange(cb: (isActive: boolean) => void): Promise<PluginListenerHandle | null> {
        try {
            return await CapApp.addListener('appStateChange', (s) => cb(s.isActive));
        } catch {
            return null;
        }
    },

    // --- sessionStorage helpers (kept here so no other layer touches the DOM) ---

    setJustAppliedFlag(version: string): void {
        try { sessionStorage.setItem('ota:justApplied', version); } catch { /* noop */ }
    },
    consumeJustAppliedFlag(): string | null {
        try {
            const v = sessionStorage.getItem('ota:justApplied');
            if (v) sessionStorage.removeItem('ota:justApplied');
            return v;
        } catch {
            return null;
        }
    },
};
