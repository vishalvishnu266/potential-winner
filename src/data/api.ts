/**
 * Thin fetch wrapper for the DailyGig Rust backend.
 *
 * The base URL uses the compile-time `__OTA_HOST__` + `__OTA_PORT__` that
 * Vite injects (already used by the OTA composable), so a physical phone
 * on the same LAN can reach the dev server.
 */

declare const __OTA_HOST__: string;
declare const __OTA_PORT__: number;

const BASE = `http://${__OTA_HOST__}:${__OTA_PORT__}`;

async function req<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
        headers: { 'content-type': 'application/json' },
        ...init,
    });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`${res.status} ${res.statusText} ${text}`);
    }
    // Some endpoints return {ok:true} which is fine as `unknown`
    return (await res.json()) as T;
}

// --- Types (kept in one place so pages import from here only) --------------

export interface Job {
    id: string;
    requester_id: string;
    category: string;
    description: string;
    lat: number;
    lon: number;
    budget: number | null;
    bids_open: boolean;
    created_at: number;
    expires_at: number;
    accepted_by: string | null;
    requester_done: boolean;
    doer_done: boolean;
    requester_paid: boolean;
    doer_received: boolean;
    payment_method: 'unpaid' | 'upi' | 'cash';
    distance_km?: number;
}

export interface Worker {
    user_id: string;
    name: string;
    lat: number;
    lon: number;
    categories: string[];
    updated_at: number;
    distance_km: number;
}

export interface Sponsor {
    id: number;
    name: string;
    category: string;
    phone: string | null;
    photo_url: string | null;
    lat: number;
    lon: number;
    distance_km: number;
}

export interface NearbyResp {
    jobs: Job[];
    workers: Worker[];
    sponsors: Sponsor[];
}

// --- Endpoints --------------------------------------------------------------

export const api = {
    // Auth (dev OTP is always "0000")
    otpSend:   (phone: string) =>
        req<{ ok: true; hint?: string }>('/api/auth/otp/send', {
            method: 'POST', body: JSON.stringify({ phone }),
        }),
    otpVerify: (phone: string, otp: string, name?: string) =>
        req<{ user_id: string; name: string }>('/api/auth/otp/verify', {
            method: 'POST', body: JSON.stringify({ phone, otp, name }),
        }),

    // Presence
    heartbeat: (user_id: string, name: string, lat: number, lon: number, categories: string[]) =>
        req<{ ok: true; ttl_ms: number }>('/api/heartbeat', {
            method: 'POST',
            body: JSON.stringify({ user_id, name, lat, lon, categories }),
        }),
    heartbeatStop: (user_id: string) =>
        req<{ ok: true }>('/api/heartbeat/stop', {
            method: 'POST', body: JSON.stringify({ user_id }),
        }),

    // Jobs
    postJob: (job: {
        requester_id: string; category: string; description: string;
        lat: number; lon: number; budget?: number; bids_open?: boolean;
    }) => req<Job>('/api/jobs', { method: 'POST', body: JSON.stringify(job) }),

    nearby: (lat: number, lon: number, radius_km: number, category?: string) => {
        const p = new URLSearchParams({
            lat: String(lat), lon: String(lon), radius_km: String(radius_km),
        });
        if (category) p.set('category', category);
        return req<NearbyResp>(`/api/nearby?${p}`);
    },

    /**
     * Sponsor-only lookup — used by the "Local" tab and the subtle
     * strip on Home.  We reuse `/api/nearby` and simply discard the
     * jobs/workers portion.  A huge radius means "everything the
     * server would show for this location"; the server's own per-sponsor
     * `radius_km` still gates who sees whom.
     *
     * Kept isolated so we can later add a dedicated `/api/sponsors`
     * endpoint without touching callers.
     */
    sponsorsNear: async (lat: number, lon: number, radius_km = 50) => {
        const p = new URLSearchParams({
            lat: String(lat), lon: String(lon), radius_km: String(radius_km),
        });
        const r = await req<NearbyResp>(`/api/nearby?${p}`);
        return r.sponsors;
    },

    getJob: (id: string) => req<Job>(`/api/jobs/${id}`),

    acceptJob: (id: string, doer_id: string) =>
        req<Job>(`/api/jobs/${id}/accept`, {
            method: 'POST', body: JSON.stringify({ doer_id }),
        }),

    markDone: (id: string, opts: {
        role: 'requester' | 'doer';
        paid?: boolean; received?: boolean;
        payment_method?: 'upi' | 'cash' | 'unpaid';
    }) => req<Job>(`/api/jobs/${id}/done`, {
        method: 'POST', body: JSON.stringify(opts),
    }),

    rate: (id: string, role: 'requester' | 'doer', rating: 1 | 2 | 3) =>
        req<{ ok: true }>(`/api/jobs/${id}/rate`, {
            method: 'POST', body: JSON.stringify({ role, rating }),
        }),

    reputation: (user_id: string) =>
        req<{ user_id: string; completed: number; avg_rating: number | null }>(
            `/api/user/${user_id}/reputation`,
        ),
};
