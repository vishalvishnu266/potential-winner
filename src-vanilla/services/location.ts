/**
 * Location service — real device geolocation with graceful fallbacks.
 *
 * Layers, in preference order:
 *   1. `@capacitor/geolocation` on native (best accuracy, permission-aware).
 *   2. `navigator.geolocation` on web / dev preview.
 *   3. Cached last-known coord from `storage`.
 *   4. Hard-coded default (Bengaluru).
 *
 * Only THIS module reads Geolocation. Controllers subscribe / call
 * `getCurrent()`; views never touch it.
 */

import { Geolocation, Position } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { storage } from './storage';

export interface Coord { lat: number; lon: number; accuracy?: number; ts: number; }
export type LocationPermission = 'prompt' | 'granted' | 'denied' | 'unavailable';

type Listener = (c: Coord) => void;

const KEY = 'vanilla:last-location';
const DEFAULT: Coord = { lat: 12.9716, lon: 77.5946, ts: 0 };

let current: Coord = DEFAULT;
let permission: LocationPermission = 'prompt';
let watchId: string | number | null = null;
const listeners = new Set<Listener>();
let hydrated = false;

async function hydrate(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  const cached = await storage.get<Coord>(KEY);
  if (cached && typeof cached.lat === 'number') current = cached;
}

function emit(): void { listeners.forEach((l) => l(current)); }

async function persist(c: Coord): Promise<void> {
  await storage.set(KEY, c);
}

async function readNative(): Promise<Coord | null> {
  try {
    const p: Position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true, timeout: 8000, maximumAge: 5 * 60_000,
    });
    return {
      lat: p.coords.latitude,
      lon: p.coords.longitude,
      accuracy: p.coords.accuracy ?? undefined,
      ts: Date.now(),
    };
  } catch { return null; }
}

async function readWeb(): Promise<Coord | null> {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({
        lat: p.coords.latitude, lon: p.coords.longitude,
        accuracy: p.coords.accuracy ?? undefined, ts: Date.now(),
      }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 5 * 60_000 },
    );
  });
}

async function checkPermission(): Promise<LocationPermission> {
  if (Capacitor.isNativePlatform()) {
    try {
      const r = await Geolocation.checkPermissions();
      const s = r.location;
      if (s === 'granted') return 'granted';
      if (s === 'denied')  return 'denied';
      return 'prompt';
    } catch { return 'unavailable'; }
  }
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return 'unavailable';
  return 'prompt';
}

export const locationService = {
  get current(): Coord { return current; },
  get permission(): LocationPermission { return permission; },

  async init(): Promise<void> {
    await hydrate();
    permission = await checkPermission();
    // Warm the first fix in the background if we already have permission.
    if (permission === 'granted') void this.getCurrent(false);
  },

  /**
   * Request an up-to-date fix.
   *
   * @param interactive if `true`, prompts the OS for permission if needed.
   *                    If `false`, best-effort only (used for background warm-ups).
   */
  async getCurrent(interactive = true): Promise<Coord> {
    if (permission === 'prompt' && interactive) {
      try {
        if (Capacitor.isNativePlatform()) {
          const r = await Geolocation.requestPermissions();
          permission = r.location === 'granted' ? 'granted' : 'denied';
        } else {
          permission = 'granted'; // web prompts on first read
        }
      } catch { permission = 'denied'; }
    }
    if (permission === 'denied' || permission === 'unavailable') return current;

    const fresh = Capacitor.isNativePlatform() ? await readNative() : await readWeb();
    if (fresh) { current = fresh; void persist(fresh); emit(); }
    return current;
  },

  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    fn(current);
    return () => { listeners.delete(fn); };
  },

  /** Optionally start a low-frequency watch (used by long-lived screens). */
  async startWatch(): Promise<void> {
    if (watchId != null) return;
    if (Capacitor.isNativePlatform()) {
      try {
        watchId = await Geolocation.watchPosition(
          { enableHighAccuracy: true, timeout: 30_000 },
          (p) => {
            if (!p) return;
            current = {
              lat: p.coords.latitude, lon: p.coords.longitude,
              accuracy: p.coords.accuracy ?? undefined, ts: Date.now(),
            };
            void persist(current);
            emit();
          },
        );
      } catch { /* noop */ }
    } else if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (p) => {
          current = {
            lat: p.coords.latitude, lon: p.coords.longitude,
            accuracy: p.coords.accuracy ?? undefined, ts: Date.now(),
          };
          void persist(current);
          emit();
        },
        () => { /* noop */ },
        { enableHighAccuracy: true, maximumAge: 30_000 },
      );
    }
  },

  async stopWatch(): Promise<void> {
    if (watchId == null) return;
    if (Capacitor.isNativePlatform() && typeof watchId === 'string') {
      try { await Geolocation.clearWatch({ id: watchId }); } catch { /* noop */ }
    } else if (typeof watchId === 'number') {
      navigator.geolocation.clearWatch(watchId);
    }
    watchId = null;
  },
};
