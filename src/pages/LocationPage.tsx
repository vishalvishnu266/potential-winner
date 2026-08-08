import { useEffect } from 'react';
import PageHeader from '../components/PageHeader';
import Section from '../components/Section';
import KeyValueRow from '../components/KeyValueRow';
import Button from '../components/Button';
import { useLocation } from '../composables/useLocation';

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
