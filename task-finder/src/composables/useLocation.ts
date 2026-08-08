import { ref } from 'vue';

/**
 * GPS composable — permissions, one-shot fix, and continuous watch.
 * Falls back gracefully on the browser during `npm run dev`.
 */
export function useLocation() {
    const position = ref<GeolocationPosition['coords'] | null>(null);
    const timestamp = ref<number | null>(null);
    const error = ref<string | null>(null);
    const permission = ref<string>('unknown');
    const watching = ref(false);
    let watchId: string | null = null;

    async function checkPermission() {
        try {
            const { Geolocation } = await import('@capacitor/geolocation');
            const p = await Geolocation.checkPermissions();
            permission.value = p.location;
            return p.location;
        } catch (e: any) {
            error.value = e?.message || 'Permission check failed';
            return 'unknown';
        }
    }

    async function requestPermission() {
        try {
            const { Geolocation } = await import('@capacitor/geolocation');
            const p = await Geolocation.requestPermissions({ permissions: ['location'] });
            permission.value = p.location;
            return p.location;
        } catch (e: any) {
            error.value = e?.message || 'Permission request failed';
            return 'denied';
        }
    }

    async function getCurrent() {
        error.value = null;
        try {
            const { Geolocation } = await import('@capacitor/geolocation');
            const pos = await Geolocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 10000,
            });
            position.value = pos.coords as any;
            timestamp.value = pos.timestamp;
            return pos;
        } catch (e: any) {
            error.value = e?.message || 'Failed to get location';
            return null;
        }
    }

    async function startWatch() {
        if (watching.value) return;
        try {
            const { Geolocation } = await import('@capacitor/geolocation');
            watchId = await Geolocation.watchPosition(
                { enableHighAccuracy: true, timeout: 10000 },
                (pos, err) => {
                    if (err) { error.value = err.message; return; }
                    if (pos) {
                        position.value = pos.coords as any;
                        timestamp.value = pos.timestamp;
                    }
                }
            );
            watching.value = true;
        } catch (e: any) {
            error.value = e?.message || 'watchPosition failed';
        }
    }

    async function stopWatch() {
        if (!watchId) return;
        try {
            const { Geolocation } = await import('@capacitor/geolocation');
            await Geolocation.clearWatch({ id: watchId });
        } finally {
            watchId = null;
            watching.value = false;
        }
    }

    return {
        position, timestamp, error, permission, watching,
        checkPermission, requestPermission, getCurrent, startWatch, stopWatch,
    };
}
