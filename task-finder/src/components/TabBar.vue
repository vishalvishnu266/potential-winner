<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-[100] flex items-stretch justify-around border-t border-border bg-surface pb-safe-bottom shadow-[0_-2px_12px_rgba(0,0,0,0.04)]"
    role="tablist"
    aria-label="Main navigation"
  >
    <button
      v-for="tab in tabs"
      :key="tab.name"
      class="flex min-h-14 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 border-none bg-transparent px-1 pb-2.5 pt-2 transition-colors duration-150 [-webkit-tap-highlight-color:transparent]"
      :class="current === tab.name ? 'text-primary' : 'text-muted'"
      role="tab"
      :aria-selected="current === tab.name"
      :aria-label="tab.label"
      @click="go(tab)"
    >
      <span class="tab-icon inline-flex h-6 w-6" v-html="tab.icon" />
      <span class="text-[11px] font-semibold tracking-wider">{{ tab.label }}</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { hapticTap } from '../composables/useNative';

type Tab = { name: string; label: string; path: string; icon: string };

const tabs: Tab[] = [
  {
    name: 'sandbox', label: 'Sandbox', path: '/sandbox',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><circle cx="7" cy="6.5" r="0.6" fill="currentColor"/><circle cx="9.5" cy="6.5" r="0.6" fill="currentColor"/></svg>',
  },
  {
    name: 'location', label: 'Location', path: '/location',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s-7-7.58-7-12a7 7 0 1 1 14 0c0 4.42-7 12-7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  },
  {
    name: 'device', label: 'Device', path: '/device',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 19h2"/></svg>',
  },
  {
    name: 'settings', label: 'Settings', path: '/settings',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  },
];

const route = useRoute();
const router = useRouter();
const current = computed(() => (route.meta?.tab as string) || 'home');

function go(tab: Tab) {
  hapticTap();
  if (route.path !== tab.path) router.push(tab.path);
}
</script>

<style scoped>
/*
 * The SVG icons are rendered via v-html, so their inner <svg> element
 * cannot be styled by Tailwind utility classes directly. Force them to
 * fill their parent span (which is w-6 h-6).
 */
.tab-icon :deep(svg) {
  width: 100%;
  height: 100%;
}
</style>
