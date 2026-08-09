import { useEffect, useMemo, useRef, useState } from 'react';
import PageHeader from '../components/PageHeader';
import Section from '../components/Section';
import Button from '../components/Button';
import Card from '../components/Card';
import KeyValueRow from '../components/KeyValueRow';
import { useLocation } from '../composables/useLocation';
import { useHeading } from '../composables/useHeading';
import { callNumber, openInMap, navigateTo } from '../composables/useIntents';
import {
    generateNearbyJobs,
    distanceKm,
    bearingDeg,
    formatAgo,
    type Job,
} from '../data/mockJobs';

type View = 'list' | 'radar';

/**
 * Nearby jobs / rides — the "no-map" MVP.
 *
 * User picks a radius and a view mode; we generate a synthetic set of
 * jobs around their current GPS fix (swap `generateNearbyJobs` for a
 * real backend call later). Tapping a job opens an action sheet with
 *   - 📞 Call → native dialer via `tel:`
 *   - 🗺️ Show on map → hands off to Google/Apple Maps via `geo:` intent
 *   - 🧭 Navigate → jumps into Google Maps turn-by-turn navigation
 *
 * This buys you Google-map accuracy for free without shipping any map
 * SDK, API key, or tile server. When you eventually want an in-app map,
 * add a MapView component — the data & actions here stay unchanged.
 */

const CATEGORY_META: Record<Job['category'], { label: string; emoji: string; tone: string }> = {
    ride: { label: 'Ride', emoji: '🚗', tone: 'bg-blue-50 text-blue-700' },
    delivery: { label: 'Delivery', emoji: '📦', tone: 'bg-amber-50 text-amber-700' },
    gig: { label: 'Gig', emoji: '🧰', tone: 'bg-emerald-50 text-emerald-700' },
};

const RADII = [1, 2, 5, 10, 25] as const;

