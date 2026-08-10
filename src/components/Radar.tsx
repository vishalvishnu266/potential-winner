import { useEffect, useMemo, useRef } from 'react';
import { hapticTap } from '../composables/useNative';
import { CategoryMeta, metaOf } from '../data/categories';

export interface RadarPoint {
    id: string;
    /** Distance from centre in km. Anything beyond `radiusKm` is dropped. */
    distance_km: number;
    /** Compass bearing from centre in degrees (0 = north, 90 = east). */
    bearing_deg: number;
    /** Category key drives the dot colour + emoji label. */
    category: string;
}

export interface RadarProps {
    radiusKm: number;
    points: RadarPoint[];
    /** Optional: heading of the phone so "up" always faces where the
     *  user is looking (from useHeading). If undefined, north is up. */
    headingDeg?: number;
    onPointTap?: (p: RadarPoint) => void;
    /** Compass label at 12 o'clock — "N" by default, "You" if you'd
     *  rather orient by heading. */
    topLabel?: string;
}

/**
 * A super-lightweight "radar" view — no map library, no tiles, no
 * network cost.  Renders a canvas with:
 *
 *   • concentric distance rings (25%, 50%, 75%, 100% of radius)
 *   • a coloured emoji dot for every nearby job/worker
 *   • sweeping animation for visual life
 *
 * The user's own location is always the centre.  Each dot is tappable
 * (hit-tested against its rendered position) so the parent can jump to
 * the corresponding job detail.
 */
