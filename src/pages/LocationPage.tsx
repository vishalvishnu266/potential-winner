import { useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import Section from '../components/Section';
import KeyValueRow from '../components/KeyValueRow';
import Button from '../components/Button';
import { useLocation } from '../composables/useLocation';
import { useGpsStreamer } from '../composables/useGpsStreamer';

export default function LocationPage() {
  const {
    position, timestamp, error, permission, watching,
    checkPermission, requestPermission, getCurrent, startWatch, stopWatch,
  } = useLocation();

  const streamer = useGpsStreamer();

  useEffect(() => { checkPermission(); }, [checkPermission]);

  async function onToggleStream() {
    if (!streamer.enabled && permission !== 'granted') {
      await requestPermission();
    }
    streamer.toggle();
  }

  async function onCheck() { await checkPermission(); }
  async function onRequest() { await requestPermission(); }
  async function onFix() {
    if (permission !== 'granted') await requestPermission();
    await getCurrent();
  }

  return (
    <div className="min-h-full">
      <PageHeader title="Location" subtitle="Test GPS + permissions" />

      <Section>
        <KeyValueRow label="Permission" value={permission} />
        <KeyValueRow label="Watching" value={watching ? 'yes' : 'no'} />
        {error && <KeyValueRow label="Error" value={error} error />}
      </Section>

      <Section className="space-y-2">
        <Button fullWidth onClick={onCheck}>Check permission</Button>
        <Button fullWidth variant="primary" onClick={onRequest}>Request permission</Button>
        <Button
          fullWidth
          disabled={!!error && permission === 'denied'}
          onClick={onFix}
        >
          Get current position
        </Button>
        {!watching ? (
          <Button fullWidth onClick={startWatch}>Start watching</Button>
        ) : (
          <Button fullWidth variant="danger" onClick={stopWatch}>Stop watching</Button>
        )}
      </Section>

      <Section title="Background GPS streamer">
        <p className="mb-2 text-xs text-muted">
          Sends the current fix to the server every {Math.round(streamer.intervalMs / 1000)}s.
          Enable it, lock the phone, and watch the server console to see if
          pings keep arriving with the screen off.
        </p>
        <KeyValueRow
          label="Streaming"
          value={streamer.enabled ? 'ON' : 'OFF'}
          success={streamer.enabled}
        />
        <KeyValueRow label="Sent" value={String(streamer.sendCount)} />
        <KeyValueRow label="Failed" value={String(streamer.failCount)} />
        <KeyValueRow label="Last status" value={streamer.lastStatus} />
        {streamer.lastSentAt && (
          <KeyValueRow
            label="Last sent"
            value={new Date(streamer.lastSentAt).toLocaleTimeString()}
          />
        )}
        {streamer.lastLat != null && streamer.lastLon != null && (
          <KeyValueRow
            label="Last coords"
            value={`${streamer.lastLat.toFixed(5)}, ${streamer.lastLon.toFixed(5)}`}
          />
        )}
        {streamer.error && (
          <KeyValueRow label="Send error" value={streamer.error} error />
        )}
        <Button
          fullWidth
          className="mt-3"
          variant={streamer.enabled ? 'danger' : 'primary'}
          onClick={onToggleStream}
        >
          {streamer.enabled ? 'Stop streaming to server' : 'Start streaming to server (every 5s)'}
        </Button>
      </Section>

      {position && (
        <Section title="Current position">
          <KeyValueRow label="Latitude" value={position.latitude.toFixed(6)} />
          <KeyValueRow label="Longitude" value={position.longitude.toFixed(6)} />
          <KeyValueRow label="Accuracy" value={`${position.accuracy?.toFixed(1)} m`} />
          {position.altitude != null && (
            <KeyValueRow label="Altitude" value={`${position.altitude.toFixed(1)} m`} />
          )}
          {position.speed != null && (
            <KeyValueRow label="Speed" value={`${position.speed.toFixed(2)} m/s`} />
          )}
          {timestamp && (
            <KeyValueRow
              label="Fix time"
              value={new Date(timestamp).toLocaleTimeString()}
            />
          )}
        </Section>
      )}
    </div>
  );
}
