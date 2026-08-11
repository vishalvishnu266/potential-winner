/**
 * Radar — full-screen static "point where you're facing" radar.
 *
 * Design decisions per product feedback:
 *   - No spinning sweep. It's not a search animation; it's a map you read.
 *   - The RADAR ROTATES with the phone's compass heading so North stays in
 *     world-north, but the pips themselves DO NOT rotate — we counter-rotate
 *     the icon inside each pip so the icon symbol stays upright regardless
 *     of the phone's orientation.
 *   - Fills the parent (which should be a full-screen container). No fixed
 *     square size — uses `ResizeObserver` and 100%/100% canvas.
 *   - HiDPI-aware. Repaints only when heading, points, or size actually
 *     change (no rAF loop).
 *
 * Rendering strategy:
 *   The circular canvas draws only rings + cardinal letters. Pips are
 *   ordinary absolutely-positioned HTML buttons so we can render icons
 *   crisply and keep tap targets ≥ 44 px. Pip positions are recomputed on
 *   heading / size / points change.
 */

import { El, UIComponent } from '../framework';
import { Icon, IconName } from '../framework/icons';
import { headingService } from '../services';

export interface RadarPoint {
  id: string;
  distanceKm: number;
  bearingDeg: number;   // 0..360, 0 = north
  tone: string;
  label?: string;
  icon?: IconName;
}

export interface RadarOptions {
  points: RadarPoint[];
  maxKm?: number;
  onSelect?: (id: string) => void;
  /** Optional caption to show under the radar. */
  caption?: string;
}

