/**
 * ERP Services - Data Sync
 */
class ERPService {
    static get serverUrl() { return window.getServerUrl(); }
    
    static async syncWithRemoteServer() {
        if (!navigator.onLine) return;
        try {
            const res = await fetch(`${this.serverUrl}/api/health`);
            if (res.ok) {
                console.log('[ERP] Server online');
                if (window.AppRouter && window.AppRouter.renderCurrentRoute) window.AppRouter.renderCurrentRoute();
            }
        } catch (err) { console.log('[ERP] Server offline'); }
    }
}
window.ERPService = ERPService;
