import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import PageHeader from '../components/PageHeader';
import { useCamera } from '../composables/useCamera';
import { useSqlite } from '../composables/useSqlite';

declare const __APP_VERSION__: string;

interface NoteRow { id: number; body: string; created_at: number }

// Shared class strings — kept as consts to avoid noisy repetition.
const kvRow = 'flex justify-between gap-3 border-b border-border py-2 text-[13px]';
const kvCode = 'break-all text-right text-muted';
const btnRow = 'mt-2.5 flex gap-2';
const btn = 'flex-1 cursor-pointer rounded-[10px] border border-border bg-surface p-3 font-semibold text-text disabled:opacity-50';
const btnPrimary = btn + ' border-primary bg-primary text-white';
const btnDanger = btn + ' border-red-200 bg-red-100 text-red-700';

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

      <section className="px-5 py-3">
        <h3 className="my-1 mb-2.5 text-[15px] font-semibold">What this app needs (before UI)</h3>
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
      </section>

      <section className="px-5 py-3">
        <h3 className="my-1 mb-2.5 text-[15px] font-semibold">Take a selfie 📸</h3>
        <div className={kvRow}><span>Permission</span><code className={kvCode}>{camPermission}</code></div>
        {camError && <div className={kvRow}><span>Error</span><code className="text-red-600">{camError}</code></div>}

        <div className={btnRow}>
          <button className={btn} onClick={camCheck}>Check</button>
          <button className={btnPrimary} onClick={camRequest}>Request</button>
        </div>
        <div className={btnRow}>
          <button className={btnPrimary} disabled={camBusy} onClick={onTake}>
            {camBusy ? 'Opening…' : 'Take photo'}
          </button>
          <button className={btn} disabled={camBusy} onClick={onPick}>Pick from library</button>
        </div>

        {photoDataUrl && (
          <div className="mt-3.5 rounded-xl border border-border bg-surface p-3">
            <img src={photoDataUrl} alt="Captured" className="mb-2.5 block w-full rounded-lg" />
            <div className={kvRow}><span>Size</span><code className={kvCode}>{estimatedKB} KB (base64)</code></div>
            <button className={btnDanger} onClick={camClear}>Clear</button>
          </div>
        )}
      </section>

      <section className="px-5 py-3">
        <h3 className="my-1 mb-2.5 text-[15px] font-semibold">SQLite 🗄️</h3>
        {sqlError && <div className={kvRow}><span>Error</span><code className="text-red-600">{sqlError}</code></div>}
        <input
          value={noteBody}
          onChange={(e) => setNoteBody(e.target.value)}
          className="my-2 w-full rounded-[10px] border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-primary"
          placeholder="Type a note and press Save"
        />
        <div className={btnRow}>
          <button className={btnPrimary} disabled={!noteBody.trim()} onClick={onAddNote}>Save</button>
          <button className={btn} onClick={onLoadNotes}>Refresh</button>
          <button className={btnDanger} onClick={onClearNotes}>Clear all</button>
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
                <button
                  className="cursor-pointer border-none bg-transparent p-0 text-xs font-semibold text-red-600"
                  onClick={() => onDeleteNote(n.id)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2.5 text-xs text-muted">No notes yet — data persists across app restarts.</p>
        )}
      </section>

      <section className="px-5 py-3">
        <h3 className="my-1 mb-2.5 text-[15px] font-semibold">Deep links 🔗</h3>
        <p className="mt-2.5 text-xs text-muted">
          Trigger from inside the app, or from the phone shell:
        </p>
        <pre className="my-2 overflow-x-auto whitespace-pre rounded-lg bg-slate-900 px-3 py-2.5 text-[11px] leading-normal text-slate-200">{`adb shell am start -a android.intent.action.VIEW \\
  -d "dailygig://task/42?ref=push"`}</pre>

        <div className={btnRow}>
          <button className={btn} onClick={() => navigate('/task/42?ref=in-app')}>Open /task/42</button>
          <button className={btn} onClick={() => navigate('/ride/7')}>Open /ride/7</button>
        </div>
      </section>

      <section className="px-5 py-3">
        <h3 className="my-1 mb-2.5 text-[15px] font-semibold">Build info</h3>
        <div className={kvRow}><span>Bundle version</span><code className={kvCode}>{appVersion}</code></div>
        <div className={kvRow}><span>Platform</span><code className={kvCode}>{platform}</code></div>
        <div className={kvRow}><span>User agent</span><code className={kvCode + ' text-[11px]'}>{ua}</code></div>
      </section>
    </div>
  );
}
