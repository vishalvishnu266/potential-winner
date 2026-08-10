import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, MapPin, Phone, Sparkles, Store } from 'lucide-react';
import { api, Sponsor } from '../data/api';
import { useLocation as useGeo } from '../composables/useLocation';
import { openInMaps } from '../data/maps';
import { hapticTap } from '../composables/useNative';
import { metaOf, labelOf } from '../data/categories';
import { useT } from '../i18n';

/**
 * The "Local" tab — a dedicated space for sponsored / paid listings.
 *
 * Design principles (per user's requirement "should not force user to see ads"):
 *   - The user has to *choose* to visit this tab.  Sponsors never appear
 *     as popups, modals, or interstitials anywhere else.
 *   - Sponsors do appear as one small, dismissible strip on Home so
 *     they can be discovered organically — but the strip is quiet
 *     (single row, no colour take-over) and it links here on tap.
 *   - This page is a plain list with no auto-play, no dark patterns.
 */
export default function LocalPage() {
    const t = useT();
    const nav = useNavigate();
    const geo = useGeo();
    const [sponsors, setSponsors] = useState<Sponsor[] | null>(null);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => { geo.getCurrent(); /* eslint-disable-next-line */ }, []);

    const load = useCallback(async () => {
        if (!geo.position) return;
        try {
            const list = await api.sponsorsNear(
                geo.position.latitude, geo.position.longitude, 50,
            );
            // Sort by distance for a fair, organic feel.
            list.sort((a, b) => a.distance_km - b.distance_km);
            setSponsors(list); setErr(null);
        } catch (e: any) { setErr(e?.message ?? 'Failed to load'); }
    }, [geo.position]);

    useEffect(() => { load(); }, [load]);

    return (
        <div className="min-h-full">
            <header className="pt-safe-top sticky top-0 z-10 flex items-center gap-2 border-b border-[var(--color-hairline)] bg-[color:color-mix(in_srgb,var(--color-bg)_90%,transparent)] px-3 py-3 backdrop-blur-md">
                <button
                    onClick={() => nav('/')} aria-label={t.common.back}
                    className="press flex h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--color-surface-2)]"
                ><ArrowLeft size={22} /></button>
                <div className="flex-1">
                    <h1 className="text-lg font-bold">{t.local.title}</h1>
                    <div className="text-xs text-muted">{t.local.subtitle}</div>
                </div>
            </header>

            {/* Same three-state rendering as FindWorkPage — never flash
             *  the Share-location button while a fix is being fetched. */}
            {!geo.position && geo.busy && (
                <div className="mx-4 mt-4 card flex items-center gap-3 p-4">
                    <Loader2 size={18} className="animate-spin text-muted" />
                    <div className="text-sm text-muted">{t.common.loading}</div>
                </div>
            )}
            {!geo.position && !geo.busy && (
                <div className="mx-4 mt-4 card p-6 text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-surface-2)]">
                        <MapPin size={24} className="text-muted" />
                    </div>
                    <div className="mb-3 text-sm text-muted">{t.work.needLocation}</div>
                    <button onClick={() => geo.getCurrent()}
                            className="press mx-auto rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-bold text-[var(--color-primary-fg)]">
                        {t.work.shareLocation}
                    </button>
                </div>
            )}
            {err && <div className="mx-4 mt-3 text-sm text-[var(--color-bad)]">{err}</div>}

            {sponsors && sponsors.length === 0 && (
                <div className="mx-4 mt-4 card p-8 text-center text-sm text-muted">
                    {t.local.empty}
                </div>
            )}

            <div className="mx-4 mt-4 space-y-2">
                {sponsors?.map((s) => <SponsorRow key={s.id} sponsor={s} />)}
            </div>

            {/* Encourages small businesses to sign up — self-service growth,
                still not intrusive because it lives on a dedicated tab. */}
            <div className="mx-4 mt-6 card p-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-surface-2)]">
                        <Store size={22} className="text-[var(--color-primary)]" />
                    </div>
                    <div className="flex-1">
                        <div className="text-[15px] font-semibold">{t.local.wantToList}</div>
                    </div>
                    <a
                        href="mailto:hello@dailygig.app"
                        className="press rounded-full bg-[var(--color-primary)] px-3 py-1.5 text-xs font-bold text-[var(--color-primary-fg)]"
                    >{t.local.contactUs}</a>
                </div>
            </div>

            <div className="h-8" />
        </div>
    );
}

function SponsorRow({ sponsor }: { sponsor: Sponsor }) {
    const meta = metaOf(sponsor.category);
    return (
        <div className="flex items-stretch gap-2">
            <a
                href={sponsor.phone ? `tel:${sponsor.phone}` : undefined}
                onClick={() => hapticTap()}
                className="press card flex flex-1 items-center gap-3 p-3"
            >
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl tint-${meta.tone}`}>
                    <meta.Icon size={22} strokeWidth={2.2} />
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                        <span className="font-semibold">{sponsor.name}</span>
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[9px] font-semibold uppercase text-muted">
                            <Sparkles size={9} strokeWidth={2.4} /> Local
                        </span>
                    </div>
                    <div className="text-xs text-muted">
                        {fmtKm(sponsor.distance_km)} away
                    </div>
                </div>
                {sponsor.phone && <Phone size={20} className="text-[var(--color-primary)]" />}
            </a>
            <button
                onClick={() => { hapticTap(); openInMaps({ lat: sponsor.lat, lon: sponsor.lon, label: sponsor.name }); }}
                aria-label="Open in map"
                className="press flex w-12 items-center justify-center card"
            ><MapPin size={20} className="text-muted" /></button>
        </div>
    );
}

function fmtKm(km: number) {
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}