export default function Radar({
    radiusKm, points, headingDeg = 0, onPointTap, topLabel = 'N',
}: RadarProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const wrapRef   = useRef<HTMLDivElement | null>(null);
    const posRef    = useRef<Array<{ id: string; x: number; y: number; r: number; p: RadarPoint }>>([]);
    const sweepRef  = useRef(0);

    // Stable copy of the point list for the animation loop.
    const pts = useMemo(() => points, [points]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const wrap   = wrapRef.current;
        if (!canvas || !wrap) return;

        const dpr = Math.max(1, window.devicePixelRatio || 1);
        const resize = () => {
            const w = wrap.clientWidth;
            canvas.width  = w * dpr;
            canvas.height = w * dpr;
            canvas.style.width  = `${w}px`;
            canvas.style.height = `${w}px`;
        };
        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(wrap);

        let raf = 0;
        const draw = () => {
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            const w = canvas.width, h = canvas.height;
            const cx = w / 2, cy = h / 2;
            const R  = Math.min(w, h) / 2 - 8 * dpr;

            // Colours pulled from CSS vars → auto-adapts to dark mode.
            const styles   = getComputedStyle(document.documentElement);
            const surface  = styles.getPropertyValue('--color-surface').trim()  || '#fff';
            const border   = styles.getPropertyValue('--color-border').trim()   || '#e5e7eb';
            const muted    = styles.getPropertyValue('--color-muted').trim()    || '#64748b';
            const primary  = styles.getPropertyValue('--color-primary').trim()  || '#2563eb';

            ctx.clearRect(0, 0, w, h);

            // Background disc
            ctx.fillStyle = surface;
            ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

            // Distance rings
            ctx.strokeStyle = border;
            ctx.lineWidth = 1 * dpr;
            for (let i = 1; i <= 4; i++) {
                ctx.beginPath();
                ctx.arc(cx, cy, (R * i) / 4, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Cross-hairs
            ctx.beginPath();
            ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy);
            ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R);
            ctx.stroke();

            // Sweep (soft radar-arm animation)
            const sweep = sweepRef.current;
            const grad = ctx.createConicGradient
                ? ctx.createConicGradient(sweep, cx, cy)
                : null;
            if (grad) {
                grad.addColorStop(0, hexA(primary, 0));
                grad.addColorStop(0.03, hexA(primary, 0.35));
                grad.addColorStop(0.15, hexA(primary, 0));
                ctx.save();
                ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
                ctx.fillStyle = grad as unknown as string;
                ctx.fillRect(0, 0, w, h);
                ctx.restore();
            }
            sweepRef.current = (sweepRef.current + 0.03) % (Math.PI * 2);

            // Centre pin ("you")
            ctx.fillStyle = primary;
            ctx.beginPath(); ctx.arc(cx, cy, 6 * dpr, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = surface;
            ctx.lineWidth = 3 * dpr;
            ctx.stroke();

            // Compass label
            ctx.fillStyle = muted;
            ctx.font = `${12 * dpr}px system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(topLabel, cx, 2 * dpr);

            // Points
            posRef.current = [];
            for (const p of pts) {
                if (p.distance_km > radiusKm) continue;
                const rel   = p.distance_km / radiusKm;
                // Rotate so `headingDeg` faces upward.
                const angle = ((p.bearing_deg - headingDeg) - 90) * Math.PI / 180;
                const x = cx + Math.cos(angle) * (R * rel);
                const y = cy + Math.sin(angle) * (R * rel);
                const dotR = 14 * dpr;

                // Coloured dot — the tone alone conveys the category once
                // users learn the palette (violet = cab, teal = clean, ...).
                // A single-glyph icon would be hard to render legibly at
                // this size on canvas across scripts and screen densities.
                const meta: CategoryMeta = metaOf(p.category);
                const fill = colorForTone(meta.tone);

                // Outer soft halo
                ctx.fillStyle = hexA(fill.bg, 0.25);
                ctx.beginPath(); ctx.arc(x, y, dotR + 6 * dpr, 0, Math.PI * 2); ctx.fill();

                // Core dot with white outline
                ctx.fillStyle = fill.bg;
                ctx.beginPath(); ctx.arc(x, y, dotR, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = surface; ctx.lineWidth = 3 * dpr; ctx.stroke();

                posRef.current.push({
                    id: p.id, p,
                    x: x / dpr, y: y / dpr, r: dotR / dpr,
                });
            }
            raf = requestAnimationFrame(draw);
        };
        raf = requestAnimationFrame(draw);
        return () => { cancelAnimationFrame(raf); ro.disconnect(); };
    }, [pts, radiusKm, headingDeg, topLabel]);

    function onClick(e: React.MouseEvent<HTMLCanvasElement>) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        for (const dot of posRef.current) {
            const dx = dot.x - x, dy = dot.y - y;
            if (dx * dx + dy * dy <= (dot.r + 4) ** 2) {
                hapticTap();
                onPointTap?.(dot.p);
                return;
            }
        }
    }

    return (
        <div ref={wrapRef} className="relative w-full">
            <canvas
                ref={canvasRef}
                onClick={onClick}
                className="block rounded-full border border-border bg-[var(--color-surface-2)]"
            />
            {/* Ring labels */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted">
                    {radiusKm} km
                </div>
                <div className="absolute right-2 top-1/2 mt-[-25%] text-[10px] text-muted">
                    {(radiusKm * 0.75).toFixed(1)}
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Helpers -------------------------------------------------------------------
// ---------------------------------------------------------------------------

function colorForTone(tone: string): { bg: string; fg: string } {
    switch (tone) {
        case 'blue':   return { bg: '#3b82f6', fg: '#ffffff' };
        case 'green':  return { bg: '#16a34a', fg: '#ffffff' };
        case 'amber':  return { bg: '#f59e0b', fg: '#111827' };
        case 'rose':   return { bg: '#f43f5e', fg: '#ffffff' };
        case 'violet': return { bg: '#8b5cf6', fg: '#ffffff' };
        case 'teal':   return { bg: '#14b8a6', fg: '#ffffff' };
        case 'orange': return { bg: '#f97316', fg: '#ffffff' };
        default:       return { bg: '#64748b', fg: '#ffffff' };
    }
}

/** Turn `#rrggbb` (or any CSS colour) into `rgba(r,g,b,a)`. */
function hexA(hex: string, a: number): string {
    const s = hex.trim().replace('#', '');
    if (s.length === 6) {
        const r = parseInt(s.slice(0, 2), 16);
        const g = parseInt(s.slice(2, 4), 16);
        const b = parseInt(s.slice(4, 6), 16);
        return `rgba(${r},${g},${b},${a})`;
    }
    return hex;
}
