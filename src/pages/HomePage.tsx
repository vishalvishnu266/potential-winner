import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ModeToggle, { AppMode } from '../components/ModeToggle';
import CategoryTile from '../components/CategoryTile';
import BigButton from '../components/BigButton';
import { CATEGORIES, labelOf } from '../data/categories';
import { useStorage } from '../composables/useStorage';
import { useAuth } from '../composables/useAuth';
import { useT } from '../i18n';

const MODE_KEY = 'dg.mode';

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
            <header className="pt-safe-top px-5 pb-3 pt-4">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-2xl font-extrabold tracking-tight">{t.app.name}</div>
                        <div className="text-sm text-muted">{greet}</div>
                    </div>
                    <button
                        onClick={() => nav('/me')}
                        aria-label={t.common.profile}
                        className="press flex h-12 w-12 items-center justify-center rounded-full border border-border bg-[var(--color-surface)] text-2xl"
                    >
                        👤
                    </button>
                </div>
            </header>

            <div className="px-5">
                <ModeToggle value={mode} onChange={changeMode} />
            </div>

            <p className="mx-5 mt-4 text-base text-muted">
                {mode === 'help' ? t.home.pickHelp : t.home.pickWork}
            </p>

            <div className="mx-5 mt-3 grid grid-cols-3 gap-3">
                {CATEGORIES.map((c) => (
                    <CategoryTile
                        key={c.key}
                        emoji={c.emoji}
                        label={labelOf(t.category, c.key)}
                        tone={c.tone}
                        onClick={() => pick(c.key)}
                    />
                ))}
            </div>

            <div className="mx-5 mt-6 space-y-3">
                {mode === 'help' ? (
                    <BigButton tone="primary" icon="➕" onClick={() => nav('/post')}>
                        {t.home.postNew}
                    </BigButton>
                ) : (
                    <BigButton tone="good" icon="🔍" onClick={() => nav('/work')}>
                        {t.home.seeAll}
                    </BigButton>
                )}
                <BigButton tone="bad" icon="🆘" onClick={() => alert(t.home.sosSoon)}>
                    {t.home.sos}
                </BigButton>
            </div>

            <div className="h-6" />
        </div>
    );
}
