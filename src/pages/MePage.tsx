import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BigButton from '../components/BigButton';
import { useAuth } from '../composables/useAuth';
import { useTheme } from '../composables/useTheme';
import { useHeartbeat } from '../composables/useHeartbeat';
import { CATEGORIES, labelOf } from '../data/categories';
import { api } from '../data/api';
import { AVAILABLE_LOCALES, useI18n } from '../i18n';

export default function MePage() {
    const { user, ready, login, logout } = useAuth();
    const { theme, setTheme } = useTheme();
    const { locale, t, setLocale } = useI18n();
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
            <header className="pt-safe-top flex items-center gap-2 px-4 pb-2 pt-4">
                <button
                    onClick={() => nav('/')} aria-label={t.common.back}
                    className="press flex h-10 w-10 items-center justify-center rounded-full border border-border bg-[var(--color-surface)] text-xl"
                >←</button>
                <h1 className="text-xl font-extrabold">{t.me.title}</h1>
            </header>

            {/* Profile card */}
            <div className="mx-5 mt-2 flex items-center gap-3 rounded-2xl border border-border bg-[var(--color-surface)] p-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-3xl">
                    {user ? '👤' : '👋'}
                </div>
                <div className="flex-1">
                    <div className="text-base font-extrabold">
                        {user ? (user.name || t.app.name) : t.me.notSignedIn}
                    </div>
                    <div className="text-xs text-muted">{user?.phone ?? t.me.signInHint}</div>
                </div>
                {rep && user && (
                    <div className="text-right">
                        <div className="text-lg font-extrabold">
                            {rep.avg == null ? '—' : rep.avg >= 2.5 ? '😊'
                                : rep.avg >= 1.5 ? '😐' : '😞'}
                        </div>
                        <div className="text-[10px] text-muted">{t.me.completed(rep.completed)}</div>
                    </div>
                )}
            </div>

            {/* Login form */}
            {!user && (
                <div className="mx-5 mt-4 space-y-3 rounded-2xl border border-border bg-[var(--color-surface)] p-4">
                    <div className="text-sm font-semibold">{t.common.signIn}</div>
                    <input
                        type="tel" inputMode="tel" placeholder={t.me.phone}
                        value={phone} onChange={(e) => setPhone(e.target.value)}
                        className="w-full rounded-xl border border-border bg-[var(--color-surface-2)] p-3 text-base"
                    />
                    <input
                        type="text" placeholder={t.me.yourName}
                        value={name} onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-xl border border-border bg-[var(--color-surface-2)] p-3 text-base"
                    />
                    {!otpSent ? (
                        <BigButton tone="primary" onClick={doSend}>{t.me.sendOtp}</BigButton>
                    ) : (
                        <>
                            <input
                                type="tel" inputMode="numeric" placeholder={t.me.enterOtp}
                                value={otp} onChange={(e) => setOtp(e.target.value)}
                                className="w-full rounded-xl border border-border bg-[var(--color-surface-2)] p-3 text-base"
                            />
                            <BigButton tone="good" onClick={doVerify}>{t.me.verifyAndSignIn}</BigButton>
                        </>
                    )}
                    {msg && <div className="text-xs text-muted">{msg}</div>}
                </div>
            )}

            {/* Availability (Doer mode) */}
            {user && (
                <div className="mx-5 mt-4 rounded-2xl border border-border bg-[var(--color-surface)] p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-base font-bold">{t.me.available}</div>
                            <div className="text-xs text-muted">
                                {hb.online ? t.me.visible : t.me.offline}
                            </div>
                        </div>
                        <button
                            aria-pressed={hb.online}
                            onClick={() => hb.online ? hb.stop() : hb.start()}
                            className={
                                'press h-8 w-14 rounded-full border transition-colors ' +
                                (hb.online ? 'bg-[var(--color-good)] border-[var(--color-good)]'
                                           : 'bg-[var(--color-surface-2)] border-border')
                            }
                        >
                            <span className={
                                'block h-6 w-6 rounded-full bg-white transition-transform ' +
                                (hb.online ? 'translate-x-6' : 'translate-x-0')
                            } />
                        </button>
                    </div>

                    <div className="mt-3">
                        <div className="mb-1 text-xs font-semibold uppercase text-muted">{t.me.skills}</div>
                        <div className="flex flex-wrap gap-2">
                            {CATEGORIES.filter(c => c.key !== 'other').map((c) => {
                                const on = cats.includes(c.key);
                                return (
                                    <button
                                        key={c.key}
                                        onClick={() => setCats((cs) =>
                                            on ? cs.filter(x => x !== c.key) : [...cs, c.key])}
                                        className={
                                            'press flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm ' +
                                            (on ? 'border-primary bg-primary text-white'
                                                : 'border-border')
                                        }
                                    >
                                        <span>{c.emoji}</span><span>{labelOf(t.category, c.key)}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Language picker */}
            <div className="mx-5 mt-4 rounded-2xl border border-border bg-[var(--color-surface)] p-4">
                <div className="mb-2 text-sm font-semibold">{t.me.language}</div>
                <div className="flex flex-wrap gap-2">
                    {AVAILABLE_LOCALES.map((l) => (
                        <button
                            key={l.code}
                            onClick={() => setLocale(l.code)}
                            className={
                                'press flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold ' +
                                (locale === l.code
                                    ? 'border-primary bg-primary text-white'
                                    : 'border-border bg-[var(--color-surface-2)]')
                            }
                        >
                            <span className="text-xl">{l.emoji}</span>
                            <span>{l.native}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Appearance */}
            <div className="mx-5 mt-4 rounded-2xl border border-border bg-[var(--color-surface)] p-4">
                <div className="mb-2 text-sm font-semibold">{t.me.appearance}</div>
                <div className="flex gap-2">
                    {(['light', 'dark', 'system'] as const).map((tm) => (
                        <button
                            key={tm}
                            onClick={() => setTheme(tm)}
                            className={
                                'press flex-1 rounded-xl border py-2 text-sm font-semibold ' +
                                (theme === tm ? 'border-primary bg-primary text-white'
                                              : 'border-border bg-[var(--color-surface-2)]')
                            }
                        >
                            {tm === 'light' ? t.me.light : tm === 'dark' ? t.me.dark : t.me.system}
                        </button>
                    ))}
                </div>
            </div>

            {/* Sign out */}
            {user && (
                <div className="mx-5 mt-4">
                    <BigButton tone="bad" onClick={async () => { await hb.stop(); await logout(); }}>
                        {t.common.signOut}
                    </BigButton>
                </div>
            )}

            <div className="h-8" />
        </div>
    );
}
