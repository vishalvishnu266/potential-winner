import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Check, Loader2, MapPin, Minus, Plus,
} from 'lucide-react';
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
            <PageHeader title={t.post.title} onBack={() => nav(-1)} back={t.common.back} />

            {!category ? (
                <>
                    <p className="mx-4 mt-3 text-sm font-medium text-muted">{t.post.whatDoYouNeed}</p>
                    <div className="mx-4 mt-3 grid grid-cols-3 gap-3">
                        {CATEGORIES.map((c) => (
                            <CategoryTile
                                key={c.key} Icon={c.Icon}
                                label={labelOf(t.category, c.key)}
                                tone={c.tone}
                                onClick={() => setCategory(c.key)}
                            />
                        ))}
                    </div>
                </>
            ) : (
                <SelectedCategoryCard
                    catKey={category}
                    label={labelOf(t.category, category)}
                    changeLabel={t.common.change}
                    categoryLabel={t.post.category}
                    onChange={() => setCategory('')}
                />
            )}

            {/* Description */}
            <div className="mx-4 mt-4">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
                    {t.post.shortNote}
                </label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t.post.notePlaceholder}
                    rows={3}
                    className="w-full rounded-2xl border border-[var(--color-hairline)] bg-[var(--color-surface)] p-3 text-[15px] shadow-[var(--shadow-card)] focus:border-primary focus:outline-none"
                />
                {guessed && !initialCategory && (
                    <p className="mt-1.5 text-xs text-muted">
                        {t.post.looksLike(labelOf(t.category, guessed))}
                    </p>
                )}
            </div>

            {/* Budget */}
            <div className="mx-4 mt-4">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
                    {t.post.budget}
                </label>
                <div className="flex items-center gap-2 rounded-2xl card p-2">
                    <button
                        onClick={() => setBudget((b) => Math.max(0, b - 50))}
                        className="press flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-surface-2)]"
                        aria-label={t.post.decrease}
                    >
                        <Minus size={20} />
                    </button>
                    <div className="flex-1 text-center text-2xl font-extrabold">₹{budget}</div>
                    <button
                        onClick={() => setBudget((b) => b + 50)}
                        className="press flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-surface-2)]"
                        aria-label={t.post.increase}
                    >
                        <Plus size={20} />
                    </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                    {PRICE_STEPS.map((p) => (
                        <button
                            key={p} onClick={() => setBudget(p)}
                            className={
                                'press rounded-full px-3 py-1.5 text-xs font-semibold ' +
                                (budget === p
                                    ? 'bg-grad-brand text-white shadow-[var(--shadow-brand)]'
                                    : 'border border-border bg-[var(--color-surface-2)]')
                            }
                        >₹{p}</button>
                    ))}
                </div>
            </div>

            {/* Location */}
            <div className="mx-4 mt-4 card p-3">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                    {t.post.where}
                </div>
                {geo.position ? (
                    <div className="flex items-center gap-2 text-sm">
                        <MapPin size={18} className="text-primary" />
                        <span>{geo.position.latitude.toFixed(4)}, {geo.position.longitude.toFixed(4)}</span>
                    </div>
                ) : (
                    <BigButton tone="ghost" icon={<MapPin size={18} />} onClick={() => geo.getCurrent()}>
                        {t.post.useMyLocation}
                    </BigButton>
                )}
                {geo.error && <div className="mt-2 text-xs text-[var(--color-bad)]">{geo.error}</div>}
            </div>

            {/* Submit */}
            <div className="mx-4 mt-6">
                <BigButton
                    tone="primary"
                    icon={posting ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
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

function SelectedCategoryCard({
    catKey, label, categoryLabel, changeLabel, onChange,
}: {
    catKey: CategoryKey; label: string;
    categoryLabel: string; changeLabel: string; onChange: () => void;
}) {
    const m = metaOf(catKey);
    const Icon = m.Icon;
    return (
        <div className="mx-4 mt-3 flex items-center gap-3 card p-3">
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl tint-${m.tone}`}>
                <Icon size={24} strokeWidth={2.2} />
            </div>
            <div className="flex-1">
                <div className="text-xs uppercase tracking-wide text-muted">{categoryLabel}</div>
                <div className="text-base font-bold">{label}</div>
            </div>
            <button
                onClick={onChange}
                className="press rounded-full border border-border px-3 py-1 text-xs font-semibold"
            >
                {changeLabel}
            </button>
        </div>
    );
}

// Compact reusable header used on every non-home page.
function PageHeader({ title, onBack, back }: { title: string; onBack: () => void; back: string }) {
    return (
        <header className="pt-safe-top sticky top-0 z-10 flex items-center gap-2 border-b border-[var(--color-hairline)] bg-[color:color-mix(in_srgb,var(--color-bg)_90%,transparent)] px-3 py-3 backdrop-blur-md">
            <button
                onClick={onBack} aria-label={back}
                className="press flex h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--color-surface-2)]"
            >
                <ArrowLeft size={22} />
            </button>
            <h1 className="text-lg font-bold">{title}</h1>
        </header>
    );
}
