/**
 * OTA client for Vanilla JS SPA.
 * Handles update checks, downloads, and reloads via CapacitorUpdater.
 */
(function() {
    const attemptedVersions = new Set();
    let isApplying = false;

    const otaClient = {
        async getCurrentVersion() {
            try {
                if (window.Capacitor?.isPluginAvailable('CapacitorUpdater')) {
                    const { CapacitorUpdater } = window.Capacitor.Plugins;
                    const current = await CapacitorUpdater.current();
                    const v = current?.bundle?.version;
                    if (v && v !== 'builtin') return v;
                }
            } catch (e) { console.warn('[OTA] Failed to get native version', e); }
            return window.APP_VERSION || '0.0.0';
        },

        async check(silent = true) {
            if (isApplying) return;
            if (window.Capacitor?.getPlatform() === 'web') {
                if (!silent) NativeService.showToast('OTA not available on web');
                return;
            }

            try {
                const current = await this.getCurrentVersion();
                const app = window.APP_NAME || 'taskapp';
                const url = `${window.SERVER_URL}/api/check-update?app=${app}&current=${current}`;

                const res = await fetch(url);
                const data = await res.json();

                if (!data.available || !data.url || !data.version) {
                    if (!silent) NativeService.showToast(`Up to date (v${current})`);
                    return;
                }

                if (attemptedVersions.has(data.version)) return;
                attemptedVersions.add(data.version);

                console.log(`[OTA] New version available: ${data.version}`);
                await this.applyUpdate(data.url, data.version);
            } catch (err) {
                console.error('[OTA] Check failed', err);
                if (!silent) NativeService.showToast('Update check failed');
            }
        },

        async applyUpdate(url, version) {
            isApplying = true;
            this.showOverlay(`Downloading v${version}...`);

            try {
                const { CapacitorUpdater } = window.Capacitor.Plugins;
                const bundle = await CapacitorUpdater.download({ url, version });
                
                this.showOverlay('Applying update...');
                await CapacitorUpdater.set({ id: bundle.id });
                
                this.showOverlay('Reloading...');
                await CapacitorUpdater.reload();
            } catch (err) {
                console.error('[OTA] Update failed', err);
                NativeService.showToast('Update failed');
                this.hideOverlay();
                isApplying = false;
            }
        },

        showOverlay(message) {
            let root = document.getElementById('ota-overlay-root');
            if (!root) return;
            root.innerHTML = `
                <div style="position:fixed; inset:0; z-index:9999; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.6); backdrop-filter:blur(4px); font-family:system-ui, sans-serif;">
                    <div style="background:white; padding:2rem; border-radius:1rem; text-align:center; box-shadow:0 10px 25px rgba(0,0,0,0.2); min-width:200px;">
                        <div style="width:2rem; height:2rem; border:3px solid #eee; border-top-color:var(--primary, #0066cc); border-radius:50%; animation:ota-spin 1s linear infinite; margin:0 auto 1rem;"></div>
                        <div style="font-weight:bold; color:#222;">${message}</div>
                        <div style="font-size:0.8rem; color:#666; margin-top:0.5rem;">Do not close the app</div>
                    </div>
                </div>
                <style>
                    @keyframes ota-spin { to { transform: rotate(360deg); } }
                </style>
            `;
        },

        hideOverlay() {
            let root = document.getElementById('ota-overlay-root');
            if (root) root.innerHTML = '';
        },

        init() {
            if (!window.Capacitor) return;
            
            // Notify native side that JS boot succeeded (prevents rollback)
            try {
                if (window.Capacitor.isPluginAvailable('CapacitorUpdater')) {
                    window.Capacitor.Plugins.CapacitorUpdater.notifyAppReady();
                }
            } catch(e) {}

            // Initial check
            setTimeout(() => this.check(true), 2000);

            // Check on resume
            if (window.Capacitor.isPluginAvailable('App')) {
                window.Capacitor.Plugins.App.addListener('appStateChange', ({ isActive }) => {
                    if (isActive) this.check(true);
                });
            }
        }
    };

    window.otaClient = otaClient;
    window.addEventListener('DOMContentLoaded', () => otaClient.init());
})();
