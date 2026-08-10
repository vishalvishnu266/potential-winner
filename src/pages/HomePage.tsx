import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ShieldAlert, User } from 'lucide-react';
import ModeToggle, { AppMode } from '../components/ModeToggle';
import CategoryTile from '../components/CategoryTile';
import BigButton from '../components/BigButton';
import SponsorStrip from '../components/SponsorStrip';
import { CATEGORIES, labelOf } from '../data/categories';
import { useStorage } from '../composables/useStorage';
import { useAuth } from '../composables/useAuth';
import { useT } from '../i18n';

const MODE_KEY = 'dg.mode';

/**
 * Home = a modern feed-style layout with a stories-esque header + a
 * segmented mode toggle + colourful category tiles.  Instagram/Facebook
 * users should feel right at home.
 */
export default function HomePage() {
    const nav = useNavigate();
    const t = useT();
    const [mode, setMode] = useState<AppMode>('help');
    const { user } = useAuth();
    const storage = useStorage();

    useEffect(() => {
        (async () => {
            const m = await storage.get(MODE_KEY);
            if (m === 'help' || m === 'work') setMode(m);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function changeMode(m: AppMode) {
        setMode(m); await storage.set(MODE_KEY, m);
    }
    function pick(catKey: string) {
        if (mode === 'help') nav(`/post?category=${catKey}`);
        else nav(`/work?category=${catKey}`);
    }

    const greet = user?.name ? t.app.hi(user.name.split(' ')[0]) : t.app.welcome;

    return (
        <div className="min-h-full">
            {/* Sticky IG-style top bar */}
            <header className="pt-safe-top sticky top-0 z-10 flex items-center justify-between px-4 py-3 backdrop-blur-md bg-[color:color-mix(in_srgb,var(--color-bg)_85%,transparent)]">
                <div>
                    <div className="text-2xl font-extrabold tracking-tight text-grad-brand">
                        {t.app.name}
                    </div>
                    <div className="mt-0.5 text-xs text-muted">{greet}</div>
                </div>
                <button
                    onClick={() => nav('/me')}
                    aria-label={t.common.profile}
                    className="press ring-brand"
                >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-surface)] text-muted">
                        <User size={20} />
                    </span>
                </button>
            </header>

            {/* Mode segmented control */}
            <div className="px-4">
                <ModeToggle value={mode} onChange={changeMode} />
            </div>

            {/* Section title */}
            <p className="mx-4 mt-5 text-sm font-medium text-muted">
                {mode === 'help' ? t.home.pickHelp : t.home.pickWork}
            </p>

            {/* Category grid */}
            <div className="mx-4 mt-3 grid grid-cols-3 gap-3">
                {CATEGORIES.map((c) => (
                    <CategoryTile
                        key={c.key}
                        Icon={c.Icon}
                        label={labelOf(t.category, c.key)}
                        tone={c.tone}
                        onClick={() => pick(c.key)}
                    />
                ))}
            </div>

            {/* Organic, dismissible sponsor discovery — never a popup. */}
            <SponsorStrip />

            {/* Bottom CTAs */}
            <div className="mx-4 mt-6 space-y-3">
                {mode === 'help' ? (
                    <BigButton tone="primary" icon={<Plus size={20} />} onClick={() => nav('/post')}>
                        {t.home.postNew}
                    </BigButton>
                ) : (
                    <BigButton tone="good" icon={<Search size={20} />} onClick={() => nav('/work')}>
                        {t.home.seeAll}
                    </BigButton>
                )}
                <BigButton
                    tone="outline"
                    icon={<ShieldAlert size={20} className="text-[var(--color-bad)]" />}
                    onClick={() => alert(t.home.sosSoon)}
                    className="text-[var(--color-bad)] border-[var(--color-bad)]/30"
                >
                    {t.home.sos}
                </BigButton>
            </div>

            <div className="h-6" />
        </div>
    );
}
