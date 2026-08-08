<template>
  <header class="bg-surface px-5 pb-3 pt-5 pt-safe-top">
    <h1 class="m-0 text-2xl font-bold text-text">{{ title }}</h1>
    <p v-if="subtitle" class="mt-1 text-sm text-muted">{{ subtitle }}</p>
  </header>
</template>

<script setup lang="ts">
defineProps<{ title: string; subtitle?: string }>();
</script>
