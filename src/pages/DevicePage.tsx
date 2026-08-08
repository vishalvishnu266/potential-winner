import PageHeader from '../components/PageHeader';
import Section from '../components/Section';
import KeyValueRow from '../components/KeyValueRow';
import Button from '../components/Button';
import { useDevice } from '../composables/useDevice';

export default function DevicePage() {
  const { info, battery, network, refresh } = useDevice();

  return (
    <div className="min-h-full">
      <PageHeader title="Device" subtitle="Native info & network status" />

      <Section title="Network">
        <KeyValueRow
          label="Status"
          value={network.connected ? 'online' : 'offline'}
          success={network.connected}
          error={!network.connected}
        />
        <KeyValueRow label="Type" value={network.connectionType} />
      </Section>

      {info && (
        <Section title="Device">
          <KeyValueRow label="Platform" value={info.platform} />
          <KeyValueRow label="Model" value={info.model} />
          <KeyValueRow label="OS" value={`${info.operatingSystem} ${info.osVersion}`} />
          <KeyValueRow label="Manufacturer" value={info.manufacturer} />
          <KeyValueRow
            label="Virtual"
            value={info.isVirtual ? 'yes (emulator)' : 'no (real device)'}
          />
          <KeyValueRow label="Web view" value={info.webViewVersion} />
        </Section>
      )}

      {battery && (
        <Section title="Battery">
          <KeyValueRow
            label="Level"
            value={`${Math.round((battery.batteryLevel || 0) * 100)}%`}
          />
          <KeyValueRow label="Charging" value={battery.isCharging ? 'yes' : 'no'} />
        </Section>
      )}

      <div className="px-5 pb-6 pt-3">
        <Button fullWidth onClick={refresh}>
          Refresh
        </Button>
      </div>
    </div>
  );
}
