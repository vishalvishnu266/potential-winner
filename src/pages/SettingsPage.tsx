import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import SettingsRow from '../components/SettingsRow';
import Button from '../components/Button';
import { useOta } from '../composables/useOta';
import { hapticTap } from '../composables/useNative';

declare const __APP_VERSION__: string;
const appVersion = __APP_VERSION__;

function GroupHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3.5 pb-1.5 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
      {children}
    </div>
  );
}

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

      <Card padded className="mx-5 mb-5 mt-3 flex items-center gap-3.5">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[22px]">👤</div>
        <div>
          <div className="font-bold text-text">Guest User</div>
          <div className="mt-0.5 text-xs text-muted">Sign in to sync your tasks & rides</div>
        </div>
      </Card>

      <Card className="mx-5 mb-5">
        <GroupHeader>Account</GroupHeader>
        <SettingsRow label="Profile" />
        <SettingsRow label="Payment methods" />
        <SettingsRow label="Notifications" />
      </Card>

      <Card className="mx-5 mb-5">
        <GroupHeader>Preferences</GroupHeader>
        <SettingsRow label="Language" value="English" chevron={false} />
        <SettingsRow label="Currency" value="USD" chevron={false} />
      </Card>

      <Card className="mx-5 mb-5">
        <GroupHeader>App</GroupHeader>
        <SettingsRow
          readOnly
          label={
            <>
              <div>App version</div>
              <div className="mt-0.5 text-[11px] text-muted">v{appVersion}</div>
            </>
          }
          value={statusMessage}
          chevron={false}
        />
        <SettingsRow
          label={isUpdating ? 'Checking…' : 'Check for updates'}
          chevron={<span className="text-[18px] text-gray-400">{isUpdating ? '…' : '↻'}</span>}
          disabled={isUpdating}
          onClick={handleCheckUpdate}
        />
        <SettingsRow label="About" />
        <SettingsRow label="Privacy Policy" />
        <SettingsRow label="Terms of Service" />
      </Card>

      <div className="mx-5 mb-6 mt-1">
        <Button
          fullWidth
          className="border-red-200 bg-transparent text-red-600"
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}
