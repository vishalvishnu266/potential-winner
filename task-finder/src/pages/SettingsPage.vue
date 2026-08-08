<template>
  <div class="min-h-full">
    <PageHeader title="Settings" />

    <section class="mx-5 mb-5 mt-3 flex items-center gap-3.5 rounded-2xl border border-border bg-surface p-4">
      <div class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[22px]">👤</div>
      <div>
        <div class="font-bold text-text">Guest User</div>
        <div class="mt-0.5 text-xs text-muted">Sign in to sync your tasks & rides</div>
      </div>
    </section>

    <section class="mx-5 mb-5 overflow-hidden rounded-2xl border border-border bg-surface">
      <div class="px-3.5 pb-1.5 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted">Account</div>
      <button class="row"><span>Profile</span><span class="chev">›</span></button>
      <button class="row"><span>Payment methods</span><span class="chev">›</span></button>
      <button class="row"><span>Notifications</span><span class="chev">›</span></button>
    </section>

    <section class="mx-5 mb-5 overflow-hidden rounded-2xl border border-border bg-surface">
      <div class="px-3.5 pb-1.5 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted">Preferences</div>
      <button class="row"><span>Language</span><span class="value">English ›</span></button>
      <button class="row"><span>Currency</span><span class="value">USD ›</span></button>
    </section>

    <section class="mx-5 mb-5 overflow-hidden rounded-2xl border border-border bg-surface">
      <div class="px-3.5 pb-1.5 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted">App</div>
      <div class="row cursor-default">
        <div>
          <div>App version</div>
          <div class="sub">v{{ appVersion }}</div>
        </div>
        <span class="value">{{ statusMessage }}</span>
      </div>
      <button class="row" :disabled="isUpdating" @click="handleCheckUpdate">
        <span>{{ isUpdating ? 'Checking…' : 'Check for updates' }}</span>
        <span class="chev">{{ isUpdating ? '…' : '↻' }}</span>
      </button>
      <button class="row"><span>About</span><span class="chev">›</span></button>
      <button class="row"><span>Privacy Policy</span><span class="chev">›</span></button>
      <button class="row"><span>Terms of Service</span><span class="chev">›</span></button>
    </section>

    <button class="mx-5 mb-6 mt-1 w-[calc(100%-2.5rem)] cursor-pointer rounded-xl border border-red-200 bg-transparent p-3.5 font-semibold text-red-600">
      Sign out
    </button>
  </div>
</template>

<script setup lang="ts">
import PageHeader from '../components/PageHeader.vue';
import { useOta } from '../composables/useOta';
import { hapticTap } from '../composables/useNative';

declare const __APP_VERSION__: string;
const appVersion = __APP_VERSION__;

// Note: global auto-poll is started in App.vue — no need to start it here.
const { checkForUpdate, statusMessage, isUpdating } = useOta();

async function handleCheckUpdate() {
  await hapticTap();
  await checkForUpdate(false);
}
</script>

<style scoped>
@reference "../style.css";

/*
 * The .row / .chev / .sub / .value pattern is used a lot in this file
 * and includes a first-of-type border reset that Tailwind's arbitrary
 * variants would make very noisy. Keep as a small component-scoped
 * class layer built from Tailwind utilities via @apply.
 */
.row {
  @apply flex w-full cursor-pointer items-center justify-between border-none border-t border-border bg-transparent p-3.5 text-left text-sm text-text disabled:opacity-60;
}
.row:first-of-type {
  border-top: none;
}
.row .sub {
  @apply mt-0.5 text-[11px] text-muted;
}
.row .value {
  @apply text-[13px] text-muted;
}
.row .chev {
  @apply text-[18px] text-gray-400;
}
</style>
