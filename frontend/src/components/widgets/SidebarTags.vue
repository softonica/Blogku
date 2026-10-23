<script setup lang="ts">
import type { Tag } from '@/api/types'
import TagBadge from '@/components/post/TagBadge.vue'

defineProps<{ tags: Tag[] }>()
</script>

<template>
  <div
    class="rounded-3xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900"
  >
    <h3 class="text-sm font-bold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
      Tags
    </h3>
    <div class="mt-4 flex flex-wrap gap-2">
      <TagBadge v-for="tag in tags" :key="tag.id" :tag="tag" />
    </div>
  </div>
</template>
