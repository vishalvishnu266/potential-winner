/**
 * Device heading (compass) — pure DOM, no plugin.
 *
 * Emits 0–360° where 0 = north. Handles:
 *   - Android WebView (`deviceorientationabsolute`, alpha inverted)
 *   - iOS Safari (`webkitCompassHeading`, requires user-gesture permission)
 *   - Desktop/web preview → silent 'unavailable'
 *
 * API:
 *   headingService.subscribe(fn)   → () => void
 *   headingService.request()       → 'granted' | 'denied' | 'unavailable'
 *   headingService.permission
 */

export type HeadingPermission = 'prompt' | 'granted' | 'denied' | 'unavailable';

type Listener = (deg: number) => void;

class HeadingService {
  permission: HeadingPermission = 'prompt';
  private listeners = new Set<Listener>();
  private smoothed: number | null = null;
  private attached = false;

  constructor() {
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
      this.permission = 'unavailable';
    }
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    // Auto-attach on non-iOS (no permission model).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const D = (globalThis as any).DeviceOrientationEvent;
    if (
      this.permission === 'prompt' &&
      D &&
      typeof D.requestPermission !== 'function'
    ) {
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

  // ----- internal ---------------------------------------------------------
  private smooth = (next: number): number => {
    const prev = this.smoothed;
    if (prev == null) { this.smoothed = next; return next; }
    const delta = ((next - prev + 540) % 360) - 180;
    const out = (prev + delta * 0.2 + 360) % 360;
    this.smoothed = out;
    return out;
  };
  private emit = (deg: number): void => { this.listeners.forEach((l) => l(deg)); };

  private onAbsolute = (e: DeviceOrientationEvent): void => {
    if (e.alpha == null) return;
    this.emit(this.smooth((360 - e.alpha) % 360));
  };
  private onRelative = (e: DeviceOrientationEvent): void => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wk = (e as any).webkitCompassHeading as number | undefined;
    if (typeof wk === 'number' && !Number.isNaN(wk)) { this.emit(this.smooth(wk)); return; }
    if (e.alpha != null) this.emit(this.smooth((360 - e.alpha) % 360));
  };

  private attach(): void {
    if (this.attached) return;
    window.addEventListener('deviceorientationabsolute', this.onAbsolute as EventListener, true);
    window.addEventListener('deviceorientation', this.onRelative, true);
    this.attached = true;
  }
  private detach(): void {
    if (!this.attached) return;
    window.removeEventListener('deviceorientationabsolute', this.onAbsolute as EventListener, true);
    window.removeEventListener('deviceorientation', this.onRelative, true);
    this.attached = false;
  }
}

export const headingService = new HeadingService();
