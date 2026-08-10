import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Check, Circle, CircleCheck, Compass, Flag,
  HandCoins, Handshake, Map as MapIcon, Smile, Meh, Frown,
} from 'lucide-react';
import BigButton from '../components/BigButton';
import { api, Job } from '../data/api';
import { metaOf, labelOf } from '../data/categories';
import { useAuth } from '../composables/useAuth';
import { openDirections, openInMaps } from '../data/maps';
import { useT } from '../i18n';

const POLL_MS = 10_000;

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

    if (err) return <Wrap><div className="mx-4 mt-6 text-[var(--color-bad)]">{err}</div></Wrap>;
    if (!job) return <Wrap><div className="mx-4 mt-6 text-muted">{t.common.loading}</div></Wrap>;

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
            <header className="pt-safe-top sticky top-0 z-10 flex items-center gap-2 border-b border-[var(--color-hairline)] bg-[color:color-mix(in_srgb,var(--color-bg)_90%,transparent)] px-3 py-3 backdrop-blur-md">
                <button
                    onClick={() => nav(-1)} aria-label={t.common.back}
                    className="press flex h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--color-surface-2)]"
                ><ArrowLeft size={22} /></button>
                <h1 className="text-lg font-bold">{t.job.title}</h1>
            </header>

            {/* Job hero */}
            <div className="mx-4 mt-3 card p-4">
                <div className="flex items-center gap-3">
                    <div className={`flex h-16 w-16 items-center justify-center rounded-2xl tint-${meta.tone}`}>
                        <meta.Icon size={30} strokeWidth={2.2} />
                    </div>
                    <div className="flex-1">
                        <div className="text-base font-bold">{job.description || catLabel}</div>
                        <div className="mt-0.5 text-xs text-muted">{catLabel}</div>
                    </div>
                    {job.budget != null && <div className="text-2xl font-extrabold text-grad-brand">₹{job.budget}</div>}
                </div>
            </div>

            {/* Map shortcuts */}
            <div className="mx-4 mt-3 grid grid-cols-2 gap-2">
                <button
                    onClick={() => openInMaps({ lat: job.lat, lon: job.lon, label: job.description || catLabel })}
                    className="press card flex items-center justify-center gap-2 py-3 text-sm font-semibold"
                >
                    <MapIcon size={18} className="text-primary" /> {t.job.viewOnMap}
                </button>
                <button
                    onClick={() => openDirections({ lat: job.lat, lon: job.lon })}
                    className="press card flex items-center justify-center gap-2 py-3 text-sm font-semibold"
                >
                    <Compass size={18} className="text-primary" /> {t.job.directions}
                </button>
            </div>

            {/* Progress */}
            <div className="mx-4 mt-3 card p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                    {t.job.progress}
                </div>
                <Step ok={job.accepted_by != null} label={t.job.acceptedByHelper} />
                <Step ok={job.requester_done}     label={t.job.requesterMarkedDone} />
                <Step ok={job.doer_done}          label={t.job.helperMarkedDone} />
                <Step ok={job.requester_paid}     label={t.job.requesterPaid} />
                <Step ok={job.doer_received}      label={t.job.helperReceived} />
            </div>

            {/* Actions */}
            <div className="mx-4 mt-4 space-y-3">
                {!job.accepted_by && !iAmRequester && (
                    <BigButton tone="primary" icon={<Handshake size={20} />} disabled={busy} onClick={accept}>
                        {t.job.acceptThisJob}
                    </BigButton>
                )}
                {job.accepted_by && !iAmRequester && !iAmDoer && (
                    <div className="card p-4 text-center text-sm text-muted">
                        {t.job.alreadyAccepted}
                    </div>
                )}

                {iAmRequester && !job.requester_done && job.accepted_by && (
                    <BigButton tone="primary" icon={<Flag size={20} />} disabled={busy} onClick={() => done('requester')}>
                        {t.job.markAsDone}
                    </BigButton>
                )}
                {iAmDoer && !job.doer_done && (
                    <BigButton tone="primary" icon={<Flag size={20} />} disabled={busy} onClick={() => done('doer')}>
                        {t.job.iFinished}
                    </BigButton>
                )}

                {job.requester_done && job.doer_done &&
                 !(job.requester_paid && job.doer_received) && (
                    <>
                        {iAmRequester && !job.requester_paid && (
                            <BigButton tone="good" icon={<HandCoins size={20} />} disabled={busy}
                                       onClick={() => confirmPayment('requester')}>
                                {t.job.iPaidUpi}
                            </BigButton>
                        )}
                        {iAmDoer && !job.doer_received && (
                            <BigButton tone="good" icon={<Check size={20} />} disabled={busy}
                                       onClick={() => confirmPayment('doer')}>
                                {t.job.iReceivedPayment}
                            </BigButton>
                        )}
                        <div className="card p-3 text-center text-xs text-muted">
                            {t.job.payHint}
                        </div>
                    </>
                )}

                {job.requester_done && job.doer_done &&
                 job.requester_paid && job.doer_received && (iAmRequester || iAmDoer) && (
                    <div className="card p-4 text-center">
                        <div className="mb-3 text-sm font-semibold">{t.job.howWasIt}</div>
                        <div className="flex justify-around">
                            <RateBtn tone="rose"  onClick={() => rate(1)}><Frown size={28} /></RateBtn>
                            <RateBtn tone="amber" onClick={() => rate(2)}><Meh   size={28} /></RateBtn>
                            <RateBtn tone="green" onClick={() => rate(3)}><Smile size={28} /></RateBtn>
                        </div>
                    </div>
                )}
            </div>

            <div className="h-8" />
        </Wrap>
    );
}

function Step({ ok, label }: { ok: boolean; label: string }) {
    return (
        <div className="flex items-center gap-2 py-1">
            {ok
                ? <CircleCheck size={18} className="text-[var(--color-good)]" />
                : <Circle      size={18} className="text-muted" />}
            <span className={ok ? 'text-sm font-semibold' : 'text-sm text-muted'}>{label}</span>
        </div>
    );
}
function RateBtn({ tone, children, onClick }: {
    tone: 'rose' | 'amber' | 'green'; children: React.ReactNode; onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`press flex h-16 w-16 items-center justify-center rounded-2xl tint-${tone}`}
        >{children}</button>
    );
}
function Wrap({ children }: { children: React.ReactNode }) {
    return <div className="min-h-full">{children}</div>;
}
