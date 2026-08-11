/**
 * Device heading (compass) — cheap, throttled.
 *
 * Emits at most every `THROTTLE_MS` (default 500ms) and only when the
 * heading has changed by more than `MIN_DELTA_DEG` (default 3°). This
 * keeps subscribers cheap even with 60 Hz device sensors.
 *
 * Auto-attaches on non-iOS on first subscribe. iOS callers must invoke
 * `request()` from a user gesture to prompt for permission.
 */

export type HeadingPermission = 'prompt' | 'granted' | 'denied' | 'unavailable';

type Listener = (deg: number) => void;

const THROTTLE_MS = 500;
const MIN_DELTA_DEG = 3;

class HeadingService {
  permission: HeadingPermission = 'prompt';
  private listeners = new Set<Listener>();
  private smoothed: number | null = null;
  private lastEmitted: number | null = null;
  private lastEmitAt = 0;
  private attached = false;

  constructor() {
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
      this.permission = 'unavailable';
    }
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const D = (globalThis as any).DeviceOrientationEvent;
    if (this.permission === 'prompt' && D && typeof D.requestPermission !== 'function') {
      this.attach();
      this.permission = 'granted';
    }
    return () => {
      this.listeners.delete(fn);
      if (this.listeners.size === 0) this.detach();
    };
  }

  async request(): Promise<HeadingPermission> {
    if (this.permission === 'unavailable') return 'unavailable';
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const D = DeviceOrientationEvent as any;
      if (typeof D.requestPermission === 'function') {
        const res: 'granted' | 'denied' = await D.requestPermission();
        if (res === 'granted') { this.attach(); this.permission = 'granted'; }
        else this.permission = 'denied';
        return this.permission;
      }
      this.attach();
      this.permission = 'granted';
      return 'granted';
    } catch {
      this.permission = 'denied';
      return 'denied';
    }
  }

  // Exponential smoothing to hide jitter.
  private smooth(next: number): number {
    if (this.smoothed == null) { this.smoothed = next; return next; }
    const delta = ((next - this.smoothed + 540) % 360) - 180;
    const out = (this.smoothed + delta * 0.25 + 360) % 360;
    this.smoothed = out;
    return out;
  }

  private maybeEmit(raw: number): void {
    const now = performance.now();
    if (now - this.lastEmitAt < THROTTLE_MS) return;
    const val = this.smooth(raw);
    if (this.lastEmitted != null) {
      const diff = Math.abs(((val - this.lastEmitted + 540) % 360) - 180);
      if (diff < MIN_DELTA_DEG) return;
    }
    this.lastEmitted = val;
    this.lastEmitAt = now;
    for (const l of this.listeners) l(val);
  }

  private onAbsolute = (e: DeviceOrientationEvent): void => {
    if (e.alpha == null) return;
    this.maybeEmit((360 - e.alpha) % 360);
  };
  private onRelative = (e: DeviceOrientationEvent): void => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wk = (e as any).webkitCompassHeading as number | undefined;
    if (typeof wk === 'number' && !Number.isNaN(wk)) { this.maybeEmit(wk); return; }
    if (e.alpha != null) this.maybeEmit((360 - e.alpha) % 360);
  };

  private attach(): void {
    if (this.attached) return;
    window.addEventListener('deviceorientationabsolute', this.onAbsolute as EventListener, { passive: true });
    window.addEventListener('deviceorientation', this.onRelative, { passive: true });
    this.attached = true;
  }
  private detach(): void {
    if (!this.attached) return;
    window.removeEventListener('deviceorientationabsolute', this.onAbsolute as EventListener);
    window.removeEventListener('deviceorientation', this.onRelative);
    this.attached = false;
  }
}

export const headingService = new HeadingService();
