import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Globe, List, Loader2, MapPin, Phone, Radar as RadarIcon, Sparkles,
} from 'lucide-react';
import { CATEGORIES, CategoryKey, metaOf, labelOf } from '../data/categories';
import { useLocation as useGeo } from '../composables/useLocation';
import { useHeading } from '../composables/useHeading';
import { api, NearbyResp, Job, Sponsor } from '../data/api';
import { hapticTap } from '../composables/useNative';
import { bearingDeg } from '../data/mockJobs';
import { openInMaps } from '../data/maps';
import Radar, { RadarPoint } from '../components/Radar';
import { useT, type Messages } from '../i18n';

const RADII = [1, 2, 5, 10, 25] as const;
const POLL_MS = 30_000;
type ViewMode = 'list' | 'radar';

export default function FindWorkPage() {
    const nav = useNavigate();
    const t = useT();
    const [params] = useSearchParams();
    const geo = useGeo();
    const heading = useHeading();

    const [radius, setRadius] = useState<number>(5);
    const [category, setCategory] = useState<CategoryKey | ''>(
        (params.get('category') as CategoryKey) ?? '',
    );
    const [view, setView] = useState<ViewMode>('list');
    const [data, setData] = useState<NearbyResp | null>(null);
    const [err, setErr] = useState<string | null>(null);
    const timerRef = useRef<number | null>(null);

    useEffect(() => { geo.getCurrent(); /* eslint-disable-next-line */ }, []);

    const load = useCallback(async () => {
        if (!geo.position) return;
        try {
            const res = await api.nearby(
                geo.position.latitude, geo.position.longitude, radius,
                category || undefined,
            );
            setData(res); setErr(null);
        } catch (e: any) { setErr(e?.message ?? 'Failed to load'); }
    }, [geo.position, radius, category]);

    useEffect(() => {
        load();
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = window.setInterval(load, POLL_MS) as unknown as number;
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [load]);

    const jobs = useMemo(() => data?.jobs ?? [], [data]);
    const sponsors = useMemo(() => data?.sponsors ?? [], [data]);
    const radarPoints: RadarPoint[] = useMemo(() => {
        if (!geo.position) return [];
        return jobs.map((j) => ({
            id: j.id,
            distance_km: j.distance_km ?? 0,
            bearing_deg: bearingDeg(
                geo.position!.latitude, geo.position!.longitude, j.lat, j.lon,
            ),
            category: j.category,
        }));
    }, [jobs, geo.position]);

    return (
        <div className="min-h-full">
            {/* Header */}
            <header className="pt-safe-top sticky top-0 z-10 flex items-center gap-2 border-b border-[var(--color-hairline)] bg-[color:color-mix(in_srgb,var(--color-bg)_90%,transparent)] px-3 py-3 backdrop-blur-md">
                <button
                    onClick={() => nav('/')} aria-label={t.common.back}
                    className="press flex h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--color-surface-2)]"
                ><ArrowLeft size={22} /></button>
                <h1 className="flex-1 text-lg font-bold">{t.work.title}</h1>
                <ViewToggle value={view} onChange={setView} t={t} />
            </header>

            {/* Category chips */}
            <div className="scrollbar-none mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
                <Chip Icon={Globe} label={t.work.allCats} active={!category}
                      onClick={() => { hapticTap(); setCategory(''); }} />
                {CATEGORIES.filter(c => c.key !== 'other').map((c) => (
                    <Chip
                        key={c.key} Icon={c.Icon}
                        label={labelOf(t.category, c.key)}
                        active={category === c.key}
                        onClick={() => { hapticTap(); setCategory(c.key); }}
                    />
                ))}
            </div>

            {/* Radius */}
            <div className="mx-4 mt-3 card p-3">
                <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="uppercase tracking-wide text-muted">{t.work.distance}</span>
                    <span className="font-semibold">{t.work.withinKm(radius)}</span>
                </div>
                <div className="flex justify-between gap-2">
                    {RADII.map((r) => (
                        <button
                            key={r}
                            onClick={() => { hapticTap(); setRadius(r); }}
                            className={
                                'press flex-1 rounded-xl py-2 text-xs font-semibold ' +
                                (radius === r
                                    ? 'bg-grad-brand text-white shadow-[var(--shadow-brand)]'
                                    : 'border border-border bg-[var(--color-surface-2)]')
                            }
                        >{t.common.kmShort(r)}</button>
                    ))}
                </div>
            </div>

            {/* Location states:
             *   1. `busy` = actively fetching a fix → show spinner (no button flash).
             *   2. Have `position` → nothing to show, content follows.
             *   3. No position + not busy → we tried and failed OR haven't asked
             *      (permission denied/prompted).  Show the Share-location gate.
             *
             * The previous version rendered #3 while #1 was true, causing the
             * "Share location" button to flash briefly before disappearing.
             */}
            {!geo.position && geo.busy && (
                <div className="mx-4 mt-4 card flex items-center gap-3 p-4">
                    <Loader2 size={18} className="animate-spin text-muted" />
                    <div className="text-sm text-muted">{t.common.loading}</div>
                </div>
            )}
            {!geo.position && !geo.busy && (
                <div className="mx-4 mt-4 card p-6 text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl tint-blue">
                        <MapPin size={26} />
                    </div>
                    <div className="mb-3 text-sm text-muted">{t.work.needLocation}</div>
                    <button onClick={() => geo.getCurrent()}
                            className="press mx-auto rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-bold text-[var(--color-primary-fg)] shadow-[var(--shadow-brand)]">
                        {t.work.shareLocation}
                    </button>
                </div>
            )}
            {err && <div className="mx-4 mt-3 text-sm text-[var(--color-bad)]">{err}</div>}

            {view === 'radar' ? (
                <div className="mx-4 mt-4">
                    <div className="card p-4">
                        <Radar
                            radiusKm={radius}
                            points={radarPoints}
                            headingDeg={heading.heading ?? 0}
                            topLabel="N"
                            onPointTap={(p) => nav(`/job/${p.id}`)}
                        />
                        <div className="mt-3 text-center text-xs text-muted">
                            {t.work.radarHint(radarPoints.length)}
                        </div>
                        {heading.permission === 'prompt' && (
                            <button
                                onClick={() => heading.request()}
                                className="press mx-auto mt-3 block rounded-full border border-border px-4 py-2 text-xs font-semibold"
                            >{t.work.enableCompass}</button>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    {sponsors.length > 0 && (
                        <div className="mx-4 mt-4">
                            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                                <Sparkles size={14} /> {t.work.sponsored}
                            </div>
                            <div className="space-y-2">
                                {sponsors.map((s) => <SponsorCard key={s.id} sponsor={s} t={t} />)}
                            </div>
                        </div>
                    )}

                    <div className="mx-4 mt-4 space-y-2">
                        {jobs.length === 0 && geo.position && !err && (
                            <div className="card whitespace-pre-line p-8 text-center text-sm text-muted">
                                {t.work.noJobs(radius)}
                            </div>
                        )}
                        {jobs.map((j) => (
                            <JobCard
                                key={j.id} job={j} t={t}
                                onOpen={() => nav(`/job/${j.id}`)}
                                onMap={() => openInMaps({
                                    lat: j.lat, lon: j.lon,
                                    label: j.description || labelOf(t.category, j.category),
                                })}
                            />
                        ))}
                    </div>
                </>
            )}

            <div className="h-8" />
        </div>
    );
}

// --- helpers ----------------------------------------------------------------

function ViewToggle({ value, onChange, t }: {
    value: ViewMode; onChange: (v: ViewMode) => void; t: Messages;
}) {
    const btn = (v: ViewMode, Icon: typeof List, label: string) => (
        <button
            onClick={() => { hapticTap(); onChange(v); }}
            aria-pressed={value === v} aria-label={label}
            className={
                'press flex h-9 w-9 items-center justify-center rounded-full ' +
                (value === v
                    ? 'bg-grad-brand text-white shadow-[var(--shadow-brand)]'
                    : 'bg-[var(--color-surface-2)] text-muted')
            }
        >
            <Icon size={18} strokeWidth={2.2} />
        </button>
    );
    return (
        <div className="flex gap-1" role="tablist">
            {btn('list',  List,      t.work.listView)}
            {btn('radar', RadarIcon, t.work.radarView)}
        </div>
    );
}

function Chip({ Icon, label, active, onClick }: {
    Icon: typeof List; label: string; active: boolean; onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={
                'press flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ' +
                (active
                    ? 'bg-grad-brand text-white shadow-[var(--shadow-brand)]'
                    : 'border border-border bg-[var(--color-surface)]')
            }
        >
            <Icon size={14} strokeWidth={2.2} /><span>{label}</span>
        </button>
    );
}

function JobCard({ job, onOpen, onMap, t }: {
    job: Job; onOpen: () => void; onMap: () => void; t: Messages;
}) {
    const meta = metaOf(job.category);
    const catLabel = labelOf(t.category, job.category);
    return (
        <div className="flex items-stretch gap-2">
            <button
                onClick={onOpen}
                className="press card flex flex-1 items-center gap-3 p-3 text-left"
            >
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl tint-${meta.tone}`}>
                    <meta.Icon size={24} strokeWidth={2.2} />
                </div>
                <div className="flex-1 overflow-hidden">
                    <div className="truncate text-[15px] font-bold">{job.description || catLabel}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                        <span>{catLabel}</span>
                        {typeof job.distance_km === 'number' && (<>· <span>{fmtDist(job.distance_km, t)}</span></>)}
                    </div>
                </div>
                {job.budget != null && (
                    <div className="text-right">
                        <div className="text-lg font-extrabold text-grad-brand">₹{job.budget}</div>
                    </div>
                )}
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); hapticTap(); onMap(); }}
                aria-label={t.work.openInMaps}
                className="press flex w-12 items-center justify-center card"
            >
                <MapPin size={20} className="text-muted" />
            </button>
        </div>
    );
}

function SponsorCard({ sponsor, t }: { sponsor: Sponsor; t: Messages }) {
    const meta = metaOf(sponsor.category);
    return (
        <div className="flex items-stretch gap-2">
            <a
                href={sponsor.phone ? `tel:${sponsor.phone}` : undefined}
                className="press card flex flex-1 items-center gap-3 p-3 border-2 border-[var(--color-warn)]/50"
            >
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl tint-${meta.tone}`}>
                    <meta.Icon size={22} strokeWidth={2.2} />
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <div className="font-bold">{sponsor.name}</div>
                        <span className="rounded-full bg-[var(--color-warn)] px-2 py-0.5 text-[10px] font-bold uppercase text-black">
                            {t.work.sponsored}
                        </span>
                    </div>
                    <div className="text-xs text-muted">
                        {labelOf(t.category, sponsor.category)} · {fmtDist(sponsor.distance_km, t)}
                    </div>
                </div>
                {sponsor.phone && <Phone size={20} className="text-primary" />}
            </a>
            <button
                onClick={() => { hapticTap(); openInMaps({ lat: sponsor.lat, lon: sponsor.lon, label: sponsor.name }); }}
                aria-label={t.work.openInMaps}
                className="press flex w-12 items-center justify-center card"
            >
                <MapPin size={20} className="text-muted" />
            </button>
        </div>
    );
}

function fmtDist(km: number, t: Messages) {
    if (km < 1) return t.common.mShort(Math.round(km * 1000));
    return t.common.kmShort(Number(km.toFixed(km < 10 ? 1 : 0)));
}
