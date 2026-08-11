/**
 * Providers directory — searchable, callable services near the user.
 *
 * This is the NEW surface: cab / auto / puncture / mechanic / cook / plumber
 * / electrician / cleaner / mover. Users can browse & call directly instead
 * of posting a job.
 *
 * Mock-backed today. Swap for `http.get('/api/providers')` when the backend
 * is ready — the shape and controller contract stay the same.
 */

import type { CategoryKey } from '../data/categories';

export interface Provider {
  id: string;
  name: string;
  category: CategoryKey;
  phone: string;
  lat: number;
  lon: number;
  distanceKm: number;
  rating: number;      // 0..5
  reviews: number;
  openNow: boolean;
  eta?: string;        // "5 min", "under 10 min", etc.
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

const NAMES: Record<CategoryKey, string[]> = {
  cab:      ['Sunrise Cabs', 'Metro Rides', 'City Wheels', 'Prime Cab', 'Speed Taxi'],
  auto:     ['Ravi Auto', 'Sri Ganesh Auto', 'Namma Auto', 'Kumar Auto'],
  puncture: ['Bala Tyre Works', 'Sri Ram Tyres', 'Quick Fix Puncture', 'Roadside Tyre'],
  mechanic: ['Kannan Garage', 'Uma Motors', 'Star Automotive', 'GearUp Mechanic'],
  cook:     ['Amma Kitchen', 'Chef At Home', 'Ruchi Meals', 'HomeBite'],
  plumb:    ['Ganesh Plumbing', 'FixIt Pipes', 'AquaPro'],
  electric: ['Volt Electricals', 'Sparks & Fix', 'Chennai Electric'],
  clean:    ['Shine Cleaners', 'Deep Clean Co', 'HouseGleam'],
  move:     ['City Movers', 'PackAndGo', 'Swift Shift'],
  other:    ['Local Helpers'],
};

// A stable pool of demo phone numbers.
const PHONES = [
  '+919000000001', '+919000000002', '+919000000003', '+919000000004',
  '+919000000005', '+919000000006', '+919000000007', '+919000000008',
];

const CATS: CategoryKey[] = ['cab','auto','puncture','mechanic','cook','plumb','electric','clean','move','other'];

function generate(lat: number, lon: number, seedSalt = 0): Provider[] {
  const seed = Math.floor((lat + 90) * 1e4) ^ Math.floor((lon + 180) * 1e4) ^ seedSalt;
  const rng = mulberry32(seed);
  const list: Provider[] = [];
  for (const cat of CATS) {
    const names = NAMES[cat] ?? NAMES.other;
    const n = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) {
      const km = +(0.2 + rng() * 9.8).toFixed(2);
      list.push({
        id: `${cat}-${i}-${seed}`,
        name: names[Math.floor(rng() * names.length)],
        category: cat,
        phone: PHONES[Math.floor(rng() * PHONES.length)],
        lat: lat + (rng() - 0.5) * 0.1,
        lon: lon + (rng() - 0.5) * 0.1,
        distanceKm: km,
        rating: +(3.5 + rng() * 1.5).toFixed(1),
        reviews: Math.floor(rng() * 400),
        openNow: rng() > 0.15,
        eta: km < 1 ? '5 min' : km < 3 ? 'under 10 min' : `${Math.round(km * 3)} min`,
      });
    }
  }
  return list.sort((a, b) => a.distanceKm - b.distanceKm);
}

export const providersService = {
  async listNearby(
    lat = 12.9716, lon = 77.5946, radiusKm = 5,
    category?: CategoryKey,
  ): Promise<Provider[]> {
    let list = generate(lat, lon).filter((p) => p.distanceKm <= radiusKm);
    if (category) list = list.filter((p) => p.category === category);
    return list;
  },
  async byId(id: string): Promise<Provider | null> {
    const list = generate(12.9716, 77.5946);
    return list.find((p) => p.id === id) ?? null;
  },
};
