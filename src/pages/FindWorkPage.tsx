import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
            <header className="pt-safe-top flex items-center gap-2 px-4 pb-2 pt-4">
                <button
                    onClick={() => nav('/')} aria-label={t.common.back}
                    className="press flex h-10 w-10 items-center justify-center rounded-full border border-border bg-[var(--color-surface)] text-xl"
                >←</button>
                <h1 className="flex-1 text-xl font-extrabold">{t.work.title}</h1>
                <ViewToggle value={view} onChange={setView} t={t} />
            </header>

            <div className="mx-2 mt-1 flex gap-2 overflow-x-auto px-3 pb-1">
                <Chip label={t.work.allCats} emoji="🌐" active={!category}
                      onClick={() => { hapticTap(); setCategory(''); }} />
                {CATEGORIES.filter(c => c.key !== 'other').map((c) => (
                    <Chip
                        key={c.key}
                        label={labelOf(t.category, c.key)}
                        emoji={c.emoji}
                        active={category === c.key}
                        onClick={() => { hapticTap(); setCategory(c.key); }}
                    />
                ))}
            </div>

            <div className="mx-5 mt-3 rounded-2xl border border-border bg-[var(--color-surface)] p-3">
                <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-muted">{t.work.distance}</span>
                    <span className="font-semibold">{t.work.withinKm(radius)}</span>
                </div>
                <div className="flex justify-between gap-2">
                    {RADII.map((r) => (
                        <button
                            key={r}
                            onClick={() => { hapticTap(); setRadius(r); }}
                            className={
                                'press flex-1 rounded-xl border py-2 text-sm font-semibold ' +
                                (radius === r
                                    ? 'bg-primary text-white border-primary'
                                    : 'border-border bg-[var(--color-surface-2)]')
                            }
                        >{t.common.kmShort(r)}</button>
                    ))}
                </div>
            </div>

            {!geo.position && (
                <div className="mx-5 mt-3 rounded-2xl border border-border bg-[var(--color-surface)] p-4 text-center">
                    <div className="mb-2 text-4xl">📍</div>
                    <div className="mb-3 text-sm text-muted">{t.work.needLocation}</div>
                    <button onClick={() => geo.getCurrent()}
                            className="press mx-auto rounded-xl bg-primary px-4 py-2 font-bold text-white">
                        {t.work.shareLocation}
                    </button>
                </div>
            )}
            {err && <div className="mx-5 mt-3 text-sm text-[var(--color-bad)]">{err}</div>}

            {view === 'radar' ? (
                <div className="mx-5 mt-4">
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
                            className="press mx-auto mt-3 block rounded-full border border-border px-4 py-2 text-sm"
                        >
                            {t.work.enableCompass}
                        </button>
                    )}
                </div>
            ) : (
                <>
                    {sponsors.length > 0 && (
                        <div className="mx-5 mt-4">
                            <div className="mb-1 text-xs font-semibold uppercase text-muted">{t.work.sponsored}</div>
                            <div className="space-y-2">
                                {sponsors.map((s) => <SponsorCard key={s.id} sponsor={s} t={t} />)}
                            </div>
                        </div>
                    )}

                    <div className="mx-5 mt-4 space-y-2">
                        {jobs.length === 0 && geo.position && !err && (
                            <div className="whitespace-pre-line rounded-2xl border border-dashed border-border p-8 text-center text-muted">
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
    const btn = (v: ViewMode, emoji: string, label: string) => (
        <button
            onClick={() => { hapticTap(); onChange(v); }}
            aria-pressed={value === v} aria-label={label}
            className={
                'press flex h-10 w-10 items-center justify-center rounded-full text-lg ' +
                (value === v
                    ? 'bg-primary text-[var(--color-primary-fg)]'
                    : 'border border-border bg-[var(--color-surface)] text-muted')
            }
        >{emoji}</button>
    );
    return (
        <div className="flex gap-1" role="tablist">
            {btn('list',  '📋', t.work.listView)}
            {btn('radar', '🎯', t.work.radarView)}
        </div>
    );
}

function Chip({ emoji, label, active, onClick }:
              { emoji: string; label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={
                'press flex shrink-0 items-center gap-1 rounded-full border px-3 py-2 text-sm font-semibold ' +
                (active ? 'bg-primary text-white border-primary'
                        : 'border-border bg-[var(--color-surface)]')
            }
        >
            <span>{emoji}</span><span>{label}</span>
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
                className="press flex flex-1 items-center gap-3 rounded-2xl border border-border bg-[var(--color-surface)] p-3 text-left"
            >
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl tint-${meta.tone}`}>
                    {meta.emoji}
                </div>
                <div className="flex-1 overflow-hidden">
                    <div className="truncate text-base font-bold">{job.description || catLabel}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                        <span>{catLabel}</span>
                        {typeof job.distance_km === 'number' && (<>· <span>{fmtDist(job.distance_km, t)}</span></>)}
                    </div>
                </div>
                {job.budget != null && (
                    <div className="text-right">
                        <div className="text-lg font-extrabold">₹{job.budget}</div>
                    </div>
                )}
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); hapticTap(); onMap(); }}
                aria-label={t.work.openInMaps}
                className="press flex w-12 items-center justify-center rounded-2xl border border-border bg-[var(--color-surface)] text-2xl"
            >🗺️</button>
        </div>
    );
}

function SponsorCard({ sponsor, t }: { sponsor: Sponsor; t: Messages }) {
    const meta = metaOf(sponsor.category);
    return (
        <div className="flex items-stretch gap-2">
            <a
                href={sponsor.phone ? `tel:${sponsor.phone}` : undefined}
                className="press flex flex-1 items-center gap-3 rounded-2xl border-2 border-[var(--color-warn)] bg-[var(--color-surface)] p-3"
            >
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl tint-${meta.tone}`}>
                    {meta.emoji}
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
                {sponsor.phone && <span className="text-2xl">📞</span>}
            </a>
            <button
                onClick={() => { hapticTap(); openInMaps({ lat: sponsor.lat, lon: sponsor.lon, label: sponsor.name }); }}
                aria-label={t.work.openInMaps}
                className="press flex w-12 items-center justify-center rounded-2xl border border-border bg-[var(--color-surface)] text-2xl"
            >🗺️</button>
        </div>
    );
}

function fmtDist(km: number, t: Messages) {
    if (km < 1) return t.common.mShort(Math.round(km * 1000));
    return t.common.kmShort(Number(km.toFixed(km < 10 ? 1 : 0)));
}
