<script setup lang="ts">
import { Inbox } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    title?: string
    description?: string
  }>(),
  {
    title: 'Nothing here yet',
    description: 'Try another page, search term or category.',
  },
)
</script>

<template>
  <div
    class="rounded-3xl border border-dashed border-neutral-300 px-6 py-16 text-center dark:border-neutral-700"
  >
    <div
      class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-300"
    >
      <Inbox class="h-6 w-6" aria-hidden="true" />
    </div>
    <h3 class="mt-5 text-lg font-semibold text-neutral-900 dark:text-white">
      {{ title }}
    </h3>
    <p class="mx-auto mt-2 max-w-md text-sm text-neutral-500 dark:text-neutral-400">
      {{ description }}
    </p>
    <div v-if="$slots.default" class="mt-6 flex justify-center gap-3">
      <slot />
    </div>
  </div>
</template>
