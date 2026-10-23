<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Search, X } from 'lucide-vue-next'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
const router = useRouter()
const query = ref('')
const input = ref<HTMLInputElement | null>(null)

watch(
  () => ui.searchOpen,
  async (open) => {
    if (!open) return
    await nextTick()
    input.value?.focus()
  },
)

function close(): void {
  ui.closeSearch()
}

async function submit(): Promise<void> {
  const value = query.value.trim()
  if (!value) return
  await router.push({ name: 'search', query: { q: value } })
  ui.closeSearch()
  query.value = ''
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && ui.searchOpen) close()
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="ui.searchOpen"
      class="fixed inset-0 z-50 flex items-start justify-center bg-neutral-950/60 px-4 pt-24 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Search stories"
      @click.self="close"
      @keydown="onKeydown"
    >
      <div
        class="w-full max-w-2xl overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-float dark:border-neutral-800 dark:bg-neutral-900"
      >
        <form class="flex items-center gap-3 px-5 py-4" @submit.prevent="submit">
          <Search class="h-5 w-5 text-neutral-400" aria-hidden="true" />
          <input
            ref="input"
            v-model="query"
            type="search"
            placeholder="Search stories, topics, authors…"
            class="h-10 flex-1 border-0 bg-transparent text-base text-neutral-900 placeholder:text-neutral-400 focus:ring-0 dark:text-white"
            aria-label="Search query"
          />
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Close search"
            @click="close"
          >
            <X class="h-5 w-5" aria-hidden="true" />
          </button>
        </form>
        <div
          class="flex items-center justify-between border-t border-neutral-100 px-5 py-3 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400"
        >
          <span>Press Enter to search</span>
          <button
            type="button"
            class="font-medium text-primary-600 dark:text-primary-300"
            @click="submit"
          >
            Search
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
