<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    eyebrow?: string
    title: string
    description?: string
    linkLabel?: string
    linkTo?: string
  }>(),
  { eyebrow: '', description: '', linkLabel: '', linkTo: '' },
)
</script>

<template>
  <div
    class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
  >
    <div class="max-w-2xl">
      <p
        v-if="eyebrow"
        class="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary-600 dark:text-primary-300"
      >
        {{ eyebrow }}
      </p>
      <h2
        class="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl dark:text-white"
      >
        {{ title }}
      </h2>
      <p
        v-if="description"
        class="mt-2 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400"
      >
        {{ description }}
      </p>
    </div>
    <RouterLink
      v-if="linkTo && linkLabel"
      :to="linkTo"
      class="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-300 dark:hover:text-primary-200"
    >
      {{ linkLabel }}
      <ArrowRight class="h-4 w-4" aria-hidden="true" />
    </RouterLink>
  </div>
</template>
