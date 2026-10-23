<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps<{
  page: number
  totalPages: number
}>()

const emit = defineEmits<{ change: [page: number] }>()

const pages = computed<(number | 'gap')[]>(() => {
  const total = props.totalPages
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }
  const current = props.page
  const result: (number | 'gap')[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  if (start > 2) result.push('gap')
  for (let page = start; page <= end; page += 1) result.push(page)
  if (end < total - 1) result.push('gap')
  result.push(total)
  return result
})

function go(page: number): void {
  if (page === props.page) return
  emit('change', page)
}
</script>

<template>
  <nav
    v-if="totalPages > 1"
    class="flex flex-wrap items-center justify-center gap-2"
    aria-label="Pagination"
  >
    <button
      type="button"
      class="inline-flex h-10 items-center gap-1 rounded-full border border-neutral-200 px-4 text-sm font-medium text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-900 disabled:pointer-events-none disabled:opacity-40 dark:border-neutral-800 dark:text-neutral-300 dark:hover:text-white"
      :disabled="page <= 1"
      @click="go(page - 1)"
    >
      <ChevronLeft class="h-4 w-4" aria-hidden="true" />
      Prev
    </button>
    <template v-for="(item, index) in pages" :key="`${item}-${index}`">
      <span
        v-if="item === 'gap'"
        class="px-2 text-sm text-neutral-500 dark:text-neutral-400"
      >
        …
      </span>
      <button
        v-else
        type="button"
        class="h-10 min-w-10 rounded-full px-3 text-sm font-semibold transition"
        :class="
          item === page
            ? 'bg-primary-600 text-white dark:bg-primary-500 dark:text-neutral-950'
            : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
        "
        :aria-current="item === page ? 'page' : undefined"
        @click="go(item)"
      >
        {{ item }}
      </button>
    </template>
    <button
      type="button"
      class="inline-flex h-10 items-center gap-1 rounded-full border border-neutral-200 px-4 text-sm font-medium text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-900 disabled:pointer-events-none disabled:opacity-40 dark:border-neutral-800 dark:text-neutral-300 dark:hover:text-white"
      :disabled="page >= totalPages"
      @click="go(page + 1)"
    >
      Next
      <ChevronRight class="h-4 w-4" aria-hidden="true" />
    </button>
  </nav>
</template>
