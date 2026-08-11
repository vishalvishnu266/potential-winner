/**
 * Native handoff helpers — no map SDK, no API key.
 *
 * openInMaps  : opens a pin in whatever maps app the OS routes `geo:` to,
 *               falling back to Google Maps web.
 * openDirections : turn-by-turn to a destination.
 * callPhone   : tel: URI — natively opens the dialler on device.
 * sendSms     : sms: URI.
 * shareLocation : opens the platform share sheet if available; else clipboard.
 */

export interface MapPoint { lat: number; lon: number; label?: string; }

function tryOpen(nativeUrl: string, webUrl?: string): void {
  const before = Date.now();
  try { window.location.href = nativeUrl; } catch { /* noop */ }
  if (webUrl) {
    setTimeout(() => {
      if (Date.now() - before < 1500 && document.visibilityState === 'visible') {
        window.open(webUrl, '_blank');
      }
    }, 1000);
  }
}

export const maps = {
  openInMaps(pt: MapPoint): void {
    const label = pt.label ? encodeURIComponent(pt.label) : '';
    const geo = `geo:${pt.lat},${pt.lon}?q=${pt.lat},${pt.lon}${label ? `(${label})` : ''}`;
    tryOpen(geo, `https://www.google.com/maps/search/?api=1&query=${pt.lat},${pt.lon}`);
  },
  openDirections(to: MapPoint): void {
    const geo = `google.navigation:q=${to.lat},${to.lon}`;
    tryOpen(geo, `https://www.google.com/maps/dir/?api=1&destination=${to.lat},${to.lon}`);
  },
  callPhone(number: string): void {
    const cleaned = number.replace(/[^\d+]/g, '');
    // `tel:` opens the dialler on Android + iOS + macOS.
    window.location.href = `tel:${cleaned}`;
  },
  sendSms(number: string, body = ''): void {
    const cleaned = number.replace(/[^\d+]/g, '');
    const sep = /android/i.test(navigator.userAgent) ? '?' : '&';
    window.location.href = `sms:${cleaned}${body ? `${sep}body=${encodeURIComponent(body)}` : ''}`;
  },
  async shareLocation(pt: MapPoint): Promise<void> {
    const url = `https://www.google.com/maps/search/?api=1&query=${pt.lat},${pt.lon}`;
    const text = `${pt.label ?? 'Location'} — ${url}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((navigator as any).share) {
      try { await (navigator as any).share({ title: pt.label ?? 'Location', text, url }); return; }
      catch { /* fall through */ }
    }
    try { await navigator.clipboard.writeText(text); } catch { /* noop */ }
  },
};
