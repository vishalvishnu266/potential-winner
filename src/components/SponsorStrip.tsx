import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Sparkles, X } from 'lucide-react';
import { api, Sponsor } from '../data/api';
import { useLocation as useGeo } from '../composables/useLocation';
import { useStorage } from '../composables/useStorage';
import { metaOf, labelOf } from '../data/categories';
import { hapticTap } from '../composables/useNative';
import { useT } from '../i18n';

const DISMISS_KEY = 'dg.sponsorStripDismissedAt';
const HIDE_FOR_MS = 24 * 60 * 60 * 1000; // 24h after a dismiss

/**
 * A small, horizontal, opt-in strip that surfaces up to 3 sponsors on
 * the Home screen.  It is intentionally NOT a colour take-over — same
 * neutral card style as everything else, marked with a tiny "Local"
 * pill.  Users can:
 *   - Tap a card → opens LocalPage.
 *   - Tap the X  → hides the strip for 24 hours (persisted).
 *   - Ignore it  → nothing forces attention.
 *
 * Zero pop-ups, zero interstitials, zero auto-scroll.
 */
export default function SponsorStrip() {
    const t = useT();
    const nav = useNavigate();
    const geo = useGeo();
    const storage = useStorage();
    const [sponsors, setSponsors] = useState<Sponsor[]>([]);
    const [hidden, setHidden] = useState(true); // stay hidden until we know

    // Check dismissal timestamp once.
    useEffect(() => {
        (async () => {
            const raw = await storage.get(DISMISS_KEY);
            const dismissedAt = raw ? Number(raw) : 0;
            const stillHidden = Date.now() - dismissedAt < HIDE_FOR_MS;
            setHidden(stillHidden);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Fetch nearby sponsors only when not hidden + GPS known.  Silent.
    useEffect(() => {
        if (hidden || !geo.position) return;
        let cancelled = false;
        api.sponsorsNear(geo.position.latitude, geo.position.longitude, 25)
            .then((list) => {
                if (cancelled) return;
                list.sort((a, b) => a.distance_km - b.distance_km);
                setSponsors(list.slice(0, 3));
            })
            .catch(() => { /* silent — never blocks the app */ });
        return () => { cancelled = true; };
    }, [hidden, geo.position]);

    async function dismiss() {
        hapticTap();
        setHidden(true);
        await storage.set(DISMISS_KEY, String(Date.now()));
    }

    if (hidden || sponsors.length === 0) return null;

    return (
        <section className="mx-4 mt-4">
            <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                    <Sparkles size={12} strokeWidth={2.4} /> {t.local.title}
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => { hapticTap(); nav('/local'); }}
                        className="press flex items-center gap-0.5 rounded-full px-2 py-1 text-xs font-semibold text-[var(--color-primary)]"
                    >
                        {t.local.seeAllLocal} <ChevronRight size={14} />
                    </button>
                    <button
                        onClick={dismiss}
                        aria-label="Dismiss"
                        className="press flex h-7 w-7 items-center justify-center rounded-full hover:bg-[var(--color-surface-2)]"
                    ><X size={14} className="text-muted" /></button>
                </div>
            </div>
            {/* Horizontal scroll — non-blocking, degrades gracefully if the
                user just swipes past. */}
            <div className="flex gap-2 overflow-x-auto scrollbar-none">
                {sponsors.map((s) => (
                    <SponsorMini key={s.id} sponsor={s} onOpen={() => nav('/local')} />
                ))}
            </div>
        </section>
    );
}

function SponsorMini({ sponsor, onOpen }: { sponsor: Sponsor; onOpen: () => void }) {
    const t = useT();
    const meta = metaOf(sponsor.category);
    return (
        <button
            onClick={() => { hapticTap(); onOpen(); }}
            className="press card flex min-w-[180px] max-w-[220px] shrink-0 items-center gap-2 p-2.5 text-left"
        >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl tint-${meta.tone}`}>
                <meta.Icon size={18} strokeWidth={2.2} />
            </div>
            <div className="flex-1 overflow-hidden">
                <div className="truncate text-sm font-semibold">{sponsor.name}</div>
                <div className="truncate text-[11px] text-muted">
                    {labelOf(t.category, sponsor.category)}
                </div>
            </div>
        </button>
    );
}
