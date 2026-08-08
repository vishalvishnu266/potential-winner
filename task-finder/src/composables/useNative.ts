import { Capacitor } from '@capacitor/core';

/**
 * Initialise native plugins that need to run once at app startup.
 * Everything is wrapped in try/catch so the app still works in a plain
 * browser (during `npm run dev`) where these plugins are unavailable.
 */
export async function initNative() {
    if (!Capacitor.isNativePlatform()) return;

    try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: '#ffffff' });
        // Let our web content paint underneath the status bar so we can
        // handle safe-area insets ourselves.
        await StatusBar.setOverlaysWebView({ overlay: false });
    } catch (e) {
        console.warn('[native] StatusBar unavailable', e);
    }

    try {
        const { SplashScreen } = await import('@capacitor/splash-screen');
        await SplashScreen.hide();
    } catch (e) {
        console.warn('[native] SplashScreen unavailable', e);
    }
}

export async function hapticTap() {
    if (!Capacitor.isNativePlatform()) return;
    try {
        const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
        await Haptics.impact({ style: ImpactStyle.Light });
    } catch (_) { /* noop */ }
}
