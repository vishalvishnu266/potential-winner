import { useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import { useLocation } from '../composables/useLocation';

const kvRow = 'flex justify-between gap-3 border-b border-border py-2 text-[13px]';
const kvCode = 'break-all text-right text-muted';
const btn = 'mb-2 w-full cursor-pointer rounded-[10px] border border-border bg-surface p-3 font-semibold text-text disabled:opacity-50';
const btnPrimary = btn + ' border-primary bg-primary text-white';
const btnDanger = btn + ' border-red-200 bg-red-100 text-red-700';

export default function LocationPage() {
  const {
    position, timestamp, error, permission, watching,
    checkPermission, requestPermission, getCurrent, startWatch, stopWatch,
  } = useLocation();

  useEffect(() => { checkPermission(); }, [checkPermission]);

  async function onCheck() { await checkPermission(); }
  async function onRequest() { await requestPermission(); }
  async function onFix() {
    if (permission !== 'granted') await requestPermission();
    await getCurrent();
  }

  return (
    <div className="min-h-full">
      <PageHeader title="Location" subtitle="Test GPS + permissions" />

      <section className="px-5 py-3">
        <div className={kvRow}><span>Permission</span><code className={kvCode}>{permission}</code></div>
        <div className={kvRow}><span>Watching</span><code className={kvCode}>{watching ? 'yes' : 'no'}</code></div>
        {error && <div className={kvRow}><span>Error</span><code className="text-red-600">{error}</code></div>}
      </section>

      <section className="px-5 py-3">
        <button className={btn} onClick={onCheck}>Check permission</button>
        <button className={btnPrimary} onClick={onRequest}>Request permission</button>
        <button className={btn} disabled={!!error && permission === 'denied'} onClick={onFix}>Get current position</button>
        {!watching
          ? <button className={btn} onClick={startWatch}>Start watching</button>
          : <button className={btnDanger} onClick={stopWatch}>Stop watching</button>}
      </section>

      {position && (
        <section className="px-5 py-3">
          <h3 className="my-1 mb-2.5 text-[15px] font-semibold">Current position</h3>
          <div className={kvRow}><span>Latitude</span><code className={kvCode}>{position.latitude.toFixed(6)}</code></div>
          <div className={kvRow}><span>Longitude</span><code className={kvCode}>{position.longitude.toFixed(6)}</code></div>
          <div className={kvRow}><span>Accuracy</span><code className={kvCode}>{position.accuracy?.toFixed(1)} m</code></div>
          {position.altitude != null && (
            <div className={kvRow}><span>Altitude</span><code className={kvCode}>{position.altitude.toFixed(1)} m</code></div>
          )}
          {position.speed != null && (
            <div className={kvRow}><span>Speed</span><code className={kvCode}>{position.speed.toFixed(2)} m/s</code></div>
          )}
          {timestamp && (
            <div className={kvRow}><span>Fix time</span><code className={kvCode}>{new Date(timestamp).toLocaleTimeString()}</code></div>
          )}
        </section>
      )}
    </div>
  );
}
