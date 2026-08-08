<template>
  <div class="min-h-full">
    <PageHeader title="Sandbox" subtitle="Test primitives before building UI" />

    <section class="px-5 py-3">
      <h3 class="my-1 mb-2.5 text-[15px] font-semibold">What this app needs (before UI)</h3>
      <ol class="m-0 list-decimal pl-5 text-sm leading-loose">
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
      <p class="mt-2.5 text-xs text-muted">Legend: ✅ done · ⏳ to do</p>
    </section>

    <section class="px-5 py-3">
      <h3 class="my-1 mb-2.5 text-[15px] font-semibold">Take a selfie 📸</h3>
      <div class="kv"><span>Permission</span><code>{{ camPermission }}</code></div>
      <div class="kv" v-if="camError"><span>Error</span><code class="text-red-600">{{ camError }}</code></div>

      <div class="btn-row">
        <button class="btn" @click="camCheck">Check</button>
        <button class="btn btn-primary" @click="camRequest">Request</button>
      </div>
      <div class="btn-row">
        <button class="btn btn-primary" :disabled="camBusy" @click="onTake">
          {{ camBusy ? 'Opening…' : 'Take photo' }}
        </button>
        <button class="btn" :disabled="camBusy" @click="onPick">Pick from library</button>
      </div>

      <div v-if="photoDataUrl" class="mt-3.5 rounded-xl border border-border bg-surface p-3">
        <img :src="photoDataUrl" alt="Captured photo" class="mb-2.5 block w-full rounded-lg" />
        <div class="kv"><span>Size</span><code>{{ estimatedKB }} KB (base64)</code></div>
        <button class="btn btn-danger" @click="camClear">Clear</button>
      </div>
    </section>

    <section class="px-5 py-3">
      <h3 class="my-1 mb-2.5 text-[15px] font-semibold">SQLite 🗄️</h3>
      <div class="kv" v-if="sqlError"><span>Error</span><code class="text-red-600">{{ sqlError }}</code></div>
      <input
        v-model="noteBody"
        class="my-2 w-full rounded-[10px] border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-primary"
        placeholder="Type a note and press Save"
      />
      <div class="btn-row">
        <button class="btn btn-primary" :disabled="!noteBody.trim()" @click="onAddNote">Save</button>
        <button class="btn" @click="onLoadNotes">Refresh</button>
        <button class="btn btn-danger" @click="onClearNotes">Clear all</button>
      </div>
      <div class="mt-3 overflow-hidden rounded-[10px] border border-border bg-surface" v-if="notes.length">
        <div
          v-for="n in notes"
          :key="n.id"
          class="flex items-start justify-between gap-2.5 border-t border-border px-3 py-2.5 first:border-t-0"
        >
          <div>
            <div class="break-words text-[13px] text-text">{{ n.body }}</div>
            <div class="mt-0.5 text-[11px] text-muted">#{{ n.id }} · {{ formatWhen(n.created_at) }}</div>
          </div>
          <button
            class="cursor-pointer border-none bg-transparent p-0 text-xs font-semibold text-red-600"
            @click="onDeleteNote(n.id)"
          >
            Delete
          </button>
        </div>
      </div>
      <p v-else class="mt-2.5 text-xs text-muted">No notes yet — data persists across app restarts.</p>
    </section>

    <section class="px-5 py-3">
      <h3 class="my-1 mb-2.5 text-[15px] font-semibold">Deep links 🔗</h3>
      <p class="mt-2.5 text-xs text-muted">
        Trigger from inside the app, or from the phone shell:
      </p>
      <pre class="my-2 overflow-x-auto whitespace-pre rounded-lg bg-slate-900 px-3 py-2.5 text-[11px] leading-normal text-slate-200">adb shell am start -a android.intent.action.VIEW \
  -d "dailygig://task/42?ref=push"</pre>

      <div class="btn-row">
        <button class="btn" @click="$router.push('/task/42?ref=in-app')">Open /task/42</button>
        <button class="btn" @click="$router.push('/ride/7')">Open /ride/7</button>
      </div>
    </section>

    <section class="px-5 py-3">
      <h3 class="my-1 mb-2.5 text-[15px] font-semibold">Build info</h3>
      <div class="kv"><span>Bundle version</span><code>{{ appVersion }}</code></div>
      <div class="kv"><span>Platform</span><code>{{ platform }}</code></div>
      <div class="kv"><span>User agent</span><code class="text-[11px]">{{ ua }}</code></div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Capacitor } from '@capacitor/core';
import PageHeader from '../components/PageHeader.vue';
import { useCamera } from '../composables/useCamera';
import { useSqlite } from '../composables/useSqlite';

// -- SQLite state ---------------------------------------------------
interface NoteRow { id: number; body: string; created_at: number }
const noteBody = ref('');
const notes = ref<NoteRow[]>([]);
const sqlError = ref<string | null>(null);
// Single-table test scaffold — do not extend, this is only to verify
// SQLite is installed and working on the device.
const { run, query, reset, error: sqliteInitError } = useSqlite();

async function onLoadNotes() {
  try {
    sqlError.value = null;
    notes.value = await query<NoteRow>('SELECT id, body, created_at FROM notes ORDER BY id DESC LIMIT 100');
  } catch (e: any) { sqlError.value = e?.message || 'query failed'; }
}
async function onAddNote() {
  const body = noteBody.value.trim();
  if (!body) return;
  try {
    sqlError.value = null;
    await run('INSERT INTO notes (body) VALUES (?)', [body]);
    noteBody.value = '';
    await onLoadNotes();
  } catch (e: any) { sqlError.value = e?.message || 'insert failed'; }
}
async function onDeleteNote(id: number) {
  try {
    await run('DELETE FROM notes WHERE id = ?', [id]);
    await onLoadNotes();
  } catch (e: any) { sqlError.value = e?.message || 'delete failed'; }
}
async function onClearNotes() {
  try { await reset(); await onLoadNotes(); }
  catch (e: any) { sqlError.value = e?.message || 'clear failed'; }
}
function formatWhen(secs: number) {
  return new Date(secs * 1000).toLocaleString();
}
onMounted(() => { onLoadNotes(); });
// Propagate any bootstrap failure to the UI
setTimeout(() => { if (sqliteInitError.value) sqlError.value = sqliteInitError.value; }, 500);

declare const __APP_VERSION__: string;
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

const estimatedKB = computed(() =>
  photoDataUrl.value ? Math.round((photoDataUrl.value.length * 3 / 4) / 1024) : 0
);

onMounted(() => { checkPermission(); });

async function camCheck() { await checkPermission(); }
async function camRequest() { await requestPermission(); }
async function onTake() {
  if (camPermission.value !== 'granted') await requestPermission();
  await takePhoto();
}
async function onPick() {
  await pickPhoto();
}
</script>

<style scoped>
.kv {
  @apply flex justify-between gap-3 border-b border-border py-2 text-[13px];
}
.kv code {
  @apply break-all text-right text-muted;
}
.btn-row {
  @apply mt-2.5 flex gap-2;
}
.btn {
  @apply flex-1 cursor-pointer rounded-[10px] border border-border bg-surface p-3 font-semibold text-text disabled:opacity-50;
}
.btn-primary {
  @apply border-primary bg-primary text-white;
}
.btn-danger {
  @apply border-red-200 bg-red-100 text-red-700;
}
</style>
