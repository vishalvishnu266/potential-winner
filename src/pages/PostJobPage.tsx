import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import BigButton from '../components/BigButton';
import CategoryTile from '../components/CategoryTile';
import { CATEGORIES, CategoryKey, classify, metaOf, labelOf } from '../data/categories';
import { useLocation as useGeo } from '../composables/useLocation';
import { useAuth } from '../composables/useAuth';
import { api } from '../data/api';
import { useT } from '../i18n';

const PRICE_STEPS = [50, 100, 200, 500, 1000] as const;

export default function PostJobPage() {
    const nav = useNavigate();
    const t = useT();
    const [params] = useSearchParams();
    const { user } = useAuth();
    const geo = useGeo();

    const initialCategory = (params.get('category') ?? '') as CategoryKey | '';
    const [category, setCategory] = useState<CategoryKey | ''>(initialCategory);
    const [description, setDescription] = useState('');
    const [budget, setBudget] = useState<number>(200);
    const [posting, setPosting] = useState(false);

    useEffect(() => { geo.getCurrent(); /* eslint-disable-next-line */ }, []);

    const guessed = useMemo(() => description ? classify(description) : null, [description]);
    useEffect(() => {
        if (!category && guessed && guessed !== 'other') setCategory(guessed);
    }, [guessed, category]);

    async function submit() {
        if (!user)     { nav('/me'); return; }
        if (!category) { alert(t.post.pickCategoryFirst); return; }
        const pos = geo.position ?? (await geo.getCurrent())?.coords;
        if (!pos)      { alert(t.post.allowLocation); return; }

        setPosting(true);
        try {
            const job = await api.postJob({
                requester_id: user.userId,
                category,
                description: description || labelOf(t.category, category),
                lat: pos.latitude, lon: pos.longitude,
                budget,
            });
            nav(`/job/${job.id}`);
        } catch (e: any) {
            alert(t.post.failedToPost(e?.message ?? e));
        } finally { setPosting(false); }
    }

    return (
        <div className="min-h-full">
            <header className="pt-safe-top flex items-center gap-2 px-4 pb-2 pt-4">
                <button
                    onClick={() => nav(-1)} aria-label={t.common.back}
                    className="press flex h-10 w-10 items-center justify-center rounded-full border border-border bg-[var(--color-surface)] text-xl"
                >←</button>
                <h1 className="text-xl font-extrabold">{t.post.title}</h1>
            </header>

            {!category ? (
                <>
                    <p className="mx-5 mt-3 text-base text-muted">{t.post.whatDoYouNeed}</p>
                    <div className="mx-5 mt-2 grid grid-cols-3 gap-3">
                        {CATEGORIES.map((c) => (
                            <CategoryTile
                                key={c.key} emoji={c.emoji}
                                label={labelOf(t.category, c.key)}
                                tone={c.tone}
                                onClick={() => setCategory(c.key)}
                            />
                        ))}
                    </div>
                </>
            ) : (
                <div className="mx-5 mt-3 flex items-center gap-3 rounded-2xl border border-border bg-[var(--color-surface)] p-3">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-3xl tint-${metaOf(category).tone}`}>
                        {metaOf(category).emoji}
                    </div>
                    <div className="flex-1">
                        <div className="text-xs text-muted">{t.post.category}</div>
                        <div className="text-lg font-bold">{labelOf(t.category, category)}</div>
                    </div>
                    <button className="press rounded-full border border-border px-3 py-1 text-sm"
                            onClick={() => setCategory('')}>
                        {t.common.change}
                    </button>
                </div>
            )}

            <div className="mx-5 mt-4">
                <label className="mb-1 block text-sm font-semibold text-muted">
                    {t.post.shortNote}
                </label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t.post.notePlaceholder}
                    rows={3}
                    className="w-full rounded-2xl border border-border bg-[var(--color-surface)] p-3 text-base"
                />
                {guessed && !initialCategory && (
                    <p className="mt-1 text-xs text-muted">
                        {t.post.looksLike(labelOf(t.category, guessed))}
                    </p>
                )}
            </div>

            <div className="mx-5 mt-4">
                <label className="mb-1 block text-sm font-semibold text-muted">{t.post.budget}</label>
                <div className="flex items-center gap-2 rounded-2xl border border-border bg-[var(--color-surface)] p-2">
                    <button
                        onClick={() => setBudget((b) => Math.max(0, b - 50))}
                        className="press h-12 w-12 rounded-xl bg-[var(--color-surface-2)] text-2xl font-bold"
                        aria-label={t.post.decrease}
                    >−</button>
                    <div className="flex-1 text-center text-2xl font-extrabold">₹{budget}</div>
                    <button
                        onClick={() => setBudget((b) => b + 50)}
                        className="press h-12 w-12 rounded-xl bg-[var(--color-surface-2)] text-2xl font-bold"
                        aria-label={t.post.increase}
                    >+</button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                    {PRICE_STEPS.map((p) => (
                        <button
                            key={p} onClick={() => setBudget(p)}
                            className={
                                'press rounded-full border px-3 py-1 text-sm ' +
                                (budget === p ? 'bg-primary text-white border-primary' : 'border-border')
                            }
                        >₹{p}</button>
                    ))}
                </div>
            </div>

            <div className="mx-5 mt-4 rounded-2xl border border-border bg-[var(--color-surface)] p-3">
                <div className="mb-1 text-sm font-semibold text-muted">{t.post.where}</div>
                {geo.position ? (
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">📍</span>
                        <span className="text-sm">
                            {geo.position.latitude.toFixed(4)}, {geo.position.longitude.toFixed(4)}
                        </span>
                    </div>
                ) : (
                    <BigButton tone="blue" icon="📍" onClick={() => geo.getCurrent()}>
                        {t.post.useMyLocation}
                    </BigButton>
                )}
                {geo.error && <div className="mt-2 text-xs text-[var(--color-bad)]">{geo.error}</div>}
            </div>

            <div className="mx-5 mt-6">
                <BigButton
                    tone="good" icon={posting ? '⏳' : '✅'}
                    disabled={posting || !category}
                    onClick={submit}
                >
                    {posting ? t.post.posting : t.post.postJobNow}
                </BigButton>
            </div>

            <div className="h-8" />
        </div>
    );
}
