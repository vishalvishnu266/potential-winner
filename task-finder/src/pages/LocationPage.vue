<template>
  <div class="min-h-full">
    <PageHeader title="Location" subtitle="Test GPS + permissions" />

    <section class="px-5 py-3">
      <div class="kv"><span>Permission</span><code>{{ permission }}</code></div>
      <div class="kv"><span>Watching</span><code>{{ watching ? 'yes' : 'no' }}</code></div>
      <div class="kv" v-if="error"><span>Error</span><code class="text-red-600">{{ error }}</code></div>
    </section>

    <section class="px-5 py-3">
      <button class="btn" @click="onCheck">Check permission</button>
      <button class="btn btn-primary" @click="onRequest">Request permission</button>
      <button class="btn" :disabled="!!error && permission === 'denied'" @click="onFix">Get current position</button>
      <button class="btn" v-if="!watching" @click="startWatch">Start watching</button>
      <button class="btn btn-danger" v-else @click="stopWatch">Stop watching</button>
    </section>

    <section class="px-5 py-3" v-if="position">
      <h3 class="my-1 mb-2.5 text-[15px] font-semibold">Current position</h3>
      <div class="kv"><span>Latitude</span><code>{{ position.latitude.toFixed(6) }}</code></div>
      <div class="kv"><span>Longitude</span><code>{{ position.longitude.toFixed(6) }}</code></div>
      <div class="kv"><span>Accuracy</span><code>{{ position.accuracy?.toFixed(1) }} m</code></div>
      <div class="kv" v-if="position.altitude != null">
        <span>Altitude</span><code>{{ position.altitude.toFixed(1) }} m</code>
      </div>
      <div class="kv" v-if="position.speed != null">
        <span>Speed</span><code>{{ position.speed.toFixed(2) }} m/s</code>
      </div>
      <div class="kv" v-if="timestamp">
        <span>Fix time</span><code>{{ new Date(timestamp).toLocaleTimeString() }}</code>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import PageHeader from '../components/PageHeader.vue';
import { useLocation } from '../composables/useLocation';

const {
  position, timestamp, error, permission, watching,
  checkPermission, requestPermission, getCurrent, startWatch, stopWatch,
} = useLocation();

onMounted(() => { checkPermission(); });

async function onCheck() { await checkPermission(); }
async function onRequest() { await requestPermission(); }
async function onFix() {
  if (permission.value !== 'granted') await requestPermission();
  await getCurrent();
}
</script>

<style scoped>
@reference "../style.css";

.kv {
  @apply flex justify-between gap-3 border-b border-border py-2 text-[13px];
}
.kv code {
  @apply text-muted;
}
.btn {
  @apply mb-2 w-full cursor-pointer rounded-[10px] border border-border bg-surface p-3 font-semibold text-text disabled:opacity-50;
}
.btn-primary {
  @apply border-primary bg-primary text-white;
}
.btn-danger {
  @apply border-red-200 bg-red-100 text-red-700;
}
</style>
