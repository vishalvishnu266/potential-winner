import { useEffect, useRef, useState } from 'react';
import { api } from '../data/api';
import { useLocation } from './useLocation';

/**
 * Sends a `POST /api/heartbeat` every `intervalMs` while the worker is
 * "online".  The server's in-memory presence store has its own TTL
 * (see server/src/presence.rs) so if this hook stops firing (app closed,
 * bad network, etc.), the worker silently disappears from users' feeds.
 */
export function useHeartbeat(
    user: { userId: string; name: string } | null,
    categories: string[],
    intervalMs = 60_000,
) {
    const [online, setOnline] = useState(false);
    const timerRef = useRef<number | null>(null);
    const { position, getCurrent } = useLocation();

    async function tick() {
        if (!user) return;
        const pos = position ?? (await getCurrent())?.coords;
        if (!pos) return;
        try {
            await api.heartbeat(user.userId, user.name, pos.latitude, pos.longitude, categories);
        } catch { /* ignore transient network errors */ }
    }

    async function start() {
        if (!user || online) return;
        setOnline(true);
        await tick();
        timerRef.current = window.setInterval(tick, intervalMs) as unknown as number;
    }

    async function stop() {
        setOnline(false);
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (user) { try { await api.heartbeatStop(user.userId); } catch {} }
    }

    useEffect(() => () => {
        if (timerRef.current) clearInterval(timerRef.current);
    }, []);

    return { online, start, stop };
}