export default function NearbyPage() {
    const { position, permission, requestPermission, getCurrent } = useLocation();
    const [view, setView] = useState<View>('list');
    const [radius, setRadius] = useState<number>(5);
    const [category, setCategory] = useState<Job['category'] | 'all'>('all');
    const [selected, setSelected] = useState<Job | null>(null);
    const [tick, setTick] = useState(0); // for "posted N sec ago" refresh

    // Kick a permission check + first fix on mount.
    useEffect(() => {
        (async () => {
            if (permission !== 'granted') await requestPermission();
            if (!position) await getCurrent();
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Refresh "postedAt" label every 30s so the list feels alive.
    useEffect(() => {
        const t = setInterval(() => setTick((n) => n + 1), 30_000);
        return () => clearInterval(t);
    }, []);

    // Generate + filter + sort jobs whenever inputs change.
    const jobs = useMemo(() => {
        if (!position) return [] as (Job & { distance: number; bearing: number })[];
        const raw = generateNearbyJobs(position.latitude, position.longitude, radius, 30);
        return raw
            .map((j) => ({
                ...j,
                distance: distanceKm(position.latitude, position.longitude, j.latitude, j.longitude),
                bearing: bearingDeg(position.latitude, position.longitude, j.latitude, j.longitude),
            }))
            .filter((j) => j.distance <= radius)
            .filter((j) => category === 'all' || j.category === category)
            .sort((a, b) => a.distance - b.distance);
    }, [position, radius, category, tick]);

    async function refresh() {
        await getCurrent();
    }

    return (
        <div className="min-h-full">
            <PageHeader title="Nearby" subtitle="Jobs & rides around you" />

            {/* Controls */}
            <Section>
                {/* View toggle */}
                <div className="mb-3 inline-flex overflow-hidden rounded-full border border-border bg-surface p-0.5">
                    {(['list', 'radar'] as const).map((v) => (
                        <button
                            key={v}
                            onClick={() => setView(v)}
                            className={[
                                'cursor-pointer rounded-full px-4 py-1.5 text-xs font-semibold transition-colors',
                                view === v ? 'bg-primary text-white' : 'text-muted',
                            ].join(' ')}
                        >
                            {v === 'list' ? '📋 List' : '🎯 Radar'}
                        </button>
                    ))}
                </div>

                {/* Radius chips */}
                <div className="mb-2 flex flex-wrap gap-2">
                    {RADII.map((r) => (
                        <button
                            key={r}
                            onClick={() => setRadius(r)}
                            className={[
                                'cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold',
                                radius === r
                                    ? 'border-primary bg-primary text-white'
                                    : 'border-border bg-surface text-muted',
                            ].join(' ')}
                        >
                            {r} km
                        </button>
                    ))}
                </div>

                {/* Category filter */}
                <div className="flex flex-wrap gap-2">
                    {(['all', 'ride', 'delivery', 'gig'] as const).map((c) => (
                        <button
                            key={c}
                            onClick={() => setCategory(c)}
                            className={[
                                'cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold capitalize',
                                category === c
                                    ? 'border-primary bg-primary text-white'
                                    : 'border-border bg-surface text-muted',
                            ].join(' ')}
                        >
                            {c === 'all' ? 'All' : `${CATEGORY_META[c].emoji} ${CATEGORY_META[c].label}`}
                        </button>
                    ))}
                </div>
            </Section>

            {/* Location status */}
            {!position && (
                <Section>
                    <KeyValueRow label="Location" value={permission} />
                    <p className="mt-2 text-xs text-muted">
                        We need your location to find nearby jobs. Tap below to allow.
                    </p>
                    <Button fullWidth variant="primary" className="mt-2" onClick={refresh}>
                        Allow location & find jobs
                    </Button>
                </Section>
            )}

            {/* Results */}
            {position && (
                <>
                    {view === 'list' ? (
                        <ListView jobs={jobs} onSelect={setSelected} />
                    ) : (
                        <RadarView jobs={jobs} radiusKm={radius} onSelect={setSelected} />
                    )}


                    <div className="mx-5 mb-6 mt-1">
                        <Button fullWidth onClick={refresh}>🔄 Refresh location</Button>
                    </div>
                </>
            )}

            {selected && (
                <ActionSheet job={selected} onClose={() => setSelected(null)} />
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// List view
// ---------------------------------------------------------------------------

function ListView({
    jobs, onSelect,
}: {
    jobs: (Job & { distance: number; bearing: number })[];
    onSelect: (j: Job) => void;
}) {
    if (jobs.length === 0) {
        return (
            <Section>
                <p className="text-center text-sm text-muted">
                    Nothing in this radius. Try a bigger circle. 🗺️
                </p>
            </Section>
        );
    }
    return (
        <div className="mx-5 mt-3 flex flex-col gap-2 pb-3">
            {jobs.map((j) => (
                <button
                    key={j.id}
                    onClick={() => onSelect(j)}
                    className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 text-left transition-colors hover:bg-blue-50/40"
                >
                    <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg ${CATEGORY_META[j.category].tone}`}
                    >
                        {CATEGORY_META[j.category].emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                            <div className="truncate text-sm font-semibold text-text">{j.title}</div>
                            <div className="shrink-0 text-sm font-bold text-primary">₹{j.price}</div>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted">
                            <span>📍 {j.distance.toFixed(2)} km</span>
                            <span>·</span>
                            <span>{compassLabel(j.bearing)}</span>
                            <span>·</span>
                            <span>{formatAgo(j.postedAt)}</span>
                        </div>
                    </div>
                </button>
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Radar view
// ---------------------------------------------------------------------------

function RadarView({
    jobs, radiusKm, onSelect,
}: {
    jobs: (Job & { distance: number; bearing: number })[];
    radiusKm: number;
    onSelect: (j: Job) => void;
}) {
    const size = 300;             // square SVG viewport (px)
    const c = size / 2;
    const rings = [0.25, 0.5, 0.75, 1];
    const { heading, permission: headingPerm, request: requestHeading } = useHeading(0.18);

    // If we have a heading, counter-rotate the whole plot so that "up" on
    // screen always points to the direction the phone is facing (like a
    // real compass app). The user marker + range labels stay upright.
    const rot = heading ?? 0;
    const active = heading != null;

    // ---------------------------------------------------------------------
    // Zoom
    // ---------------------------------------------------------------------
    // `zoom` is a multiplier over the filter radius. zoom=1 → the outer
    // ring equals `radiusKm` (default, feels like "fit the whole radius").
    // zoom=4 → the outer ring shows only radiusKm/4 (4× closer view).
    // Jobs beyond the visible radius get clamped to the edge and rendered
    // as a small "→" hint pointing outward instead of stacking on the rim.
    const MIN_ZOOM = 1;
    const MAX_ZOOM = 8;
    const [zoom, setZoom] = useState(1);

    // Reset zoom when the user picks a different filter radius so they
    // don't stay accidentally zoomed in on a now-smaller area.
    useEffect(() => { setZoom(1); }, [radiusKm]);

    const visibleRadiusKm = radiusKm / zoom;

    // Auto-fit: pick a zoom that puts the farthest job at ~90 % of the
    // outer ring. If there are no jobs (or only one very close job), fall
    // back to zoom = 1.
    function autoFit() {
        if (jobs.length === 0) { setZoom(1); return; }
        const maxD = Math.max(...jobs.map((j) => j.distance));
        if (maxD <= 0.01) { setZoom(MAX_ZOOM); return; }
        const target = radiusKm / (maxD / 0.9);
        setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, target)));
    }

    function bump(delta: number) {
        setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z * (delta > 0 ? 1.4 : 1 / 1.4))));
    }

    // Pinch-to-zoom: track distance between two active touches.
    const pinchStartRef = useRef<{ dist: number; zoom: number } | null>(null);
    function onTouchStart(e: React.TouchEvent) {
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            pinchStartRef.current = { dist: Math.hypot(dx, dy), zoom };
        }
    }
    function onTouchMove(e: React.TouchEvent) {
        if (e.touches.length === 2 && pinchStartRef.current) {
            e.preventDefault();
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const d = Math.hypot(dx, dy);
            const factor = d / pinchStartRef.current.dist;
            const next = pinchStartRef.current.zoom * factor;
            setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next)));
        }
    }
    function onTouchEnd() { pinchStartRef.current = null; }

    // Desktop mouse-wheel zoom is a nice bonus for `npm run dev`.
    function onWheel(e: React.WheelEvent) {
        e.preventDefault();
        setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z * (e.deltaY < 0 ? 1.1 : 1 / 1.1))));
    }

    const visibleJobs = jobs.length;
    const jobsInsideView = jobs.filter((j) => j.distance <= visibleRadiusKm).length;
    const jobsOutsideView = visibleJobs - jobsInsideView;

    return (
        <div className="mx-5 mt-3 rounded-2xl border border-border bg-surface p-4">
            <div
                className="relative mx-auto touch-none select-none"
                style={{ width: size, height: size }}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                onWheel={onWheel}
            >
                <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full">
                    {/* Rotating layer — jobs + cardinal labels + rings */}
                    <g style={{
                        transform: active ? `rotate(${-rot}deg)` : undefined,
                        transformOrigin: `${c}px ${c}px`,
                        transition: 'transform 120ms linear',
                    }}>
                        {/* rings */}
                        {rings.map((r, i) => (
                            <circle
                                key={i}
                                cx={c} cy={c} r={c * r}
                                fill="none"
                                stroke="#e5e7eb"
                                strokeDasharray={i === rings.length - 1 ? '' : '3 3'}
                            />
                        ))}
                        {/* cross-hair */}
                        <line x1={c} y1={0} x2={c} y2={size} stroke="#e5e7eb" />
                        <line x1={0} y1={c} x2={size} y2={c} stroke="#e5e7eb" />

                        {/* cardinal labels — inside rotating group so N truly points north */}
                        <text x={c} y={12} textAnchor="middle" fontSize="10" fill="#ef4444" fontWeight="700">N</text>
                        <text x={c} y={size - 3} textAnchor="middle" fontSize="10" fill="#6b7280">S</text>
                        <text x={3} y={c + 4} fontSize="10" fill="#6b7280">W</text>
                        <text x={size - 10} y={c + 4} fontSize="10" fill="#6b7280">E</text>

                        {/* jobs */}
                        {jobs.map((j) => {
                            const inside = j.distance <= visibleRadiusKm;
                            const rNorm = inside ? j.distance / visibleRadiusKm : 1;
                            const rad = (j.bearing - 90) * (Math.PI / 180); // 0° = north = up
                            const x = c + Math.cos(rad) * c * rNorm * 0.95;
                            const y = c + Math.sin(rad) * c * rNorm * 0.95;
                            const meta = CATEGORY_META[j.category];
                            const r = inside ? 9 : 6;
                            return (
                                <g key={j.id} className="cursor-pointer" onClick={() => onSelect(j)}>
                                    <circle
                                        cx={x} cy={y} r={r}
                                        fill={meta.tone.includes('blue') ? '#dbeafe' : meta.tone.includes('amber') ? '#fef3c7' : '#d1fae5'}
                                        stroke={meta.tone.includes('blue') ? '#2563eb' : meta.tone.includes('amber') ? '#d97706' : '#059669'}
                                        strokeDasharray={inside ? '' : '2 2'}
                                    />
                                    {/* Counter-rotate emoji so it stays upright even while the plot spins. */}
                                    <g style={{
                                        transform: active ? `rotate(${rot}deg)` : undefined,
                                        transformOrigin: `${x}px ${y}px`,
                                    }}>
                                        {inside && (
                                            <text x={x} y={y + 3.5} textAnchor="middle" fontSize="10">
                                                {meta.emoji}
                                            </text>
                                        )}
                                    </g>
                                </g>
                            );
                        })}
                    </g>

                    {/* Non-rotating layer — user marker + "facing" cone */}
                    {active && (
                        <path
                            d={`M ${c} ${c} L ${c - 22} ${c - 40} A 45 45 0 0 1 ${c + 22} ${c - 40} Z`}
                            fill="#2563eb"
                            fillOpacity="0.12"
                            stroke="#2563eb"
                            strokeOpacity="0.35"
                        />
                    )}
                    <circle cx={c} cy={c} r={5} fill="#2563eb" />
                    <circle cx={c} cy={c} r={11} fill="none" stroke="#2563eb" strokeOpacity="0.35" />
                </svg>
            </div>

            <div className="mt-2 flex justify-around text-[11px] text-muted">
                {rings.map((r) => (
                    <span key={r}>{fmtDist(visibleRadiusKm * r)}</span>
                ))}
            </div>

            {/* Zoom controls */}
            <div className="mt-3 flex items-center gap-2">
                <button
                    onClick={() => bump(-1)}
                    disabled={zoom <= MIN_ZOOM + 0.001}
                    className="h-8 w-8 shrink-0 cursor-pointer rounded-full border border-border bg-surface text-lg font-bold text-text disabled:opacity-40"
                    aria-label="Zoom out"
                >−</button>
                <input
                    type="range"
                    min={MIN_ZOOM}
                    max={MAX_ZOOM}
                    step={0.1}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="flex-1 accent-primary"
                    aria-label="Zoom"
                />
                <button
                    onClick={() => bump(+1)}
                    disabled={zoom >= MAX_ZOOM - 0.001}
                    className="h-8 w-8 shrink-0 cursor-pointer rounded-full border border-border bg-surface text-lg font-bold text-text disabled:opacity-40"
                    aria-label="Zoom in"
                >+</button>
                <button
                    onClick={autoFit}
                    className="h-8 shrink-0 cursor-pointer rounded-full border border-border bg-surface px-3 text-[11px] font-semibold text-text"
                    aria-label="Auto fit"
                >Fit</button>
            </div>

            <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
                <span>
                    {jobsInsideView} in view
                    {jobsOutsideView > 0 && (
                        <span className="text-amber-600"> · {jobsOutsideView} beyond</span>
                    )}
                    {' · '}zoom {zoom.toFixed(1)}× ({fmtDist(visibleRadiusKm)} view)
                </span>
                {active ? (
                    <span className="font-semibold text-primary">
                        🧭 {Math.round(rot)}° {compassLabel(rot)}
                    </span>
                ) : headingPerm === 'unavailable' ? (
                    <span>Compass n/a</span>
                ) : (
                    <button
                        onClick={requestHeading}
                        className="cursor-pointer rounded-full border border-primary px-2 py-0.5 font-semibold text-primary"
                    >
                        Enable compass
                    </button>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Action sheet
// ---------------------------------------------------------------------------

function ActionSheet({ job, onClose }: { job: Job; onClose: () => void }) {
    const meta = CATEGORY_META[job.category];
    return (
        <div
            className="fixed inset-0 z-[500] flex items-end justify-center bg-slate-900/50"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md rounded-t-3xl bg-surface p-5 pb-safe-bottom shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />

                <div className="mb-3 flex items-center gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-full text-xl ${meta.tone}`}>
                        {meta.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="truncate text-base font-bold text-text">{job.title}</div>
                        <div className="text-xs text-muted">{meta.label} · {formatAgo(job.postedAt)}</div>
                    </div>
                    <div className="text-lg font-bold text-primary">₹{job.price}</div>
                </div>

                <Card className="mb-3">
                    <KeyValueRow label="Phone" value={job.phone} />
                    <KeyValueRow
                        label="Coords"
                        value={`${job.latitude.toFixed(5)}, ${job.longitude.toFixed(5)}`}
                    />
                </Card>

                <div className="grid grid-cols-1 gap-2">
                    <Button
                        fullWidth
                        variant="primary"
                        onClick={() => { callNumber(job.phone); onClose(); }}
                    >
                        📞 Call {job.phone}
                    </Button>
                    <Button
                        fullWidth
                        onClick={() => { openInMap(job.latitude, job.longitude, job.title); onClose(); }}
                    >
                        🗺️ Show on map
                    </Button>
                    <Button
                        fullWidth
                        onClick={() => { navigateTo(job.latitude, job.longitude, { label: job.title }); onClose(); }}
                    >
                        🧭 Navigate (Google Maps)
                    </Button>
                    <Button fullWidth variant="ghost" onClick={onClose}>Close</Button>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function compassLabel(deg: number) {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(deg / 45) % 8];
}

function fmtDist(km: number) {
    if (km >= 1) return `${km.toFixed(km < 10 ? 2 : 1)} km`;
    return `${Math.round(km * 1000)} m`;
}
