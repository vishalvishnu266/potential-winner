/**
 * Mock nearby-jobs data source.
 *
 * In production this comes from your backend as `GET /api/jobs?lat=..&lon=..&radius=..`
 * — the return shape here is intentionally identical to what such an
 * endpoint would return so the UI code doesn't need to change later.
 *
 * The helpers below generate a stable pseudo-random set of jobs *around*
 * the user's current fix so the app always has something to show, even
 * before the backend exists.
 */

export interface Job {
    id: string;
    title: string;
    category: 'ride' | 'delivery' | 'gig';
    price: number;              // in local currency (INR here)
    latitude: number;
    longitude: number;
    phone: string;
    postedAt: number;           // ms since epoch
    address?: string;
}

const CATEGORIES: Job['category'][] = ['ride', 'delivery', 'gig'];
const RIDE_TITLES = [
    'Airport drop', 'City center pickup', 'Ride to mall', 'Late-night ride',
    'Weekend outstation', 'Office commute',
];
const DELIVERY_TITLES = [
    'Grocery delivery', 'Package to courier hub', 'Food pickup + drop',
    'Medicine delivery', 'Document handoff',
];
const GIG_TITLES = [
    'Plumbing help', 'AC service', 'Move furniture', 'Photograph event',
    'Tutoring 2h', 'Fix laptop',
];

const PHONES = [
    '+91 98765 43210', '+91 90000 11122', '+91 91234 56789',
    '+91 99887 76655', '+91 96543 21098',
];

// Cheap deterministic PRNG so consecutive calls are stable per seed.
function mulberry32(seed: number) {
    return () => {
        seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
        let t = seed;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Given a lat/lon origin and a max radius in km, return N synthetic jobs
 * scattered within that radius.  Uses a seeded PRNG so results are stable
 * for the same origin (feels like real cached data across UI re-renders).
 */
export function generateNearbyJobs(
    originLat: number,
    originLon: number,
    radiusKm: number,
    count = 24,
): Job[] {
    // Seed off the coordinates so the same fix always returns the same list.
    const seed = Math.floor((originLat + 90) * 1e4) ^ Math.floor((originLon + 180) * 1e4);
    const rng = mulberry32(seed);

    // 1° latitude ≈ 111 km. 1° longitude scales by cos(latitude).
    const latPerKm = 1 / 111;
    const lonPerKm = 1 / (111 * Math.cos((originLat * Math.PI) / 180));

    const jobs: Job[] = [];
    for (let i = 0; i < count; i++) {
        // Uniform sample inside a disc: r = R * sqrt(u), θ = 2π v.
        const r = radiusKm * Math.sqrt(rng());
        const theta = 2 * Math.PI * rng();
        const dLat = r * Math.sin(theta) * latPerKm;
        const dLon = r * Math.cos(theta) * lonPerKm;

        const category = CATEGORIES[Math.floor(rng() * CATEGORIES.length)];
        const titles =
            category === 'ride' ? RIDE_TITLES :
            category === 'delivery' ? DELIVERY_TITLES : GIG_TITLES;
        const title = titles[Math.floor(rng() * titles.length)];

        jobs.push({
            id: `job-${i}-${seed}`,
            title,
            category,
            price: Math.floor(80 + rng() * 900),
            latitude: originLat + dLat,
            longitude: originLon + dLon,
            phone: PHONES[Math.floor(rng() * PHONES.length)],
            postedAt: Date.now() - Math.floor(rng() * 60 * 60 * 1000),
        });
    }
    return jobs;
}

/** Great-circle distance in kilometres (Haversine). */
export function distanceKm(
    lat1: number, lon1: number, lat2: number, lon2: number,
): number {
    const R = 6371;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}

/** Compass bearing from (lat1,lon1) → (lat2,lon2), 0° = north. */
export function bearingDeg(
    lat1: number, lon1: number, lat2: number, lon2: number,
): number {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const toDeg = (r: number) => (r * 180) / Math.PI;
    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δλ = toRad(lon2 - lon1);
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x =
        Math.cos(φ1) * Math.sin(φ2) -
        Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function formatAgo(ts: number) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    return `${h}h ago`;
}
