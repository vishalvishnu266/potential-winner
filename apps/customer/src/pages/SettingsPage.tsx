import { useT, useI18n, AVAILABLE_LOCALES, type LocaleCode } from '../i18n';
import { useTheme, type Theme } from '@pkg/native';
import { useOta } from '@pkg/ota';

declare const __APP_VERSION__: string;

/**
 * Settings page — Appearance / Language / Updates.
 *
 * The brand/accent colour is intentionally NOT user-configurable.
 * It's picked once at build time (see `APP_ACCENT` env var).
 */
export default function SettingsPage() {
    const t = useT();
    const { theme, setTheme, resolved } = useTheme();
    const { locale, setLocale } = useI18n();
    const {
        isCheckingManually, isDownloading, isApplying,
        statusMessage, lastCheckAt, checkForUpdate,
    } = useOta();

    const busy = isCheckingManually || isDownloading || isApplying;

    return (
        <section className="mx-auto flex max-w-md flex-col gap-6 px-4 pt-safe-top pb-6">
            <header className="pt-4">
                <h1 className="text-2xl font-bold text-text">{t.settings.title}</h1>
            </header>

            <Group title={t.settings.appearance}>
                <div className="flex gap-2">
                    {(['light', 'dark', 'system'] as Theme[]).map((mode) => (
                        <Chip
                            key={mode}
                            active={theme === mode}
                            onClick={() => setTheme(mode)}
                            label={t.settings.themeLabels[mode]}
                        />
                    ))}
                </div>
                <p className="mt-2 text-xs text-muted">
                    {t.settings.currentlyUsing(resolved)}
                </p>
            </Group>

            <Group title={t.settings.language}>
                <div className="flex flex-wrap gap-2">
                    {AVAILABLE_LOCALES.map((loc) => (
                        <Chip
                            key={loc.code}
                            active={locale === loc.code}
                            onClick={() => setLocale(loc.code as LocaleCode)}
                            label={`${loc.emoji} ${loc.native}`}
                        />
                    ))}
                </div>
            </Group>

            <Group title={t.settings.updates}>
                <button
                    type="button"
                    disabled={busy}
                    onClick={() => checkForUpdate(false)}
                    className={
                        'press w-full rounded-2xl bg-grad-brand px-4 py-3 text-sm font-semibold ' +
                        'text-[color:var(--color-accent-fg)] shadow-[var(--shadow-accent)] disabled:opacity-60'
                    }
                >
                    {busy ? t.common.loading : t.settings.checkForUpdate}
                </button>
                <dl className="mt-3 space-y-1 text-xs">
                    <Row label={t.settings.currentVersion} value={`v${__APP_VERSION__}`} />
                    <Row label={t.settings.status}         value={statusMessage} />
                    <Row
                        label={t.settings.lastChecked}
                        value={lastCheckAt ? new Date(lastCheckAt).toLocaleString() : '—'}
                    />
                </dl>
            </Group>
        </section>
    );
}

// ---------------------------------------------------------------------------
// Local presentational helpers
// ---------------------------------------------------------------------------

function Group({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-2xl border border-[var(--color-hairline)] bg-surface p-4">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">
                {title}
            </h2>
            {children}
        </div>
    );
}

function Chip({
    active, onClick, label,
}: { active: boolean; onClick: () => void; label: string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={
                'press rounded-full px-3 py-1.5 text-xs font-semibold ' +
                (active
                    ? 'bg-grad-brand text-[color:var(--color-accent-fg)] shadow-[var(--shadow-accent)]'
                    : 'border border-[var(--color-hairline)] text-text')
            }
        >
            {label}
        </button>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <dt className="text-muted">{label}</dt>
            <dd className="truncate font-mono text-text">{value}</dd>
        </div>
    );
}
