<script setup lang="ts">
import type { Category } from '@/api/types'

withDefaults(
  defineProps<{
    categories: Category[]
    overlay?: boolean
    limit?: number
  }>(),
  { overlay: false, limit: 2 },
)
</script>

<template>
  <div class="flex flex-wrap items-center gap-1.5">
    <RouterLink
      v-for="category in categories.slice(0, limit)"
      :key="category.id"
      :to="`/category/${category.slug}`"
      class="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide transition"
      :class="
        overlay
          ? 'bg-white/90 text-neutral-900 backdrop-blur hover:bg-white'
          : 'bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-primary-950 dark:text-primary-200 dark:hover:bg-primary-900'
      "
    >
      {{ category.name }}
    </RouterLink>
  </div>
</template>
