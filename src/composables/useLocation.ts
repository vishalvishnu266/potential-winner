import { useCallback, useRef, useState } from 'react';

/**
 * GPS hook — permissions, one-shot fix, and continuous watch.
 * Falls back gracefully on the browser during `npm run dev`.
 */
export function useLocation() {
    const [position, setPosition] = useState<GeolocationCoordinates | null>(null);
    const [timestamp, setTimestamp] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [permission, setPermission] = useState<string>('unknown');
    const [watching, setWatching] = useState(false);
    // `busy` = we are actively trying to get a GPS fix.  Consumers use this
    // to render a loading state instead of the "Share location" gate on
    // first load — otherwise the gate flashes for a beat, then disappears
    // once the fix resolves (the bug the user reported).
    const [busy, setBusy] = useState(false);
    const watchIdRef = useRef<string | null>(null);

    const checkPermission = useCallback(async () => {
        try {
            const { Geolocation } = await import('@capacitor/geolocation');
            const p = await Geolocation.checkPermissions();
            setPermission(p.location);
            return p.location;
        } catch (e: any) {
            setError(e?.message || 'Permission check failed');
            return 'unknown';
        }
    }, []);

    const requestPermission = useCallback(async () => {
        try {
            const { Geolocation } = await import('@capacitor/geolocation');
            const p = await Geolocation.requestPermissions({ permissions: ['location'] });
            setPermission(p.location);
            return p.location;
        } catch (e: any) {
            setError(e?.message || 'Permission request failed');
            return 'denied';
        }
    }, []);

    const getCurrent = useCallback(async () => {
        setError(null);
        setBusy(true);
        try {
            const { Geolocation } = await import('@capacitor/geolocation');
            const pos = await Geolocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 10000,
            });
            setPosition(pos.coords as any);
            setTimestamp(pos.timestamp);
            return pos;
        } catch (e: any) {
            setError(e?.message || 'Failed to get location');
            return null;
        } finally {
            setBusy(false);
        }
    }, []);

    const startWatch = useCallback(async () => {
        if (watchIdRef.current) return;
        try {
            const { Geolocation } = await import('@capacitor/geolocation');
            const id = await Geolocation.watchPosition(
                { enableHighAccuracy: true, timeout: 10000 },
                (pos, err) => {
                    if (err) { setError(err.message); return; }
                    if (pos) {
                        setPosition(pos.coords as any);
                        setTimestamp(pos.timestamp);
                    }
                }
            );
            watchIdRef.current = id;
            setWatching(true);
        } catch (e: any) {
            setError(e?.message || 'watchPosition failed');
        }
    }, []);

    const stopWatch = useCallback(async () => {
        if (!watchIdRef.current) return;
        try {
            const { Geolocation } = await import('@capacitor/geolocation');
            await Geolocation.clearWatch({ id: watchIdRef.current });
        } finally {
            watchIdRef.current = null;
            setWatching(false);
        }
    }, []);

    return {
        position, timestamp, error, permission, watching, busy,
        checkPermission, requestPermission, getCurrent, startWatch, stopWatch,
    };
}
