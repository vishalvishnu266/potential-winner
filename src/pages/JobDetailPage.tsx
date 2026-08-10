import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BigButton from '../components/BigButton';
import { api, Job } from '../data/api';
import { metaOf, labelOf } from '../data/categories';
import { useAuth } from '../composables/useAuth';
import { openDirections, openInMaps } from '../data/maps';
import { useT } from '../i18n';

const POLL_MS = 10_000;

/**
 * The "live job" screen used by both the requester and the doer.
 * The UI branches based on the user's role in the job.
 */
export default function JobDetailPage() {
    const { id = '' } = useParams();
    const nav = useNavigate();
    const t = useT();
    const { user } = useAuth();
    const [job, setJob] = useState<Job | null>(null);
    const [err, setErr] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        try { setJob(await api.getJob(id)); setErr(null); }
        catch (e: any) { setErr(e?.message ?? 'Failed to load'); }
    }, [id]);

    useEffect(() => {
        load();
        const tm = window.setInterval(load, POLL_MS);
        return () => clearInterval(tm);
    }, [load]);

    if (err) return <Wrap><div className="mx-5 mt-6 text-[var(--color-bad)]">{err}</div></Wrap>;
    if (!job) return <Wrap><div className="mx-5 mt-6 text-muted">{t.common.loading}</div></Wrap>;

    const meta = metaOf(job.category);
    const catLabel = labelOf(t.category, job.category);
    const iAmRequester = user?.userId === job.requester_id;
    const iAmDoer      = user?.userId != null && user.userId === job.accepted_by;

    async function accept() {
        if (!user) { nav('/me'); return; }
        setBusy(true);
        try { setJob(await api.acceptJob(job!.id, user.userId)); } finally { setBusy(false); }
    }
    async function done(role: 'requester' | 'doer') {
        setBusy(true);
        try { setJob(await api.markDone(job!.id, { role })); } finally { setBusy(false); }
    }
    async function confirmPayment(role: 'requester' | 'doer') {
        setBusy(true);
        try {
            setJob(await api.markDone(job!.id, {
                role,
                paid:     role === 'requester' ? true : undefined,
                received: role === 'doer'      ? true : undefined,
                payment_method: 'upi',
            }));
        } finally { setBusy(false); }
    }
    async function rate(rating: 1 | 2 | 3) {
        if (!user) return;
        const role = iAmRequester ? 'requester' : 'doer';
        setBusy(true);
        try { await api.rate(job!.id, role, rating); alert(t.job.thanksForRating); nav('/'); }
        catch (e: any) { alert(e?.message ?? 'Failed'); }
        finally { setBusy(false); }
    }

    return (
        <Wrap>
            <header className="pt-safe-top flex items-center gap-2 px-4 pb-2 pt-4">
                <button
                    onClick={() => nav(-1)} aria-label={t.common.back}
                    className="press flex h-10 w-10 items-center justify-center rounded-full border border-border bg-[var(--color-surface)] text-xl"
                >←</button>
                <h1 className="text-xl font-extrabold">{t.job.title}</h1>
            </header>

            <div className="mx-5 mt-2 flex items-center gap-3 rounded-2xl border border-border bg-[var(--color-surface)] p-3">
                <div className={`flex h-16 w-16 items-center justify-center rounded-2xl text-4xl tint-${meta.tone}`}>
                    {meta.emoji}
                </div>
                <div className="flex-1">
                    <div className="text-base font-bold">{job.description || catLabel}</div>
                    <div className="mt-0.5 text-xs text-muted">{catLabel}</div>
                </div>
                {job.budget != null && <div className="text-2xl font-extrabold">₹{job.budget}</div>}
            </div>

            <div className="mx-5 mt-3 grid grid-cols-2 gap-2">
                <button
                    onClick={() => openInMaps({ lat: job.lat, lon: job.lon, label: job.description || catLabel })}
                    className="press flex items-center justify-center gap-2 rounded-2xl border border-border bg-[var(--color-surface)] py-3 text-sm font-semibold"
                >
                    <span className="text-xl">🗺️</span> {t.job.viewOnMap}
                </button>
                <button
                    onClick={() => openDirections({ lat: job.lat, lon: job.lon })}
                    className="press flex items-center justify-center gap-2 rounded-2xl border border-border bg-[var(--color-surface)] py-3 text-sm font-semibold"
                >
                    <span className="text-xl">🧭</span> {t.job.directions}
                </button>
            </div>

            <div className="mx-5 mt-3 rounded-2xl border border-border bg-[var(--color-surface)] p-3">
                <div className="mb-2 text-xs font-semibold uppercase text-muted">{t.job.progress}</div>
                <StatusRow ok={job.accepted_by != null} label={t.job.acceptedByHelper} />
                <StatusRow ok={job.requester_done}       label={t.job.requesterMarkedDone} />
                <StatusRow ok={job.doer_done}            label={t.job.helperMarkedDone} />
                <StatusRow ok={job.requester_paid}       label={t.job.requesterPaid} />
                <StatusRow ok={job.doer_received}        label={t.job.helperReceived} />
            </div>

            <div className="mx-5 mt-4 space-y-3">
                {!job.accepted_by && !iAmRequester && (
                    <BigButton tone="good" icon="✅" disabled={busy} onClick={accept}>
                        {t.job.acceptThisJob}
                    </BigButton>
                )}
                {job.accepted_by && !iAmRequester && !iAmDoer && (
                    <div className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted">
                        {t.job.alreadyAccepted}
                    </div>
                )}

                {iAmRequester && !job.requester_done && job.accepted_by && (
                    <BigButton tone="primary" icon="🏁" disabled={busy} onClick={() => done('requester')}>
                        {t.job.markAsDone}
                    </BigButton>
                )}
                {iAmDoer && !job.doer_done && (
                    <BigButton tone="primary" icon="🏁" disabled={busy} onClick={() => done('doer')}>
                        {t.job.iFinished}
                    </BigButton>
                )}

                {job.requester_done && job.doer_done &&
                 !(job.requester_paid && job.doer_received) && (
                    <>
                        {iAmRequester && !job.requester_paid && (
                            <BigButton tone="warn" icon="💸" disabled={busy}
                                       onClick={() => confirmPayment('requester')}>
                                {t.job.iPaidUpi}
                            </BigButton>
                        )}
                        {iAmDoer && !job.doer_received && (
                            <BigButton tone="warn" icon="💰" disabled={busy}
                                       onClick={() => confirmPayment('doer')}>
                                {t.job.iReceivedPayment}
                            </BigButton>
                        )}
                        <div className="rounded-2xl border border-dashed border-border p-3 text-center text-xs text-muted">
                            {t.job.payHint}
                        </div>
                    </>
                )}

                {job.requester_done && job.doer_done &&
                 job.requester_paid && job.doer_received && (iAmRequester || iAmDoer) && (
                    <div className="rounded-2xl border border-border bg-[var(--color-surface)] p-3 text-center">
                        <div className="mb-2 text-sm font-semibold">{t.job.howWasIt}</div>
                        <div className="flex justify-around">
                            <RateBtn emoji="😞" onClick={() => rate(1)} />
                            <RateBtn emoji="😐" onClick={() => rate(2)} />
                            <RateBtn emoji="😊" onClick={() => rate(3)} />
                        </div>
                    </div>
                )}
            </div>

            <div className="h-8" />
        </Wrap>
    );
}

function StatusRow({ ok, label }: { ok: boolean; label: string }) {
    return (
        <div className="flex items-center gap-2 py-1">
            <span className={ok ? 'text-[var(--color-good)]' : 'text-muted'}>
                {ok ? '✅' : '⚪'}
            </span>
            <span className={ok ? 'font-semibold' : 'text-muted'}>{label}</span>
        </div>
    );
}
function RateBtn({ emoji, onClick }: { emoji: string; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="press flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-[var(--color-surface-2)] text-4xl"
            aria-label={`Rate ${emoji}`}
        >{emoji}</button>
    );
}
function Wrap({ children }: { children: React.ReactNode }) {
    return <div className="min-h-full">{children}</div>;
}
