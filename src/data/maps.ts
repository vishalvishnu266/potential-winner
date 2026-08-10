/**
 * "Open in maps" helpers.
 *
 * We avoid bundling a map library entirely.  Instead we hand off to
 * whatever navigation app the user already has installed:
 *
 * - `geo:` URI is the Android/iOS universal scheme.  Google Maps,
 *   OsmAnd, Waze, Maps.me, HERE WeGo etc. all register for it.
 * - If the user has *no* app registered (rare) we fall back to
 *   `https://www.google.com/maps/...` which opens in the browser.
 *
 * No API key, no network call, no dependency.
 */

export interface MapPoint {
    lat: number;
    lon: number;
    label?: string;
}

/** Open a single pin in whatever maps app the OS routes it to. */
export function openInMaps(pt: MapPoint) {
    const label = pt.label ? encodeURIComponent(pt.label) : '';
    const geo = `geo:${pt.lat},${pt.lon}?q=${pt.lat},${pt.lon}${label ? `(${label})` : ''}`;
    tryOpen(geo, `https://www.google.com/maps/search/?api=1&query=${pt.lat},${pt.lon}`);
}

/** Turn-by-turn directions from the user's current location to `to`. */
export function openDirections(to: MapPoint) {
    const geo = `google.navigation:q=${to.lat},${to.lon}`;
    tryOpen(geo, `https://www.google.com/maps/dir/?api=1&destination=${to.lat},${to.lon}`);
}

/**
 * First try the native scheme; if the browser reports the tab is still
 * visible after a short delay (i.e. no app was launched), fall back to
 * the https URL in a new tab.
 */
function tryOpen(nativeUrl: string, webUrl: string) {
    // On Capacitor / Android WebView, assigning location.href is enough —
    // the OS intent picker takes over.
    const before = Date.now();
    try {
        window.location.href = nativeUrl;
    } catch { /* ignored */ }

    setTimeout(() => {
        // If we're still here after 1s AND the page is visible, the geo:
        // handler didn't fire — open the web fallback.
        if (Date.now() - before < 1500 && document.visibilityState === 'visible') {
            window.open(webUrl, '_blank');
        }
    }, 1000);
}
