<script setup lang="ts">
import { Compass } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
</script>

<template>
  <div class="page-shell flex flex-col items-center py-24 text-center">
    <div class="flex h-20 w-20 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-950 dark:text-primary-300">
      <Compass class="h-9 w-9" aria-hidden="true" />
    </div>
    <p class="mt-8 text-sm font-bold uppercase tracking-[0.2em] text-primary-600 dark:text-primary-300">
      404
    </p>
    <h1 class="mt-3 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-white">
      This page took a wrong turn
    </h1>
    <p class="mt-3 max-w-md text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
      The link may be broken, or the story may have moved. Try the home page or
      search the archive.
    </p>
    <div class="mt-8 flex flex-wrap justify-center gap-3">
      <BaseButton to="/">Back home</BaseButton>
      <BaseButton to="/search" variant="outline">Search stories</BaseButton>
    </div>
  </div>
</template>
