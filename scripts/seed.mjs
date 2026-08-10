#!/usr/bin/env node
/**
 * DailyGig seeder — pure JS.
 *
 * Populates a running DailyGig server with realistic mock data around a
 * real coordinate, using only the *public* HTTP endpoints (no server
 * changes required).  Runs against dev + LAN + prod-like environments
 * identically; no Cargo, no Rust rebuild.
 *
 * Usage:
 *   node scripts/seed.mjs --lat 13.0827 --lon 80.2707
 *   node scripts/seed.mjs --lat 13.0827 --lon 80.2707 --host 192.168.0.4
 *   node scripts/seed.mjs --lat 13.0827 --lon 80.2707 --jobs 30 --workers 15 --radius 3
 *
 * Or via npm:
 *   npm run seed -- --lat 13.0827 --lon 80.2707
 *
 * Flags:
 *   --lat <f>          (required)   your real latitude
 *   --lon <f>          (required)   your real longitude
 *   --host <string>    (default: localhost)   server hostname / IP
 *   --port <int>       (default: 3000)
 *   --radius <km>      (default: 5)
 *   --jobs <n>         (default: 15)
 *   --workers <n>      (default: 10)
 *   --sponsors <n>     (default: 6)
 *   --seed <int>       (default: hash(lat,lon))   RNG seed for repeatability
 *
 * Notes:
 *   - Jobs & workers live in memory on the server (jobs 30 min TTL,
 *     workers 90 s TTL).  Re-run the seeder any time to refresh them.
 *   - Sponsors live in SQLite and have no public write API.  Add them
 *     manually with sqlite3 if you need to test the Local tab.
 *
 * The seeder uses only the endpoints the mobile client already calls:
 *   POST /api/jobs          — one call per synthetic job
 *   POST /api/heartbeat     — one call per synthetic worker
 * so it's guaranteed to exercise the exact same code path as a real user.
 */

// ---------------------------------------------------------------------------
// Argument parsing (tiny, dependency-free)
// ---------------------------------------------------------------------------

function parseArgs(argv) {
    const out = {};
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (!a.startsWith('--')) continue;
        const key = a.slice(2);
        const next = argv[i + 1];
        if (next === undefined || next.startsWith('--')) {
            out[key] = true;
        } else {
            out[key] = next; i++;
        }
    }
    return out;
}

const argv = parseArgs(process.argv.slice(2));
const lat = Number(argv.lat);
const lon = Number(argv.lon);
if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    console.error('usage: node scripts/seed.mjs --lat <f> --lon <f> [--host localhost] [--port 3000] [--radius 5] [--jobs 15] [--workers 10] [--seed <int>]');
    process.exit(1);
}

const host      = argv.host      ?? 'localhost';
const port      = Number(argv.port ?? 3000);
const radiusKm  = Number(argv.radius   ?? 5);
const numJobs   = Number(argv.jobs     ?? 15);
const numWorkers= Number(argv.workers  ?? 10);
const rngSeed   = argv.seed !== undefined
    ? Number(argv.seed)
    : Math.floor((lat + 90) * 10_000) ^ Math.floor((lon + 180) * 10_000);

const BASE = `http://${host}:${port}`;

// ---------------------------------------------------------------------------
// Deterministic PRNG (mulberry32 clone — matches the frontend + Rust versions
// so the same (lat, lon) yields the same fake data across languages)
// ---------------------------------------------------------------------------

