<template>
  <div class="min-h-full">
    <PageHeader :title="`Task #${id}`" subtitle="Opened via deep link or navigation" />
    <section class="px-5 py-3">
      <div class="kv"><span>Task ID</span><code>{{ id }}</code></div>
      <div class="kv" v-if="ref"><span>Ref (query param)</span><code>{{ ref }}</code></div>
      <div class="kv"><span>Route path</span><code>{{ $route.fullPath }}</code></div>
      <p class="mt-3 text-xs text-muted">
        Try opening <code>dailygig://task/{{ id }}?ref=push</code> from adb or a
        note-taking app on the phone.
      </p>
      <button
        class="mt-4 cursor-pointer rounded-[10px] border border-border bg-surface px-4 py-3 font-semibold text-text"
        @click="$router.back()"
      >
        ← Back
      </button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import PageHeader from '../components/PageHeader.vue';

const route = useRoute();
const id = computed(() => String(route.params.id ?? ''));
const ref = computed(() => (route.query.ref as string) || '');
</script>

<style scoped>
@reference "../style.css";

.kv {
  @apply flex justify-between gap-3 border-b border-border py-2 text-[13px];
}
.kv code {
  @apply break-all text-right text-muted;
}
</style>
