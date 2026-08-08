<template>
  <div class="flex min-h-screen flex-col bg-bg">
    <main class="flex-1 overflow-y-auto pb-tabbar">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
    <TabBar />
    <UpdateOverlay />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import TabBar from './components/TabBar.vue';
import UpdateOverlay from './components/UpdateOverlay.vue';
import { initNative } from './composables/useNative';
import { initDeepLinks } from './composables/useDeepLinks';
import { useOta } from './composables/useOta';

const router = useRouter();
const { startAutoUpdate } = useOta();

onMounted(() => {
  initNative();
  initDeepLinks(router);
  // App-wide OTA poller. Runs regardless of which tab is active so a user
  // stuck on the Sandbox tab still receives hot updates.
  startAutoUpdate(15_000);
});
</script>

<style scoped>
/* Vue <transition> hooks — Tailwind can't express these directly. */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