function mulberry32(seed) {
    let s = seed >>> 0;
    return () => {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const rng = mulberry32(rngSeed);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];

// Uniform sample inside a disc: r = R * sqrt(u), θ = 2π v.
function jitter() {
    const r = radiusKm * Math.sqrt(rng());
    const theta = 2 * Math.PI * rng();
    const latPerKm = 1 / 111;
    const lonPerKm = 1 / (111 * Math.max(0.001, Math.cos((lat * Math.PI) / 180)));
    return {
        dLat: r * Math.sin(theta) * latPerKm,
        dLon: r * Math.cos(theta) * lonPerKm,
    };
}

// ---------------------------------------------------------------------------
// Fixture data (same flavour as server/src/seed.rs — realistic + Hinglish)
// ---------------------------------------------------------------------------

const CATS = ['move','clean','plumb','electric','cab','auto','puncture','mechanic','cook'];

const JOB_TITLES = [
    ['move',     'Shift 1 sofa from 2nd floor to auto'],
    ['move',     'Help move 2 mattresses to new flat'],
    ['clean',    'Deep clean 1BHK after tenant move-out'],
    ['clean',    'Weekly kitchen safai'],
    ['plumb',    'Leaking kitchen tap needs replacement'],
    ['plumb',    'Toilet flush not working'],
    ['electric', 'Ceiling fan not spinning, check wiring'],
    ['electric', 'Install 2 LED tube lights'],
    ['cab',      'Airport drop at 5am tomorrow'],
    ['cab',      'One-way to Pondicherry Sunday'],
    ['auto',     'Auto to hospital, 3 people'],
    ['auto',     'Short trip to nearby market'],
    ['puncture', 'Bike puncture near Anna Nagar'],
    ['mechanic', 'Car making noise, need quick check'],
    ['cook',     'Cook lunch for 6 (South Indian veg)'],
    ['cook',     'Weekly tiffin — 5 days'],
];

const WORKER_NAMES = [
    'Ramesh', 'Suresh', 'Priya', 'Karthik', 'Meena',
    'Anand', 'Lakshmi', 'Vijay', 'Divya', 'Rohit',
];

// ---------------------------------------------------------------------------
// HTTP helpers (fetch is built-in from Node 18+)
// ---------------------------------------------------------------------------

async function post(path, body) {
    const res = await fetch(`${BASE}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`${res.status} ${res.statusText} @ ${path}: ${t}`);
    }
    return res.json().catch(() => ({}));
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function seedJobs() {
    let ok = 0, fail = 0;
    for (let i = 0; i < numJobs; i++) {
        const [cat, title] = pick(JOB_TITLES);
        const j = jitter();
        const budget = Math.round((80 + rng() * 900) / 10) * 10;
        try {
            await post('/api/jobs', {
                requester_id: `seed-user-${Math.floor(rng() * 10_000)}`,
                category: cat,
                description: title,
                lat: lat + j.dLat,
                lon: lon + j.dLon,
                budget,
                bids_open: false,
            });
            ok++;
        } catch (e) {
            fail++; console.warn('  job POST failed:', e.message);
        }
    }
    return { ok, fail };
}

async function seedWorkers() {
    let ok = 0, fail = 0;
    for (let i = 0; i < numWorkers; i++) {
        const name = pick(WORKER_NAMES);
        const j = jitter();
        // 1-3 skills each
        const n = 1 + Math.floor(rng() * 3);
        const cats = [];
        for (let k = 0; k < n; k++) {
            const c = pick(CATS);
            if (!cats.includes(c)) cats.push(c);
        }
        try {
            await post('/api/heartbeat', {
                user_id: `seed-worker-${i}-${rngSeed}`,
                name,
                lat: lat + j.dLat,
                lon: lon + j.dLon,
                categories: cats,
            });
            ok++;
        } catch (e) {
            fail++; console.warn('  worker heartbeat failed:', e.message);
        }
    }
    return { ok, fail };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

(async () => {
    console.log(`\nSeeding ${BASE}`);
    console.log(`Centre : ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
    console.log(`Radius : ${radiusKm} km`);
    console.log(`Jobs   : ${numJobs}`);
    console.log(`Workers: ${numWorkers}`);
    console.log(`RNG    : ${rngSeed}\n`);

    // Health check up-front so we fail fast if the server isn't running.
    try {
        const h = await fetch(`${BASE}/health`).then((r) => r.json());
        console.log('Server health:', JSON.stringify(h));
    } catch (e) {
        console.error(`\nCannot reach ${BASE}. Is the server running?\n${e.message}`);
        process.exit(2);
    }

    const j = await seedJobs();
    console.log(`  jobs    → ok=${j.ok}  fail=${j.fail}`);
    const w = await seedWorkers();
    console.log(`  workers → ok=${w.ok}  fail=${w.fail}`);

    // Refresh health so the new counts show up in the summary.
    const h2 = await fetch(`${BASE}/health`).then((r) => r.json()).catch(() => ({}));
    console.log('\nAfter seed:', JSON.stringify(h2));
    console.log(
        `\nTip: open the app on your phone with GPS near the centre and switch\n`
      + `to Work / Local — the seeded jobs & workers should show up.\n`
      + `Workers auto-expire after 90s of no heartbeat, so re-run the seeder\n`
      + `if you want to keep them online.`
    );
})();
