import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Check, LogIn, LogOut, Send, ShieldCheck, User as UserIcon,
} from 'lucide-react';
import BigButton from '../components/BigButton';
import { useAuth } from '../composables/useAuth';
import { useHeartbeat } from '../composables/useHeartbeat';
import { CATEGORIES, labelOf } from '../data/categories';
import { api } from '../data/api';
import { useT } from '../i18n';

/**
 * Profile screen — modern card layout, focused on identity and being
 * "on call" as a doer.  App-level preferences (theme, language) now
 * live on the Settings page, not here.
 */
export default function MePage() {
    const { user, ready, login, logout } = useAuth();
    const t = useT();
    const nav = useNavigate();

    const [phone, setPhone]   = useState('');
    const [name, setName]     = useState('');
    const [otp, setOtp]       = useState('');
    const [otpSent, setSent]  = useState(false);
    const [msg, setMsg]       = useState<string | null>(null);

    const [cats, setCats] = useState<string[]>([]);
    const hb = useHeartbeat(user ? { userId: user.userId, name: user.name } : null, cats);

    const [rep, setRep] = useState<{ completed: number; avg: number | null } | null>(null);
    useEffect(() => {
        if (!user) return;
        api.reputation(user.userId).then(r =>
            setRep({ completed: r.completed, avg: r.avg_rating }));
    }, [user]);

    async function doSend() {
        if (!phone) return;
        try { const r = await api.otpSend(phone); setSent(true);
            setMsg(r.hint ? t.me.devOtpHint(r.hint) : 'OTP sent'); }
        catch (e: any) { setMsg(e?.message ?? 'Failed'); }
    }
    async function doVerify() {
        try { await login(phone, otp, name || undefined); setMsg(null); setSent(false); }
        catch (e: any) { setMsg(e?.message ?? 'Invalid OTP'); }
    }

    if (!ready) return null;

    return (
        <div className="min-h-full">
            <header className="pt-safe-top sticky top-0 z-10 flex items-center gap-2 border-b border-[var(--color-hairline)] bg-[color:color-mix(in_srgb,var(--color-bg)_90%,transparent)] px-3 py-3 backdrop-blur-md">
                <button
                    onClick={() => nav('/')} aria-label={t.common.back}
                    className="press flex h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--color-surface-2)]"
                ><ArrowLeft size={22} /></button>
                <h1 className="text-lg font-bold">{t.me.title}</h1>
            </header>

            {/* Profile hero */}
            <div className="mx-4 mt-4 card p-4">
                <div className="flex items-center gap-3">
                    <div className={user ? 'ring-brand' : ''}>
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface-2)]">
                            <UserIcon size={28} className="text-muted" />
                        </div>
                    </div>
                    <div className="flex-1">
                        <div className="text-base font-extrabold">
                            {user ? (user.name || t.app.name) : t.me.notSignedIn}
                        </div>
                        <div className="text-xs text-muted">{user?.phone ?? t.me.signInHint}</div>
                    </div>
                    {rep && user && (
                        <div className="text-right">
                            <div className="text-2xl">
                                {rep.avg == null ? '—' : rep.avg >= 2.5 ? '😊'
                                    : rep.avg >= 1.5 ? '😐' : '😞'}
                            </div>
                            <div className="text-[10px] font-semibold uppercase text-muted">
                                {t.me.completed(rep.completed)}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Login form */}
            {!user && (
                <div className="mx-4 mt-3 card space-y-3 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                        <LogIn size={18} className="text-primary" /> {t.common.signIn}
                    </div>
                    <input
                        type="tel" inputMode="tel" placeholder={t.me.phone}
                        value={phone} onChange={(e) => setPhone(e.target.value)}
                        className="w-full rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface-2)] p-3 text-[15px] focus:border-primary focus:outline-none"
                    />
                    <input
                        type="text" placeholder={t.me.yourName}
                        value={name} onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface-2)] p-3 text-[15px] focus:border-primary focus:outline-none"
                    />
                    {!otpSent ? (
                        <BigButton tone="primary" icon={<Send size={18} />} onClick={doSend}>
                            {t.me.sendOtp}
                        </BigButton>
                    ) : (
                        <>
                            <input
                                type="tel" inputMode="numeric" placeholder={t.me.enterOtp}
                                value={otp} onChange={(e) => setOtp(e.target.value)}
                                className="w-full rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface-2)] p-3 text-[15px] focus:border-primary focus:outline-none"
                            />
                            <BigButton tone="good" icon={<ShieldCheck size={18} />} onClick={doVerify}>
                                {t.me.verifyAndSignIn}
                            </BigButton>
                        </>
                    )}
                    {msg && <div className="text-xs text-muted">{msg}</div>}
                </div>
            )}

            {/* Availability */}
            {user && (
                <div className="mx-4 mt-3 card p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-[15px] font-bold">{t.me.available}</div>
                            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                                <span
                                    className={
                                        'inline-block h-2 w-2 rounded-full ' +
                                        (hb.online ? 'bg-[var(--color-good)]' : 'bg-muted')
                                    }
                                />
                                {hb.online ? t.me.visible : t.me.offline}
                            </div>
                        </div>
                        <button
                            aria-pressed={hb.online}
                            onClick={() => hb.online ? hb.stop() : hb.start()}
                            className={
                                'press relative h-7 w-12 rounded-full transition-colors ' +
                                (hb.online ? 'bg-grad-good' : 'bg-[var(--color-surface-2)] border border-border')
                            }
                        >
                            <span className={
                                'absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-transform ' +
                                (hb.online ? 'translate-x-5' : 'translate-x-0')
                            } />
                        </button>
                    </div>

                    <div className="mt-4">
                        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                            {t.me.skills}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {CATEGORIES.filter(c => c.key !== 'other').map((c) => {
                                const on = cats.includes(c.key);
                                return (
                                    <button
                                        key={c.key}
                                        onClick={() => setCats((cs) =>
                                            on ? cs.filter(x => x !== c.key) : [...cs, c.key])}
                                        className={
                                            'press flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ' +
                                            (on
                                                ? 'bg-grad-brand text-white shadow-[var(--shadow-brand)]'
                                                : 'border border-border bg-[var(--color-surface-2)]')
                                        }
                                    >
                                        <c.Icon size={14} strokeWidth={2.2} />
                                        <span>{labelOf(t.category, c.key)}</span>
                                        {on && <Check size={14} />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Sign out */}
            {user && (
                <div className="mx-4 mt-4">
                    <BigButton
                        tone="outline"
                        icon={<LogOut size={18} className="text-[var(--color-bad)]" />}
                        onClick={async () => { await hb.stop(); await logout(); }}
                        className="text-[var(--color-bad)] border-[var(--color-bad)]/30"
                    >
                        {t.common.signOut}
                    </BigButton>
                </div>
            )}

            <div className="h-8" />
        </div>
    );
}
