import type { ProvidersRepository } from '../types';
import type { Provider } from '../../services/providers-types';
import type { CategoryKey } from '../../data/categories';

// Same deterministic generator that used to live in services/providers.ts.
// Moved here verbatim so mock impl is self-contained.

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
            Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) *
            Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const CATS: CategoryKey[] = ['cab','auto','puncture','mechanic','cook','plumb','electric','clean','move','other'];

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
  '+919000000001','+919000000002','+919000000003','+919000000004',
  '+919000000005','+919000000006','+919000000007','+919000000008',
];

function generate(lat: number, lon: number): Provider[] {
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

export class MockProvidersRepository implements ProvidersRepository {
  async listNearby(lat: number, lon: number, radiusKm: number, category?: CategoryKey): Promise<Provider[]> {
    let list = generate(lat, lon).filter((p) => p.distanceKm <= radiusKm);
    if (category) list = list.filter((p) => p.category === category);
    return list;
  }
  async byId(id: string): Promise<Provider | null> {
    return generate(12.9716, 77.5946).find((p) => p.id === id) ?? null;
  }
}
