import PageHeader from '../components/PageHeader';
import { useOta } from '../composables/useOta';
import { hapticTap } from '../composables/useNative';

declare const __APP_VERSION__: string;
const appVersion = __APP_VERSION__;

// Reusable class strings for the settings rows.
const row = 'flex w-full cursor-pointer items-center justify-between border-t border-border bg-transparent p-3.5 text-left text-sm text-text disabled:opacity-60 first-of-type:border-t-0';
const chev = 'text-[18px] text-gray-400';
const value = 'text-[13px] text-muted';

export default function SettingsPage() {
  // Note: global auto-poll is started in App.tsx — no need to start it here.
  const { checkForUpdate, statusMessage, isUpdating } = useOta();

  async function handleCheckUpdate() {
    await hapticTap();
    await checkForUpdate(false);
  }

  return (
    <div className="min-h-full">
      <PageHeader title="Settings" />

      <section className="mx-5 mb-5 mt-3 flex items-center gap-3.5 rounded-2xl border border-border bg-surface p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[22px]">👤</div>
        <div>
          <div className="font-bold text-text">Guest User</div>
          <div className="mt-0.5 text-xs text-muted">Sign in to sync your tasks & rides</div>
        </div>
      </section>

      <section className="mx-5 mb-5 overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="px-3.5 pb-1.5 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted">Account</div>
        <button className={row}><span>Profile</span><span className={chev}>›</span></button>
        <button className={row}><span>Payment methods</span><span className={chev}>›</span></button>
        <button className={row}><span>Notifications</span><span className={chev}>›</span></button>
      </section>

      <section className="mx-5 mb-5 overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="px-3.5 pb-1.5 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted">Preferences</div>
        <button className={row}><span>Language</span><span className={value}>English ›</span></button>
        <button className={row}><span>Currency</span><span className={value}>USD ›</span></button>
      </section>

      <section className="mx-5 mb-5 overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="px-3.5 pb-1.5 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted">App</div>
        <div className={row + ' cursor-default'}>
          <div>
            <div>App version</div>
            <div className="mt-0.5 text-[11px] text-muted">v{appVersion}</div>
          </div>
          <span className={value}>{statusMessage}</span>
        </div>
        <button className={row} disabled={isUpdating} onClick={handleCheckUpdate}>
          <span>{isUpdating ? 'Checking…' : 'Check for updates'}</span>
          <span className={chev}>{isUpdating ? '…' : '↻'}</span>
        </button>
        <button className={row}><span>About</span><span className={chev}>›</span></button>
        <button className={row}><span>Privacy Policy</span><span className={chev}>›</span></button>
        <button className={row}><span>Terms of Service</span><span className={chev}>›</span></button>
      </section>

      <button className="mx-5 mb-6 mt-1 w-[calc(100%-2.5rem)] cursor-pointer rounded-xl border border-red-200 bg-transparent p-3.5 font-semibold text-red-600">
        Sign out
      </button>
    </div>
  );
}