export function Radar(opts: RadarOptions): UIComponent<'div'> {
  const maxKm = opts.maxKm ?? 5;

  // Full-screen container — expects parent to give it space.
  const wrap = El('div').style({
    position: 'relative',
    width: '100%',
    height: '100%',
    minHeight: '0',
    background: 'var(--c-bg)',
    overflow: 'hidden',
    touchAction: 'manipulation',
  });

  // Rings canvas (behind the pips).
  const canvas = document.createElement('canvas');
  canvas.style.position = 'absolute';
  canvas.style.inset = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  wrap.el.appendChild(canvas);

  // Pip layer (in front).
  const pipLayer = document.createElement('div');
  pipLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
  wrap.el.appendChild(pipLayer);

  // Center "you-are-here" marker as an HTML element so it can carry the icon.
  const me = document.createElement('div');
  me.style.cssText = `
    position:absolute;left:50%;top:50%;
    width:22px;height:22px;transform:translate(-50%,-50%);
    background:var(--c-primary);border:3px solid var(--c-surface);
    border-radius:999px;box-shadow:0 4px 12px rgba(0,0,0,.25);
    z-index:2;
  `;
  wrap.el.appendChild(me);

  // Caption at bottom
  const caption = document.createElement('div');
  caption.style.cssText = `
    position:absolute;left:0;right:0;bottom:12px;
    text-align:center;font-size:12px;color:var(--c-text-muted);
    pointer-events:none;
  `;
  if (opts.caption) caption.textContent = opts.caption;
  wrap.el.appendChild(caption);

  const ctx = canvas.getContext('2d')!;
  let heading = 0;
  let dpr = window.devicePixelRatio || 1;
  let size = { w: 320, h: 320 };
  const pipEls: HTMLButtonElement[] = [];

  const cssVar = (name: string): string =>
    getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  const drawRings = (): void => {
    const w = size.w, h = size.h;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const radius = Math.min(w, h) / 2 - 40;

    ctx.strokeStyle = cssVar('--c-hairline') || 'rgba(0,0,0,.1)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      const r = (radius * i) / 4;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      // Distance label on the east-side of each ring.
      ctx.fillStyle = cssVar('--c-text-tertiary') || 'rgba(0,0,0,.3)';
      ctx.font = '500 10px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      const km = ((maxKm * i) / 4).toFixed(1);
      ctx.fillText(`${km} km`, cx + r + 4, cy);
    }

    // Cross-hairs (soft)
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy); ctx.lineTo(cx + radius, cy);
    ctx.moveTo(cx, cy - radius); ctx.lineTo(cx, cy + radius);
    ctx.stroke();

    // Cardinal letters — rotate with heading so N stays true-north.
    ctx.fillStyle = cssVar('--c-text-muted') || '#888';
    ctx.font = '700 12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const cards = [
      ['N', 0, cssVar('--c-primary')],
      ['E', 90], ['S', 180], ['W', 270],
    ] as const;
    for (const c of cards) {
      const [label, deg, color] = c as [string, number, string | undefined];
      const rad = ((deg - heading) - 90) * Math.PI / 180;
      const rx = cx + Math.cos(rad) * (radius + 20);
      const ry = cy + Math.sin(rad) * (radius + 20);
      ctx.fillStyle = color ?? (cssVar('--c-text-muted') || '#888');
      ctx.fillText(label, rx, ry);
    }
  };

  const positionPips = (): void => {
    const w = size.w, h = size.h;
    const cx = w / 2, cy = h / 2;
    const radius = Math.min(w, h) / 2 - 40;
    const scale = radius / maxKm;
    for (let i = 0; i < opts.points.length; i++) {
      const p = opts.points[i];
      const el = pipEls[i];
      if (!el) continue;
      const clamped = Math.min(p.distanceKm, maxKm);
      // Bearing minus heading rotates the ring so the phone-forward is "up".
      const rad = ((p.bearingDeg - heading) - 90) * Math.PI / 180;
      const x = cx + Math.cos(rad) * clamped * scale;
      const y = cy + Math.sin(rad) * clamped * scale;
      el.style.left = `${x}px`;
      el.style.top  = `${y}px`;
    }
  };

  const buildPips = (): void => {
    pipLayer.replaceChildren();
    pipEls.length = 0;
    for (const p of opts.points) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('aria-label', p.label ?? p.id);
      btn.style.cssText = `
        position:absolute;left:0;top:0;
        transform:translate(-50%,-50%);
        width:36px;height:36px;border-radius:12px;
        border:2px solid var(--c-surface);
        background:var(--tone-${p.tone});color:#fff;
        display:inline-flex;align-items:center;justify-content:center;
        pointer-events:auto;
        box-shadow:0 4px 12px rgba(0,0,0,.20);
        transition:transform 120ms cubic-bezier(.22,1,.36,1);
        touch-action:manipulation;
      `;
      // Inner span holds the icon — this stays upright regardless of the
      // radar's rotation (we don't rotate pips, only the ring itself).
      const iconWrap = El('span').style({
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      });
      if (p.icon) iconWrap.add(Icon(p.icon, { size: 18 }));
      else {
        // Fallback = filled dot.
        const dot = document.createElement('span');
        dot.style.cssText = 'width:8px;height:8px;background:#fff;border-radius:999px;';
        iconWrap.el.appendChild(dot);
      }
      btn.appendChild(iconWrap.el);
      btn.addEventListener('click', () => opts.onSelect?.(p.id));
      btn.addEventListener('touchstart', () => { btn.style.transform = 'translate(-50%,-50%) scale(.92)'; }, { passive: true });
      btn.addEventListener('touchend',   () => { btn.style.transform = 'translate(-50%,-50%) scale(1)'; });
      btn.addEventListener('touchcancel',() => { btn.style.transform = 'translate(-50%,-50%) scale(1)'; });
      pipLayer.appendChild(btn);
      pipEls.push(btn);
    }
  };

  const resize = (): void => {
    const rect = wrap.el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    dpr = window.devicePixelRatio || 1;
    canvas.width  = Math.max(1, Math.floor(rect.width  * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    size = { w: rect.width, h: rect.height };
    render();
  };

  const render = (): void => { drawRings(); positionPips(); };

  buildPips();

  wrap.onMount(() => {
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap.el);
    const unsubHeading = headingService.subscribe((deg) => {
      heading = deg;
      render();
    });
    return () => { ro.disconnect(); unsubHeading(); };
  });

  return wrap;
}
