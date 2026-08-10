import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Check, Info, Languages, LogIn, LogOut, Moon,
  RefreshCw, Send, ShieldCheck, Smartphone, Sun,
  User as UserIcon, type LucideIcon,
} from 'lucide-react';
import BigButton from '../components/BigButton';
import { useAuth } from '../composables/useAuth';
import { useHeartbeat } from '../composables/useHeartbeat';
import { useTheme } from '../composables/useTheme';
import { useOta } from '../composables/useOta';
import { CATEGORIES, labelOf } from '../data/categories';
import { api } from '../data/api';
import { AVAILABLE_LOCALES, useI18n } from '../i18n';
import { hapticTap } from '../composables/useNative';

declare const __APP_VERSION__: string;

/**
 * "Me" is now the single hub for the user: profile + availability +
 * skills, followed by app preferences (appearance / language / updates
 * / about).  This deliberately merges what used to be a separate
 * Settings tab so we can free that slot for the Local (sponsors) tab.
 */
export default function MePage() {
    const { user, ready, login, logout } = useAuth();
    const { theme, setTheme, resolved } = useTheme();
    const { locale, t, setLocale } = useI18n();
    const { checkForUpdate, isCheckingManually, statusMessage } = useOta();
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

    const isDark = resolved === 'dark';

    return (
        <div className="min-h-full">
            <header className="pt-safe-top sticky top-0 z-10 flex items-center gap-2 border-b border-[var(--color-hairline)] bg-[color:color-mix(in_srgb,var(--color-bg)_90%,transparent)] px-3 py-3 backdrop-blur-md">
                <button
                    onClick={() => nav('/')} aria-label={t.common.back}
                    className="press flex h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--color-surface-2)]"
                ><ArrowLeft size={22} /></button>
                <h1 className="text-lg font-bold">{t.me.title}</h1>
            </header>

            {/* --- Profile hero ------------------------------------------------ */}
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

            {/* --- Sign-in form (only when logged out) ------------------------- */}
            {!user && (
                <div className="mx-4 mt-3 card space-y-3 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                        <LogIn size={18} className="text-[var(--color-primary)]" /> {t.common.signIn}
                    </div>
                    <input
                        type="tel" inputMode="tel" placeholder={t.me.phone}
                        value={phone} onChange={(e) => setPhone(e.target.value)}
                        className="w-full rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface-2)] p-3 text-[15px] focus:border-[var(--color-primary)] focus:outline-none"
                    />
                    <input
                        type="text" placeholder={t.me.yourName}
                        value={name} onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface-2)] p-3 text-[15px] focus:border-[var(--color-primary)] focus:outline-none"
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
                                className="w-full rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface-2)] p-3 text-[15px] focus:border-[var(--color-primary)] focus:outline-none"
                            />
                            <BigButton tone="good" icon={<ShieldCheck size={18} />} onClick={doVerify}>
                                {t.me.verifyAndSignIn}
                            </BigButton>
                        </>
                    )}
                    {msg && <div className="text-xs text-muted">{msg}</div>}
                </div>
            )}

            {/* --- Availability + skills ------------------------------------- */}
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
                        <Switch checked={hb.online} onChange={(v) => v ? hb.start() : hb.stop()} />
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
                                                ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)] shadow-[var(--shadow-brand)]'
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

            {/* --- SETTINGS (merged from previous SettingsPage) --------------- */}

            {/* Appearance */}
            <div className="mx-4 mt-4 card p-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className={
                            'flex h-11 w-11 items-center justify-center rounded-2xl ' +
                            (isDark ? 'tint-violet' : 'tint-amber')
                        }>
                            {isDark ? <Moon size={22} /> : <Sun size={22} />}
                        </div>
                        <div>
                            <div className="text-[15px] font-semibold">{t.me.appearance}</div>
                            <div className="text-xs text-muted">
                                {theme === 'system' ? 'System'
                                    : isDark
                                        ? t.me.dark.replace(/^\S+\s/, '')
                                        : t.me.light.replace(/^\S+\s/, '')}
                            </div>
                        </div>
                    </div>
                    <Switch
                        checked={isDark}
                        onChange={(v) => { hapticTap(); setTheme(v ? 'dark' : 'light'); }}
                        ariaLabel="Dark mode"
                    />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                    <Chip active={theme === 'light'} onClick={() => setTheme('light')}
                          Icon={Sun}       label={t.me.light.replace(/^\S+\s/, '')} />
                    <Chip active={theme === 'dark'} onClick={() => setTheme('dark')}
                          Icon={Moon}      label={t.me.dark.replace(/^\S+\s/, '')} />
                    <Chip active={theme === 'system'} onClick={() => setTheme('system')}
                          Icon={Smartphone} label={t.me.system.replace(/^\S+\s/, '')} />
                </div>
            </div>

            {/* Language */}
            <div className="mx-4 mt-4 card p-4">
                <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl tint-blue">
                        <Languages size={22} />
                    </div>
                    <div>
                        <div className="text-[15px] font-semibold">{t.me.language}</div>
                        <div className="text-xs text-muted">
                            {AVAILABLE_LOCALES.find(l => l.code === locale)?.native}
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {AVAILABLE_LOCALES.map((l) => {
                        const active = l.code === locale;
                        return (
                            <button
                                key={l.code}
                                onClick={() => { hapticTap(); setLocale(l.code); }}
                                className={
                                    'press flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ' +
                                    (active
                                        ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)] shadow-[var(--shadow-brand)]'
                                        : 'border border-border bg-[var(--color-surface-2)] text-text')
                                }
                            >
                                <span className="text-base">{l.emoji}</span>
                                <span>{l.native}</span>
                                {active && <Check size={16} />}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Updates + About */}
            <div className="mx-4 mt-4 card divide-y divide-[var(--color-hairline)]">
                <Row
                    Icon={RefreshCw}
                    title={isCheckingManually ? 'Checking…' : 'Check for updates'}
                    subtitle={statusMessage}
                    disabled={isCheckingManually}
                    onClick={() => { hapticTap(); checkForUpdate(false); }}
                />
                <Row
                    Icon={Info}
                    title="About"
                    subtitle={`v${__APP_VERSION__ ?? '0.0.0'}`}
                />
            </div>

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

            <p className="mx-4 mt-6 text-center text-xs text-muted">
                Made with <span className="text-[var(--color-primary)] font-semibold">❤︎</span> for daily helpers.
            </p>

            <div className="h-8" />
        </div>
    );
}

