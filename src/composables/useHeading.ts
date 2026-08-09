import { useEffect, useRef, useState } from 'react';

/**
 * Device heading (compass) composable.
 *
 * Uses the DOM `deviceorientation` / `deviceorientationabsolute` events —
 * these are available in the Android WebView and iOS Safari without any
 * Capacitor plugin. Values are normalised to 0–360° where 0° = north.
 *
 * Platform notes:
 *   - Android WebView: `deviceorientationabsolute` gives an absolute
 *     compass heading. `event.alpha` on that channel = 360 - compass.
 *   - iOS Safari: no absolute event; instead we get `event.webkitCompassHeading`
 *     on the plain `deviceorientation` channel, which already equals the
 *     compass heading. iOS 13+ also requires `DeviceOrientationEvent.requestPermission()`
 *     to be called from a user gesture before events start firing.
 *   - Web preview (`npm run dev` on desktop): the events never fire. The
 *     hook stays in `permission: 'unavailable'` and heading = null — UI
 *     code should just not rotate anything.
 */

type HeadingPermission = 'granted' | 'denied' | 'prompt' | 'unavailable';

export function useHeading(smoothing = 0.2) {
    const [heading, setHeading] = useState<number | null>(null);
    const [permission, setPermission] = useState<HeadingPermission>('prompt');
    const [error, setError] = useState<string | null>(null);
    const smoothedRef = useRef<number | null>(null);

    // Feature-detect once at mount.
    useEffect(() => {
        if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
            setPermission('unavailable');
        }
    }, []);

    // Circular exponential smoothing so 358° → 2° doesn't wrap through 180°.
    function smooth(next: number): number {
        const prev = smoothedRef.current;
        if (prev == null) { smoothedRef.current = next; return next; }
        let delta = ((next - prev + 540) % 360) - 180;
        const out = (prev + delta * smoothing + 360) % 360;
        smoothedRef.current = out;
        return out;
    }

    function handleAbsolute(e: DeviceOrientationEvent) {
        if (e.alpha == null) return;
        // On the `absolute` channel, compass heading = 360 - alpha (in degrees).
        const compass = (360 - e.alpha) % 360;
        setHeading(smooth(compass));
    }

    function handleRelative(e: DeviceOrientationEvent) {
        // iOS: webkitCompassHeading is *already* the compass heading.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const webkit = (e as any).webkitCompassHeading as number | undefined;
        if (typeof webkit === 'number' && !Number.isNaN(webkit)) {
            setHeading(smooth(webkit));
            return;
        }
        // Some Androids only expose the relative channel — treat alpha as a
        // best-effort compass (may drift, but better than nothing).
        if (e.alpha != null) setHeading(smooth((360 - e.alpha) % 360));
    }

    function attach() {
        window.addEventListener('deviceorientationabsolute', handleAbsolute as EventListener, true);
        window.addEventListener('deviceorientation', handleRelative, true);
    }
    function detach() {
        window.removeEventListener('deviceorientationabsolute', handleAbsolute as EventListener, true);
        window.removeEventListener('deviceorientation', handleRelative, true);
    }

    /** Call this from a user gesture (button click) to satisfy iOS 13+. */
    async function request() {
        setError(null);
        if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
            setPermission('unavailable');
            return 'unavailable' as const;
        }
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const D = DeviceOrientationEvent as any;
            if (typeof D.requestPermission === 'function') {
                const res: PermissionState | 'granted' | 'denied' = await D.requestPermission();
                if (res === 'granted') {
                    attach();
                    setPermission('granted');
                    return 'granted' as const;
                }
                setPermission('denied');
                return 'denied' as const;
            }
            // Android / desktop: no permission model — just start listening.
            attach();
            setPermission('granted');
            return 'granted' as const;
        } catch (e: any) {
            setError(e?.message || 'permission request failed');
            setPermission('denied');
            return 'denied' as const;
        }
    }

    // Auto-attach on non-iOS where no permission is required. If iOS blocks
    // it, the caller should offer a button that invokes `request()`.
    useEffect(() => {
        if (permission !== 'prompt') return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const D = (typeof window !== 'undefined' ? (DeviceOrientationEvent as any) : null);
        if (D && typeof D.requestPermission !== 'function') {
            attach();
            setPermission('granted');
            return () => detach();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [permission]);

    // Clean up on unmount regardless of how we attached.
    useEffect(() => () => detach(), []);

    return { heading, permission, error, request };
}
