<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Hash } from 'lucide-vue-next'
import type { Tag } from '@/api/types'
import { getDataSource } from '@/api'
import { usePagedPosts } from '@/composables/usePagedPosts'
import { useDocumentTitle } from '@/composables/useDocumentTitle'
import PostCard from '@/components/post/PostCard.vue'
import PaginationBar from '@/components/ui/PaginationBar.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'

const route = useRoute()
const slug = computed(() => String(route.params.slug ?? ''))
const tag = ref<Tag | null>(null)
const tags = ref<Tag[]>([])
const ready = ref(false)
const title = ref('Tag')
useDocumentTitle(title)

const {
  items,
  page,
  totalItems,
  totalPages,
  loading,
  error,
  goTo,
  reset,
} = usePagedPosts({
  perPage: 9,
  sort: '-createdAt',
  getFilter: () => ({ tagSlug: slug.value }),
})

async function init(): Promise<void> {
  ready.value = false
  const list = await getDataSource().listTags()
  tags.value = list
  tag.value = list.find((item) => item.slug === slug.value) ?? null
  title.value = tag.value?.name ?? 'Tag'
  ready.value = true
  if (tag.value) {
    await reset()
  } else {
    items.value = []
    totalItems.value = 0
    totalPages.value = 1
  }
}

watch(slug, init, { immediate: true })
</script>

<template>
  <div>
    <div class="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
      <div class="container py-12 sm:py-16">
        <p class="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.2em] text-primary-600 dark:text-primary-300">
          <Hash class="h-3.5 w-3.5" aria-hidden="true" />
          Tag
        </p>
        <h1 class="mt-3 text-3xl font-bold tracking-tight text-neutral-900 sm:text-5xl dark:text-white">
          {{ tag ? tag.name : 'Tag' }}
        </h1>
        <p class="mt-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">
          {{ totalItems }} stories tagged “{{ tag?.name ?? slug }}”
        </p>
      </div>
    </div>

    <div class="page-shell pb-20">
      <div v-if="!ready" class="flex justify-center py-20">
        <LoadingSpinner />
      </div>

      <EmptyState
        v-else-if="!tag"
        title="Tag not found"
        description="That tag does not exist. Try another topic."
      >
        <RouterLink
          v-for="item in tags.slice(0, 4)"
          :key="item.id"
          :to="`/tag/${item.slug}`"
          class="inline-flex h-10 items-center rounded-full border border-neutral-200 px-4 text-sm font-semibold text-neutral-700 dark:border-neutral-800 dark:text-neutral-200"
        >
          #{{ item.name }}
        </RouterLink>
      </EmptyState>

      <template v-else>
        <div
          v-if="error"
          class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"
        >
          {{ error }}
        </div>
        <div v-else-if="loading" class="flex justify-center py-16">
          <LoadingSpinner />
        </div>
        <EmptyState
          v-else-if="!items.length"
          title="No stories with this tag"
          description="It is quiet here for now. Explore another topic instead."
        />
        <template v-else>
          <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <PostCard v-for="post in items" :key="post.id" :post="post" show-excerpt />
          </div>
          <div class="mt-10">
            <PaginationBar :page="page" :total-pages="totalPages" @change="goTo" />
          </div>
        </template>
      </template>
    </div>
  </div>
</template>
