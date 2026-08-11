/**
 * Providers directory — env-aware.
 * Mock in-memory today; real HTTP in dev/prod.
 */

import type { CategoryKey } from '../data/categories';
import { http } from './http';
import { env } from '../env';

export interface Provider {
  id: string;
  name: string;
  category: CategoryKey;
  phone: string;
  lat: number;
  lon: number;
  distanceKm: number;
  rating: number;
  reviews: number;
  openNow: boolean;
  eta?: string;
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

const PHONES = [
  '+919000000001', '+919000000002', '+919000000003', '+919000000004',
  '+919000000005', '+919000000006', '+919000000007', '+919000000008',
];

const CATS: CategoryKey[] = ['cab','auto','puncture','mechanic','cook','plumb','electric','clean','move','other'];

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
            Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) *
            Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function generateMock(lat: number, lon: number): Provider[] {
  const seed = Math.floor((lat + 90) * 1e4) ^ Math.floor((lon + 180) * 1e4);
  const rng = mulberry32(seed);
  const list: Provider[] = [];
  for (const cat of CATS) {
    const names = NAMES[cat] ?? NAMES.other;
    const n = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) {
      const pLat = lat + (rng() - 0.5) * 0.1;
      const pLon = lon + (rng() - 0.5) * 0.1;
      const km = +haversineKm(lat, lon, pLat, pLon).toFixed(2);
      list.push({
        id: `${cat}-${i}-${seed}`,
        name: names[Math.floor(rng() * names.length)],
        category: cat,
        phone: PHONES[Math.floor(rng() * PHONES.length)],
        lat: pLat, lon: pLon, distanceKm: km,
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
    lat = 12.9716, lon = 77.5946, radiusKm = 10,
    category?: CategoryKey,
  ): Promise<Provider[]> {
    if (env.isMock()) {
      let list = generateMock(lat, lon).filter((p) => p.distanceKm <= radiusKm);
      if (category) list = list.filter((p) => p.category === category);
      return list;
    }
    const q = new URLSearchParams({
      lat: String(lat), lon: String(lon), r: String(radiusKm),
    });
    if (category) q.set('cat', category);
    return http.get<Provider[]>(`${env.baseUrl()}/api/providers?${q.toString()}`);
  },
  async byId(id: string): Promise<Provider | null> {
    if (env.isMock()) {
      const list = generateMock(12.9716, 77.5946);
      return list.find((p) => p.id === id) ?? null;
    }
    try { return await http.get<Provider>(`${env.baseUrl()}/api/providers/${encodeURIComponent(id)}`); }
    catch { return null; }
  },
};
