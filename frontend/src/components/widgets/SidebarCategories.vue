<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'
import type { Category } from '@/api/types'

defineProps<{ categories: Category[] }>()
</script>

<template>
  <div
    class="rounded-3xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900"
  >
    <h3 class="text-sm font-bold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
      Categories
    </h3>
    <ul class="mt-4 space-y-1">
      <li v-for="category in categories" :key="category.id">
        <RouterLink
          :to="`/category/${category.slug}`"
          class="group flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 hover:text-primary-700 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-primary-300"
        >
          {{ category.name }}
          <ChevronRight
            class="h-4 w-4 text-neutral-300 transition group-hover:translate-x-0.5 group-hover:text-primary-500 dark:text-neutral-600"
            aria-hidden="true"
          />
        </RouterLink>
      </li>
    </ul>
  </div>
</template>
