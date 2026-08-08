import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import PageHeader from '../components/PageHeader';
import Section from '../components/Section';
import KeyValueRow from '../components/KeyValueRow';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import { useCamera } from '../composables/useCamera';
import { useSqlite } from '../composables/useSqlite';

declare const __APP_VERSION__: string;

interface NoteRow { id: number; body: string; created_at: number }

const btnRow = 'mt-2.5 flex gap-2';

export default function SandboxPage() {
  const navigate = useNavigate();

  // -- SQLite state ---------------------------------------------------
  const [noteBody, setNoteBody] = useState('');
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [sqlError, setSqlError] = useState<string | null>(null);
  // Single-table test scaffold — do not extend, this is only to verify
  // SQLite is installed and working on the device.
  const { run, query, reset, error: sqliteInitError } = useSqlite();

  async function onLoadNotes() {
    try {
      setSqlError(null);
      const rows = await query<NoteRow>('SELECT id, body, created_at FROM notes ORDER BY id DESC LIMIT 100');
      setNotes(rows);
    } catch (e: any) { setSqlError(e?.message || 'query failed'); }
  }
  async function onAddNote() {
    const body = noteBody.trim();
    if (!body) return;
    try {
      setSqlError(null);
      await run('INSERT INTO notes (body) VALUES (?)', [body]);
      setNoteBody('');
      await onLoadNotes();
    } catch (e: any) { setSqlError(e?.message || 'insert failed'); }
  }
  async function onDeleteNote(id: number) {
    try {
      await run('DELETE FROM notes WHERE id = ?', [id]);
      await onLoadNotes();
    } catch (e: any) { setSqlError(e?.message || 'delete failed'); }
  }
  async function onClearNotes() {
    try { await reset(); await onLoadNotes(); }
    catch (e: any) { setSqlError(e?.message || 'clear failed'); }
  }
  function formatWhen(secs: number) {
    return new Date(secs * 1000).toLocaleString();
  }

  useEffect(() => {
    onLoadNotes();
    // Propagate any bootstrap failure to the UI
    const t = setTimeout(() => { if (sqliteInitError) setSqlError(sqliteInitError); }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const appVersion = __APP_VERSION__;
  const platform = Capacitor.getPlatform();
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';

  const {
    dataUrl: photoDataUrl,
    error: camError,
    busy: camBusy,
    permission: camPermission,
    checkPermission, requestPermission, takePhoto, pickPhoto, clear: camClear,
  } = useCamera();

  const estimatedKB = useMemo(
    () => (photoDataUrl ? Math.round((photoDataUrl.length * 3 / 4) / 1024) : 0),
    [photoDataUrl]
  );

  useEffect(() => { checkPermission(); }, [checkPermission]);

  async function camCheck() { await checkPermission(); }
  async function camRequest() { await requestPermission(); }
  async function onTake() {
    if (camPermission !== 'granted') await requestPermission();
    await takePhoto();
  }
  async function onPick() {
    await pickPhoto();
  }

  return (
    <div className="min-h-full">
      <PageHeader title="Sandbox" subtitle="Test primitives before building UI" />

      <Section title="What this app needs (before UI)">
        <ol className="m-0 list-decimal pl-5 text-sm leading-loose">
          <li>✅ OTA hot updates (working)</li>
          <li>✅ Geolocation / GPS (Location tab)</li>
          <li>✅ Network status (Device tab)</li>
          <li>✅ Device info (Device tab)</li>
          <li>✅ Camera (below)</li>
          <li>⏳ Push notifications</li>
          <li>⏳ Local notifications</li>
          <li>⏳ Secure key/value storage (composable ready)</li>
          <li>✅ SQLite (below)</li>
          <li>⏳ Filesystem (offline cache)</li>
          <li>✅ Deep links (dailygig://…)</li>
          <li>⏳ HTTP client with auth interceptor</li>
          <li>⏳ Auth flow (sign-in, refresh token)</li>
          <li>⏳ Error reporting (Sentry / Crashlytics)</li>
          <li>⏳ Analytics</li>
          <li>⏳ Map SDK (Google / Mapbox)</li>
        </ol>
        <p className="mt-2.5 text-xs text-muted">Legend: ✅ done · ⏳ to do</p>
      </Section>

      <Section title="Take a selfie 📸">
        <KeyValueRow label="Permission" value={camPermission} />
        {camError && <KeyValueRow label="Error" value={camError} error />}

        <div className={btnRow}>
          <Button className="flex-1" onClick={camCheck}>Check</Button>
          <Button className="flex-1" variant="primary" onClick={camRequest}>Request</Button>
        </div>
        <div className={btnRow}>
          <Button className="flex-1" variant="primary" disabled={camBusy} onClick={onTake}>
            {camBusy ? 'Opening…' : 'Take photo'}
          </Button>
          <Button className="flex-1" disabled={camBusy} onClick={onPick}>
            Pick from library
          </Button>
        </div>

        {photoDataUrl && (
          <Card padded className="mt-3.5">
            <img src={photoDataUrl} alt="Captured" className="mb-2.5 block w-full rounded-lg" />
            <KeyValueRow label="Size" value={`${estimatedKB} KB (base64)`} />
            <Button fullWidth variant="danger" className="mt-2" onClick={camClear}>
              Clear
            </Button>
          </Card>
        )}
      </Section>

      <Section title="SQLite 🗄️">
        {sqlError && <KeyValueRow label="Error" value={sqlError} error />}
        <Input
          value={noteBody}
          onChange={(e) => setNoteBody(e.target.value)}
          className="my-2"
          placeholder="Type a note and press Save"
        />
        <div className={btnRow}>
          <Button className="flex-1" variant="primary" disabled={!noteBody.trim()} onClick={onAddNote}>
            Save
          </Button>
          <Button className="flex-1" onClick={onLoadNotes}>Refresh</Button>
          <Button className="flex-1" variant="danger" onClick={onClearNotes}>Clear all</Button>
        </div>
        {notes.length ? (
          <div className="mt-3 overflow-hidden rounded-[10px] border border-border bg-surface">
            {notes.map((n) => (
              <div
                key={n.id}
                className="flex items-start justify-between gap-2.5 border-t border-border px-3 py-2.5 first:border-t-0"
              >
                <div>
                  <div className="break-words text-[13px] text-text">{n.body}</div>
                  <div className="mt-0.5 text-[11px] text-muted">#{n.id} · {formatWhen(n.created_at)}</div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0 text-red-600"
                  onClick={() => onDeleteNote(n.id)}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2.5 text-xs text-muted">No notes yet — data persists across app restarts.</p>
        )}
      </Section>

      <Section title="Deep links 🔗">
        <p className="mt-2.5 text-xs text-muted">
          Trigger from inside the app, or from the phone shell:
        </p>
        <pre className="my-2 overflow-x-auto whitespace-pre rounded-lg bg-slate-900 px-3 py-2.5 text-[11px] leading-normal text-slate-200">{`adb shell am start -a android.intent.action.VIEW \\
  -d "dailygig://task/42?ref=push"`}</pre>

        <div className={btnRow}>
          <Button className="flex-1" onClick={() => navigate('/task/42?ref=in-app')}>
            Open /task/42
          </Button>
          <Button className="flex-1" onClick={() => navigate('/ride/7')}>
            Open /ride/7
          </Button>
        </div>
      </Section>

      <Section title="Build info">
        <KeyValueRow label="Bundle version" value={appVersion} />
        <KeyValueRow label="Platform" value={platform} />
        <KeyValueRow label="User agent" value={ua} valueClassName="text-[11px]" />
      </Section>
    </div>
  );
}
