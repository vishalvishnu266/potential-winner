import { useCallback, useEffect, useState } from 'react';
import { LocalNotifications, type PermissionStatus } from '@capacitor/local-notifications';

/**
 * Framework-agnostic helper — usable from any module (composables, event
 * handlers, background tasks) without pulling in React state.
 *
 * Silently no-ops if the plugin is unavailable (web build) or the user
 * hasn't granted permission. `delaySeconds` accepts values ≥ 0 — 0 means
 * "as soon as possible" and internally schedules for now + 1s (the plugin
 * requires a future `at` timestamp on Android).
 */
export async function fireSystemNotification(opts: {
    title: string;
    body: string;
    delaySeconds?: number;
    id?: number;
    /** Extra data forwarded to the tap handler. */
    extra?: Record<string, unknown>;
}): Promise<number | null> {
    try {
        // Make sure permission is granted; skip silently otherwise.
        const status = await LocalNotifications.checkPermissions();
        if (status.display !== 'granted') {
            const req = await LocalNotifications.requestPermissions();
            if (req.display !== 'granted') return null;
        }

        // Ensure the default channel exists on Android (no-op elsewhere).
        try {
            await LocalNotifications.createChannel?.({
                id: 'default',
                name: 'General',
                description: 'General app notifications',
                importance: 4,
                visibility: 1,
            });
        } catch { /* ignore */ }

        const id = opts.id ?? Math.floor(Math.random() * 2_147_483_000) + 1;
        const delay = Math.max(0, opts.delaySeconds ?? 0);
        const at = new Date(Date.now() + (delay > 0 ? delay : 1) * 1000);

        await LocalNotifications.schedule({
            notifications: [
                {
                    id,
                    title: opts.title,
                    body: opts.body,
                    schedule: { at, allowWhileIdle: true },
                    smallIcon: 'ic_launcher_foreground',
                    channelId: 'default',
                    extra: opts.extra,
                },
            ],
        });
        return id;
    } catch {
        return null;
    }
}

/**
 * Local (system) notifications composable.
 *
 * Wraps @capacitor/local-notifications so a button click can:
 *   1. check + request the OS permission (Android 13+ requires POST_NOTIFICATIONS
 *      to be granted at runtime — before that it was implicitly granted),
 *   2. schedule a one-off notification that pops up in the system tray.
 *
 * On Android the notification will appear even when the app is backgrounded
 * or the screen is off — the OS renders it, not our WebView.
 */
export function useLocalNotifications() {
    const [permission, setPermission] = useState<PermissionStatus['display']>('prompt');
    const [lastId, setLastId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const check = useCallback(async () => {
        try {
            const res = await LocalNotifications.checkPermissions();
            setPermission(res.display);
            return res.display;
        } catch (e: any) {
            setError(e?.message || 'checkPermissions failed');
            return 'prompt' as const;
        }
    }, []);

    const request = useCallback(async () => {
        try {
            const res = await LocalNotifications.requestPermissions();
            setPermission(res.display);
            return res.display;
        } catch (e: any) {
            setError(e?.message || 'requestPermissions failed');
            return 'prompt' as const;
        }
    }, []);

    const notify = useCallback(async (opts?: {
        title?: string;
        body?: string;
        /** Delay in seconds; default 0 → fires "immediately" (~1 s). */
        delaySeconds?: number;
    }) => {
        setError(null);

        // Ensure permission first (idempotent).
        let display = permission;
        if (display !== 'granted') display = await request();
        if (display !== 'granted') {
            setError('notification permission not granted');
            return null;
        }

        const id = Math.floor(Math.random() * 2_147_483_000) + 1;
        const delay = Math.max(0, opts?.delaySeconds ?? 0);
        // The plugin requires an "at" Date in the future for scheduling.
        // Use +1s for immediate delivery so Android's scheduler accepts it.
        const at = new Date(Date.now() + (delay > 0 ? delay : 1) * 1000);

        try {
            await LocalNotifications.schedule({
                notifications: [
                    {
                        id,
                        title: opts?.title ?? 'Hello from TaskFinder',
                        body: opts?.body ?? `Fired at ${new Date().toLocaleTimeString()}`,
                        schedule: { at },
                        smallIcon: 'ic_launcher_foreground',
                        // Group under one channel so the OS treats them consistently.
                        channelId: 'default',
                    },
                ],
            });
            setLastId(id);
            return id;
        } catch (e: any) {
            setError(e?.message || 'schedule failed');
            return null;
        }
    }, [permission, request]);

    useEffect(() => {
        // Best-effort: create a default channel on Android so the notification
        // actually shows on newer OS versions.  Failures are silent — iOS
        // simply doesn't support channels.
        LocalNotifications.createChannel?.({
            id: 'default',
            name: 'General',
            description: 'General app notifications',
            importance: 4, // IMPORTANCE_HIGH — shows a heads-up banner
            visibility: 1,
        }).catch(() => { /* no-op on iOS / older Android */ });
        check();
    }, [check]);

    return { permission, lastId, error, check, request, notify };
}
