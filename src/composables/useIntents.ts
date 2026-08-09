import { Capacitor } from '@capacitor/core';

/**
 * Lightweight helpers that hand off to the phone's *native* apps via URL
 * schemes / intents. No plugin install required — we use window.open() on
 * the web (which the WebView happily forwards to the OS handler on iOS &
 * Android) with a small fallback to location.href for stubborn WebViews.
 *
 * Why this matters for a ride-sharing MVP:
 *   - `tel:`    → opens the dialer with the number pre-filled.
 *   - `geo:`    → asks Android which map app should show a pin.
 *   - `google.navigation:` → jumps *straight* into turn-by-turn Google Maps
 *     navigation (Android). On iOS we fall back to comgooglemaps:// or the
 *     Apple Maps URL scheme.
 *
 * With this you get Google-level navigation accuracy for free, and you
 * don't need to ship a map SDK, API key, or tile server yourself.
 */

function openExternal(url: string) {
    // window.open with _system is the historic Cordova/Capacitor convention;
    // modern WebViews respect the "_blank" target and hand the URL to the
    // OS. If both fail we fall back to a hard navigation.
    try {
        const w = window.open(url, '_system');
        if (w) return;
    } catch { /* fallthrough */ }
    try {
        const w = window.open(url, '_blank');
        if (w) return;
    } catch { /* fallthrough */ }
    window.location.href = url;
}

/** Open the system dialer with `phone` pre-filled. Doesn't dial automatically. */
export function callNumber(phone: string) {
    // Strip spaces & dashes; keep leading +.
    const cleaned = phone.replace(/[^\d+]/g, '');
    openExternal(`tel:${cleaned}`);
}

/** Send an SMS to `phone`, optionally with a pre-filled body. */
export function textNumber(phone: string, body?: string) {
    const cleaned = phone.replace(/[^\d+]/g, '');
    const q = body ? `?body=${encodeURIComponent(body)}` : '';
    openExternal(`sms:${cleaned}${q}`);
}

/**
 * Show a location pin. On Android this fires the `geo:` intent which the
 * user can open with Google Maps, Waze, OsmAnd… On iOS `geo:` isn't
 * supported so we open the Google Maps HTTPS URL (which iOS routes to
 * Google Maps if installed, else to Apple Maps via the browser).
 */
export function openInMap(lat: number, lon: number, label?: string) {
    const platform = Capacitor.getPlatform();
    if (platform === 'android') {
        const q = label
            ? `geo:${lat},${lon}?q=${lat},${lon}(${encodeURIComponent(label)})`
            : `geo:${lat},${lon}?q=${lat},${lon}`;
        openExternal(q);
    } else {
        // iOS / web fallback — universal Google Maps URL.
        openExternal(`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`);
    }
}

/**
 * Launch turn-by-turn navigation in Google Maps (Android) or Apple/Google
 * Maps (iOS). `mode` defaults to driving; other options: walking, bicycling, transit.
 */
export function navigateTo(
    lat: number,
    lon: number,
    opts: { mode?: 'driving' | 'walking' | 'bicycling' | 'transit'; label?: string } = {},
) {
    const mode = opts.mode ?? 'driving';
    const platform = Capacitor.getPlatform();
    if (platform === 'android') {
        // google.navigation: jumps straight into turn-by-turn.
        // Modes: d=drive w=walk b=bike l=two-wheeler
        const m = mode === 'walking' ? 'w' : mode === 'bicycling' ? 'b' : 'd';
        openExternal(`google.navigation:q=${lat},${lon}&mode=${m}`);
    } else {
        // iOS: comgooglemaps:// if Google Maps is installed; else the
        // universal HTTPS URL which will open Google Maps in the browser
        // and offer to switch to the native app.
        openExternal(
            `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=${mode}`,
        );
    }
}
