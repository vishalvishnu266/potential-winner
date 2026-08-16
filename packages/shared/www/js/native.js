/**
 * ERP Native Bridge - Capacitor wrapper
 */
class NativeService {
    static async vibrate() {
        try {
            if (window.Capacitor?.isPluginAvailable('Haptics')) {
                const { Haptics } = window.Capacitor.Plugins;
                await Haptics.vibrate();
            } else if ('vibrate' in navigator) {
                navigator.vibrate(50);
            }
        } catch (e) { console.log('Haptics unavailable', e); }
    }

    static async showToast(message) {
        try {
            if (window.Capacitor?.isPluginAvailable('Toast')) {
                const { Toast } = window.Capacitor.Plugins;
                await Toast.show({ text: message });
            } else { console.log(`[App Toast]: ${message}`); }
        } catch (e) { console.log('Toast unavailable', e); }
    }
}
window.NativeService = NativeService;
