<template>
  <div class="min-h-full">
    <PageHeader title="Device" subtitle="Native info & network status" />

    <section class="px-5 py-3">
      <h3 class="my-1 mb-2.5 text-[15px] font-semibold">Network</h3>
      <div class="kv">
        <span>Status</span>
        <code :class="network.connected ? 'text-emerald-600' : 'text-red-600'">
          {{ network.connected ? 'online' : 'offline' }}
        </code>
      </div>
      <div class="kv"><span>Type</span><code>{{ network.connectionType }}</code></div>
    </section>

    <section class="px-5 py-3" v-if="info">
      <h3 class="my-1 mb-2.5 text-[15px] font-semibold">Device</h3>
      <div class="kv"><span>Platform</span><code>{{ info.platform }}</code></div>
      <div class="kv"><span>Model</span><code>{{ info.model }}</code></div>
      <div class="kv"><span>OS</span><code>{{ info.operatingSystem }} {{ info.osVersion }}</code></div>
      <div class="kv"><span>Manufacturer</span><code>{{ info.manufacturer }}</code></div>
      <div class="kv"><span>Virtual</span><code>{{ info.isVirtual ? 'yes (emulator)' : 'no (real device)' }}</code></div>
      <div class="kv"><span>Web view</span><code>{{ info.webViewVersion }}</code></div>
    </section>

    <section class="px-5 py-3" v-if="battery">
      <h3 class="my-1 mb-2.5 text-[15px] font-semibold">Battery</h3>
      <div class="kv"><span>Level</span><code>{{ Math.round((battery.batteryLevel || 0) * 100) }}%</code></div>
      <div class="kv"><span>Charging</span><code>{{ battery.isCharging ? 'yes' : 'no' }}</code></div>
    </section>

    <button
      class="mx-5 mb-6 mt-3 w-[calc(100%-2.5rem)] cursor-pointer rounded-[10px] border border-border bg-surface p-3 font-semibold text-text"
      @click="refresh"
    >
      Refresh
    </button>
  </div>
</template>

<script setup lang="ts">
import PageHeader from '../components/PageHeader.vue';
import { useDevice } from '../composables/useDevice';

const { info, battery, network, refresh } = useDevice();
</script>

<style scoped>
.kv {
  @apply flex justify-between gap-3 border-b border-border py-2 text-[13px];
}
.kv code {
  @apply text-muted;
}
</style>