// ---------------------------------------------------------------------------
// Small local primitives kept private to this file to keep MePage self-contained
// ---------------------------------------------------------------------------

function Switch({
    checked, onChange, ariaLabel,
}: { checked: boolean; onChange: (v: boolean) => void; ariaLabel?: string }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={ariaLabel}
            onClick={() => onChange(!checked)}
            className={
                'press relative h-7 w-12 rounded-full transition-colors ' +
                (checked
                    ? 'bg-[var(--color-primary)]'
                    : 'bg-[var(--color-surface-2)] border border-border')
            }
        >
            <span className={
                'absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-transform ' +
                (checked ? 'translate-x-5' : 'translate-x-0')
            } />
        </button>
    );
}

function Chip({
    active, onClick, Icon, label,
}: { active: boolean; onClick: () => void; Icon: LucideIcon; label: string }) {
    return (
        <button
            onClick={() => { hapticTap(); onClick(); }}
            className={
                'press flex flex-col items-center justify-center gap-1 rounded-2xl border py-3 text-xs font-semibold ' +
                (active
                    ? 'border-transparent bg-[var(--color-primary)] text-[var(--color-primary-fg)] shadow-[var(--shadow-brand)]'
                    : 'border-border bg-[var(--color-surface-2)] text-text')
            }
        >
            <Icon size={20} strokeWidth={2.2} />
            <span>{label}</span>
        </button>
    );
}

function Row({
    Icon, title, subtitle, onClick, disabled,
}: {
    Icon: LucideIcon; title: string; subtitle?: string;
    onClick?: () => void; disabled?: boolean;
}) {
    const isButton = !!onClick;
    const Comp: any = isButton ? 'button' : 'div';
    return (
        <Comp
            onClick={onClick}
            disabled={disabled}
            className={
                'flex w-full items-center gap-3 p-4 text-left ' +
                (isButton ? 'press disabled:opacity-50' : '')
            }
        >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-surface-2)] text-muted">
                <Icon size={20} strokeWidth={2} />
            </div>
            <div className="flex-1">
                <div className="text-[15px] font-semibold">{title}</div>
                {subtitle && <div className="text-xs text-muted">{subtitle}</div>}
            </div>
        </Comp>
    );
}
