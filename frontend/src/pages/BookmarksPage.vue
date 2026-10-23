<script setup lang="ts">
import { ref, watch } from 'vue'
import { Bookmark } from 'lucide-vue-next'
import type { Post } from '@/api/types'
import { getDataSource } from '@/api'
import { useBookmarkStore } from '@/stores/bookmark'
import { useUiStore } from '@/stores/ui'
import PostCard from '@/components/post/PostCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const bookmarks = useBookmarkStore()
const ui = useUiStore()
const items = ref<Post[]>([])
const loading = ref(false)

async function load(): Promise<void> {
  if (!bookmarks.ids.length) {
    items.value = []
    return
  }
  loading.value = true
  try {
    const page = await getDataSource().listPosts({
      page: 1,
      perPage: 100,
      sort: '-createdAt',
      filter: { ids: bookmarks.ids },
    })
    const order = new Map(bookmarks.ids.map((id, index) => [id, index]))
    items.value = page.items
      .slice()
      .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
  } finally {
    loading.value = false
  }
}

watch(
  () => bookmarks.ids,
  () => {
    void load()
  },
  { immediate: true, deep: true },
)

function clearAll(): void {
  bookmarks.clear()
  ui.notify('Bookmarks cleared.')
}
</script>

<template>
  <div class="page-shell pb-20">
    <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary-600 dark:text-primary-300">
          <Bookmark class="h-3.5 w-3.5" aria-hidden="true" />
          Reading list
        </p>
        <h1 class="mt-2 text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Your bookmarks
        </h1>
        <p class="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          {{ bookmarks.count }} saved {{ bookmarks.count === 1 ? 'story' : 'stories' }}.
          Stored locally in this browser.
        </p>
      </div>
      <BaseButton
        v-if="bookmarks.count"
        variant="outline"
        size="sm"
        @click="clearAll"
      >
        Clear all
      </BaseButton>
    </header>

    <div v-if="loading" class="flex justify-center py-20">
      <LoadingSpinner />
    </div>

    <EmptyState
      v-else-if="!items.length"
      class="mt-10"
      title="No bookmarks yet"
      description="Tap the bookmark icon on any story to keep it here for later."
    >
      <BaseButton to="/" size="sm">Browse stories</BaseButton>
    </EmptyState>

    <div v-else class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <PostCard v-for="post in items" :key="post.id" :post="post" show-excerpt />
    </div>
  </div>
</template>
