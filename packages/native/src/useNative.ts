/**
 * Native plugin bootstrapping + helpers.  Web-safe: every call is gated
 * on `Capacitor.isNativePlatform()` and wrapped in try/catch.
 */
import { Capacitor } from '@capacitor/core';

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

export async function initNative() {
    if (!Capacitor.isNativePlatform()) {
        syncMetaThemeColor();
        return;
    }
    try {
        const { StatusBar } = await import('@capacitor/status-bar');
        await StatusBar.setOverlaysWebView({ overlay: false });
    } catch (e) {
        console.warn('[native] StatusBar overlay setup failed', e);
    }
    await syncStatusBar();
    try {
        const { SplashScreen } = await import('@capacitor/splash-screen');
        await SplashScreen.hide();
    } catch (e) {
        console.warn('[native] SplashScreen unavailable', e);
    }
}

// ---------------------------------------------------------------------------
// Status bar sync
// ---------------------------------------------------------------------------

export async function syncStatusBar(): Promise<void> {
    const { surface, isDark } = syncMetaThemeColor();
    if (!Capacitor.isNativePlatform()) return;
    try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
        await StatusBar.setBackgroundColor({ color: surface });
    } catch (e) {
        console.warn('[native] StatusBar sync failed', e);
    }
}

function syncMetaThemeColor(): { surface: string; isDark: boolean } {
    const styles = getComputedStyle(document.documentElement);
    const surface = (styles.getPropertyValue('--color-surface').trim() || '#ffffff');
    const isDark = resolvedIsDark();
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])');
    if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'theme-color';
        document.head.appendChild(meta);
    }
    meta.setAttribute('content', surface);
    return { surface, isDark };
}

function resolvedIsDark(): boolean {
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'dark') return true;
    if (attr === 'light') return false;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

// ---------------------------------------------------------------------------
// Haptics
// ---------------------------------------------------------------------------

export async function hapticTap() {
    if (!Capacitor.isNativePlatform()) return;
    try {
        const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
        await Haptics.impact({ style: ImpactStyle.Light });
    } catch { /* noop */ }
}
