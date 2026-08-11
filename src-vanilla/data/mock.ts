/**
 * Deterministic mock data.
 * Everything here is pure data — no I/O, no side effects. Consumed by
 * services (`services/jobs.ts`, `services/sponsors.ts`) so views never
 * import it directly.
 */

import type { CategoryKey } from './categories';

export interface MockJob {
  id: string;
  category: CategoryKey;
  description: string;
  budget: number;
  lat: number;
  lon: number;
  postedAt: number;
  distanceKm: number;
}

export interface Sponsor {
  id: number;
  name: string;
  category: string;
  distanceKm: number;
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CATS: CategoryKey[] = ['move','clean','plumb','electric','cab','auto','puncture','mechanic','cook','other'];
const DESCS: Record<CategoryKey, string[]> = {
  move:     ['Shift 1 sofa from 2nd floor', 'Move 5 boxes to new flat', 'Bike shift needed'],
  clean:    ['Deep clean 1BHK', 'Kitchen cleaning after party', 'Weekly dusting help'],
  plumb:    ['Fix leaking tap', 'Bathroom pipe burst', 'Install new flush'],
  electric: ['Fan not working', 'Add new socket in kitchen', 'Light flickering issue'],
  cab:      ['Airport drop 6am', 'Ride to mall & back', 'Long-distance ride tomorrow'],
  auto:     ['Auto to railway station', 'Grocery run', 'School pickup'],
  puncture: ['Bike tyre puncture', 'Car flat, need help', 'Scooter puncture near office'],
  mechanic: ['Bike making noise', 'Car engine tune-up', 'Oil change needed'],
  cook:     ['Cook lunch for 4', 'Party catering — snacks', 'Weekly tiffin service'],
  other:    ['Help with small task', 'General assistance', 'Odd job at home'],
};

/** Generate stable mock jobs around a coordinate. */
export function generateJobs(originLat = 12.9716, originLon = 77.5946, count = 24): MockJob[] {
  const seed = Math.floor((originLat + 90) * 1e4) ^ Math.floor((originLon + 180) * 1e4);
  const rng = mulberry32(seed);
  const jobs: MockJob[] = [];
  for (let i = 0; i < count; i++) {
    const cat = CATS[Math.floor(rng() * CATS.length)];
    const descs = DESCS[cat];
    const km = +(rng() * 10).toFixed(2);
    jobs.push({
      id: `job-${i}-${seed}`,
      category: cat,
      description: descs[Math.floor(rng() * descs.length)],
      budget: Math.floor(100 + rng() * 900),
      lat: originLat + (rng() - 0.5) * 0.1,
      lon: originLon + (rng() - 0.5) * 0.1,
      postedAt: Date.now() - Math.floor(rng() * 60 * 60 * 1000),
      distanceKm: km,
    });
  }
  return jobs.sort((a, b) => a.distanceKm - b.distanceKm);
}

export const MOCK_SPONSORS: Sponsor[] = [
  { id: 1, name: 'Green Grocers', category: 'Grocery',    distanceKm: 0.8 },
  { id: 2, name: 'Sri Ram Tyres', category: 'Puncture',   distanceKm: 1.4 },
  { id: 3, name: "Amma's Kitchen", category: 'Tiffin',    distanceKm: 2.1 },
  { id: 4, name: 'City Movers',   category: 'Move',       distanceKm: 3.0 },
];

export function formatAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}
