import PageHeader from '../components/PageHeader';
import { useDevice } from '../composables/useDevice';

// Reusable class strings — the standard React/Tailwind idiom instead of
// @apply component layers.
const kvRow = 'flex justify-between gap-3 border-b border-border py-2 text-[13px]';
const kvCode = 'break-all text-right text-muted';

export default function DevicePage() {
  const { info, battery, network, refresh } = useDevice();

  return (
    <div className="min-h-full">
      <PageHeader title="Device" subtitle="Native info & network status" />

      <section className="px-5 py-3">
        <h3 className="my-1 mb-2.5 text-[15px] font-semibold">Network</h3>
        <div className={kvRow}>
          <span>Status</span>
          <code className={network.connected ? 'text-emerald-600' : 'text-red-600'}>
            {network.connected ? 'online' : 'offline'}
          </code>
        </div>
        <div className={kvRow}><span>Type</span><code className={kvCode}>{network.connectionType}</code></div>
      </section>

      {info && (
        <section className="px-5 py-3">
          <h3 className="my-1 mb-2.5 text-[15px] font-semibold">Device</h3>
          <div className={kvRow}><span>Platform</span><code className={kvCode}>{info.platform}</code></div>
          <div className={kvRow}><span>Model</span><code className={kvCode}>{info.model}</code></div>
          <div className={kvRow}><span>OS</span><code className={kvCode}>{info.operatingSystem} {info.osVersion}</code></div>
          <div className={kvRow}><span>Manufacturer</span><code className={kvCode}>{info.manufacturer}</code></div>
          <div className={kvRow}><span>Virtual</span><code className={kvCode}>{info.isVirtual ? 'yes (emulator)' : 'no (real device)'}</code></div>
          <div className={kvRow}><span>Web view</span><code className={kvCode}>{info.webViewVersion}</code></div>
        </section>
      )}

      {battery && (
        <section className="px-5 py-3">
          <h3 className="my-1 mb-2.5 text-[15px] font-semibold">Battery</h3>
          <div className={kvRow}><span>Level</span><code className={kvCode}>{Math.round((battery.batteryLevel || 0) * 100)}%</code></div>
          <div className={kvRow}><span>Charging</span><code className={kvCode}>{battery.isCharging ? 'yes' : 'no'}</code></div>
        </section>
      )}

      <button
        className="mx-5 mb-6 mt-3 w-[calc(100%-2.5rem)] cursor-pointer rounded-[10px] border border-border bg-surface p-3 font-semibold text-text"
        onClick={refresh}
      >
        Refresh
      </button>
    </div>
  );
}
