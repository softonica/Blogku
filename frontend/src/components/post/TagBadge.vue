<script setup lang="ts">
import type { Tag } from '@/api/types'

defineProps<{ tag: Tag }>()
</script>

<template>
  <RouterLink
    :to="`/tag/${tag.slug}`"
    class="inline-flex items-center rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-600 transition hover:border-primary-300 hover:text-primary-700 dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-primary-700 dark:hover:text-primary-300"
  >
    #{{ tag.name }}
  </RouterLink>
</template>
