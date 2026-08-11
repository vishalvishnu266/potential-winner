/**
 * Radar canvas — pure DOM/Canvas, no React.
 *
 * Draws concentric range rings + a sweep + one dot per point. Auto-rotates
 * to keep the user's heading pointing up. Handles pointer taps and calls
 * back with the tapped point's id.
 *
 * Lifecycle:
 *   - Uses `UIComponent.onMount` to attach ResizeObserver + heading listener.
 *   - Returns a cleanup that detaches on `.dispose()`.
 */

import { El, UIComponent } from '../framework';
import { headingService } from '../services';

export interface RadarPoint {
  id: string;
  distanceKm: number;
  bearingDeg: number;   // 0..360, 0=north
  tone: string;         // css var suffix (e.g. 'blue')
  label?: string;
}

export interface RadarOptions {
  points: RadarPoint[];
  maxKm?: number;
  onSelect?: (id: string) => void;
  height?: number;
}

export function Radar(opts: RadarOptions): UIComponent<'div'> {
  const maxKm = opts.maxKm ?? 5;
  const wrap = El('div').style({
    position: 'relative',
    width: '100%',
    height: (opts.height ?? 320) + 'px',
    borderRadius: 'var(--r-3)',
    background: 'var(--c-surface)',
    boxShadow: 'var(--sh-1)',
    overflow: 'hidden',
    touchAction: 'manipulation',
  });

  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  wrap.el.appendChild(canvas);

  const ctx = canvas.getContext('2d')!;
  let heading = 0;      // degrees
  let sweep = 0;        // degrees (0..360)
  let raf: number | null = null;
  let dpr = window.devicePixelRatio || 1;
  let size = { w: 320, h: 320 };
  let dotPositions: Array<{ id: string; x: number; y: number; r: number }> = [];

  // ------ drawing ---------------------------------------------------------
  const styleOfTone = (tone: string): string => {
    // Resolve the CSS variable at draw-time so theme changes propagate.
    return getComputedStyle(document.documentElement)
      .getPropertyValue(`--tone-${tone}`).trim() || 'currentColor';
  };
  const textMuted  = (): string => getComputedStyle(document.documentElement).getPropertyValue('--c-text-muted').trim() || '#888';
  const hairline   = (): string => getComputedStyle(document.documentElement).getPropertyValue('--c-hairline').trim() || 'rgba(0,0,0,.1)';
  const primary    = (): string => getComputedStyle(document.documentElement).getPropertyValue('--c-primary').trim() || '#007aff';

  const draw = (): void => {
    const w = size.w, h = size.h;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2, cy = h / 2;
    const radius = Math.min(w, h) / 2 - 12;

    // Rings
    ctx.strokeStyle = hairline();
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      const r = (radius * i) / 4;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Cross-hairs
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy); ctx.lineTo(cx + radius, cy);
    ctx.moveTo(cx, cy - radius); ctx.lineTo(cx, cy + radius);
    ctx.stroke();

    // Cardinal labels rotated with heading
    ctx.fillStyle = textMuted();
    ctx.font = '600 11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const cardinals = [ ['N', 0], ['E', 90], ['S', 180], ['W', 270] ] as const;
    for (const [label, deg] of cardinals) {
      const rad = ((deg - heading) - 90) * Math.PI / 180;
      const rx = cx + Math.cos(rad) * (radius + 2);
      const ry = cy + Math.sin(rad) * (radius + 2);
      ctx.fillText(label as string, rx, ry);
    }

    // Sweep
    const sr = ((sweep - heading) - 90) * Math.PI / 180;
    const grad = ctx.createConicGradient ? ctx.createConicGradient(sr, cx, cy) : null;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, sr - 0.35, sr, false);
    ctx.closePath();
    ctx.fillStyle = primary() + '33';
    ctx.fill();
    ctx.restore();

    // Points
    dotPositions = [];
    const scale = radius / maxKm;
    for (const p of opts.points) {
      const clamped = Math.min(p.distanceKm, maxKm);
      const rad = ((p.bearingDeg - heading) - 90) * Math.PI / 180;
      const x = cx + Math.cos(rad) * clamped * scale;
      const y = cy + Math.sin(rad) * clamped * scale;
      const tone = styleOfTone(p.tone);
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fillStyle = tone;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      dotPositions.push({ id: p.id, x, y, r: 14 });
    }

    // Center pin (you-are-here)
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = primary();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const tick = (): void => {
    sweep = (sweep + 1.2) % 360;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
    raf = requestAnimationFrame(tick);
  };

  const resize = (): void => {
    const rect = canvas.getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    size = { w: rect.width, h: rect.height };
  };

  // Tap handling
  const onTap = (e: MouseEvent | TouchEvent): void => {
    const rect = canvas.getBoundingClientRect();
    const point = 'touches' in e && e.touches.length
      ? { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
      : { x: (e as MouseEvent).clientX - rect.left, y: (e as MouseEvent).clientY - rect.top };
    // Find the closest hit within radius
    let hit: string | null = null;
    let best = Infinity;
    for (const d of dotPositions) {
      const dx = d.x - point.x, dy = d.y - point.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= d.r && dist < best) { best = dist; hit = d.id; }
    }
    if (hit && opts.onSelect) opts.onSelect(hit);
  };
  canvas.addEventListener('click', onTap);

  // Lifecycle: resize + heading subscription
  wrap.onMount(() => {
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const unsubHeading = headingService.subscribe((deg) => { heading = deg; });
    tick();
    return () => {
      if (raf) cancelAnimationFrame(raf);
      raf = null;
      ro.disconnect();
      unsubHeading();
      canvas.removeEventListener('click', onTap);
    };
  });

  return wrap;
}
