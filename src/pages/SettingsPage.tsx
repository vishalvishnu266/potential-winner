import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Moon, Sun, Smartphone, Languages,
  Info, RefreshCw, Check, type LucideIcon,
} from 'lucide-react';
import { AVAILABLE_LOCALES, useI18n } from '../i18n';
import { useTheme } from '../composables/useTheme';
import { useOta } from '../composables/useOta';
import { hapticTap } from '../composables/useNative';

declare const __APP_VERSION__: string;

/**
 * Simple, honest settings screen.  Only shows things that are actually
 * wired up:
 *   • Dark-mode switch (with a labelled toggle + light/dark/system)
 *   • Language picker
 *   • Check for OTA updates (already implemented)
 *   • About
 * Non-functional rows (payment methods, currency, etc.) have been removed.
 */
export default function SettingsPage() {
  const nav = useNavigate();
  const { locale, t, setLocale } = useI18n();
  const { theme, setTheme, resolved } = useTheme();
  const { checkForUpdate, isUpdating, statusMessage } = useOta();

  const isDark = resolved === 'dark';

  return (
    <div className="min-h-full">
      {/* Header */}
      <header className="pt-safe-top sticky top-0 z-10 flex items-center gap-2 border-b border-[var(--color-hairline)] bg-[color:color-mix(in_srgb,var(--color-bg)_90%,transparent)] px-3 py-3 backdrop-blur-md">
        <button
          onClick={() => nav(-1)} aria-label={t.common.back}
          className="press flex h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--color-surface-2)]"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-bold">{t.me.settings}</h1>
      </header>

      {/* Dark-mode quick switch (big & obvious) */}
      <section className="mx-4 mt-4 card p-4">
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
                {theme === 'system' ? 'System' : isDark ? t.me.dark.replace(/^\S+\s/, '') : t.me.light.replace(/^\S+\s/, '')}
              </div>
            </div>
          </div>

          <Switch
            checked={isDark}
            onChange={(v) => { hapticTap(); setTheme(v ? 'dark' : 'light'); }}
            aria-label="Dark mode"
          />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <ChoiceChip
            active={theme === 'light'} onClick={() => setTheme('light')}
            Icon={Sun} label={t.me.light.replace(/^\S+\s/, '')}
          />
          <ChoiceChip
            active={theme === 'dark'} onClick={() => setTheme('dark')}
            Icon={Moon} label={t.me.dark.replace(/^\S+\s/, '')}
          />
          <ChoiceChip
            active={theme === 'system'} onClick={() => setTheme('system')}
            Icon={Smartphone} label={t.me.system.replace(/^\S+\s/, '')}
          />
        </div>
      </section>

      {/* Language */}
      <section className="mx-4 mt-4 card p-4">
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
                  'press flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ' +
                  (active
                    ? 'border-transparent bg-grad-brand text-white shadow-[var(--shadow-brand)]'
                    : 'border-border bg-[var(--color-surface-2)] text-text')
                }
              >
                <span className="text-base">{l.emoji}</span>
                <span>{l.native}</span>
                {active && <Check size={16} />}
              </button>
            );
          })}
        </div>
      </section>

      {/* About / updates */}
      <section className="mx-4 mt-4 card divide-y divide-[var(--color-hairline)]">
        <Row
          Icon={RefreshCw}
          title={isUpdating ? 'Checking…' : 'Check for updates'}
          subtitle={statusMessage}
          disabled={isUpdating}
          onClick={() => { hapticTap(); checkForUpdate(false); }}
        />
        <Row
          Icon={Info}
          title="About"
          subtitle={`v${__APP_VERSION__ ?? '0.0.0'}`}
        />
      </section>

      <p className="mx-4 mt-6 text-center text-xs text-muted">
        Made with <span className="text-grad-brand font-semibold">❤︎</span> for daily helpers.
      </p>

      <div className="h-8" />
    </div>
  );
}

// --------------------------------------------------------------------------
// Internal primitives (kept private to keep this file self-contained)
// --------------------------------------------------------------------------

function Switch({
  checked, onChange, ...aria
}: { checked: boolean; onChange: (v: boolean) => void } & React.AriaAttributes) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={
        'press relative h-7 w-12 rounded-full transition-colors ' +
        (checked ? 'bg-grad-brand' : 'bg-[var(--color-surface-2)] border border-border')
      }
      {...aria}
    >
      <span
        className={
          'absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-transform ' +
          (checked ? 'translate-x-5' : 'translate-x-0')
        }
      />
    </button>
  );
}

function ChoiceChip({
  active, onClick, Icon, label,
}: {
  active: boolean; onClick: () => void;
  Icon: LucideIcon;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={
        'press flex flex-col items-center justify-center gap-1 rounded-2xl border py-3 text-xs font-semibold ' +
        (active
          ? 'border-transparent bg-grad-brand text-white shadow-[var(--shadow-brand)]'
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
  Icon: LucideIcon;
  title: string; subtitle?: string;
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
