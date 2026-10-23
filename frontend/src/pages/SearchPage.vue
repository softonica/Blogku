<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Search } from 'lucide-vue-next'
import type { Category, Tag } from '@/api/types'
import { getDataSource } from '@/api'
import { usePagedPosts } from '@/composables/usePagedPosts'
import { useDocumentTitle } from '@/composables/useDocumentTitle'
import PostCard from '@/components/post/PostCard.vue'
import PaginationBar from '@/components/ui/PaginationBar.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import TagBadge from '@/components/post/TagBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const route = useRoute()
const router = useRouter()
const query = computed(() => String(route.query.q ?? '').trim())
const input = ref(query.value)
const categories = ref<Category[]>([])
const tags = ref<Tag[]>([])
const title = ref('Search')
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
  getFilter: () => (query.value ? { search: query.value } : undefined),
})

onMounted(async () => {
  const source = getDataSource()
  const [categoryList, tagList] = await Promise.all([
    source.listCategories(),
    source.listTags(),
  ])
  categories.value = categoryList
  tags.value = tagList
})

watch(
  query,
  async (value) => {
    input.value = value
    title.value = value ? `Search: ${value}` : 'Search'
    if (!value) {
      items.value = []
      totalItems.value = 0
      totalPages.value = 1
      return
    }
    await reset()
  },
  { immediate: true },
)

async function submit(): Promise<void> {
  const value = input.value.trim()
  await router.push({ name: 'search', query: value ? { q: value } : {} })
}
</script>

<template>
  <div class="page-shell pb-20">
    <header class="mx-auto max-w-3xl text-center">
      <p class="text-xs font-bold uppercase tracking-[0.2em] text-primary-600 dark:text-primary-300">
        Search
      </p>
      <h1 class="mt-3 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-white">
        Find your next read
      </h1>
      <p class="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
        Search titles, excerpts, authors, categories and tags.
      </p>

      <form class="mt-7" @submit.prevent="submit">
        <div
          class="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 shadow-sm focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-100 dark:border-neutral-800 dark:bg-neutral-900 dark:focus-within:border-primary-500 dark:focus-within:ring-primary-950"
        >
          <Search class="h-5 w-5 shrink-0 text-neutral-400" aria-hidden="true" />
          <label for="search-input" class="sr-only">Search stories</label>
          <input
            id="search-input"
            v-model="input"
            type="search"
            placeholder="Try “design”, “Vue” or “coffee”"
            class="h-10 min-w-0 flex-1 border-0 bg-transparent text-base text-neutral-900 placeholder:text-neutral-400 focus:ring-0 dark:text-white"
          />
          <BaseButton type="submit" size="sm">Search</BaseButton>
        </div>
      </form>
    </header>

    <section v-if="!query" class="mx-auto mt-12 max-w-5xl">
      <div class="grid gap-6 md:grid-cols-2">
        <div class="rounded-3xl border border-neutral-200 p-6 dark:border-neutral-800">
          <h2 class="text-sm font-bold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
            Popular topics
          </h2>
          <div class="mt-4 flex flex-wrap gap-2">
            <TagBadge v-for="tag in tags" :key="tag.id" :tag="tag" />
          </div>
        </div>
        <div class="rounded-3xl border border-neutral-200 p-6 dark:border-neutral-800">
          <h2 class="text-sm font-bold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
            Browse categories
          </h2>
          <div class="mt-4 flex flex-wrap gap-2">
            <RouterLink
              v-for="category in categories"
              :key="category.id"
              :to="`/category/${category.slug}`"
              class="inline-flex items-center rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:border-primary-300 hover:text-primary-700 dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-primary-700 dark:hover:text-primary-300"
            >
              {{ category.name }}
            </RouterLink>
          </div>
        </div>
      </div>
    </section>

    <section v-else class="mt-10">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <p class="text-sm font-medium text-neutral-500 dark:text-neutral-400">
          <span class="font-bold text-neutral-900 dark:text-white">
            {{ totalItems }}
          </span>
          result{{ totalItems === 1 ? '' : 's' }} for
          <span class="font-semibold text-primary-600 dark:text-primary-300">“{{ query }}”</span>
        </p>
        <RouterLink
          :to="{ name: 'search' }"
          class="text-xs font-semibold text-neutral-500 hover:text-primary-600 dark:text-neutral-400 dark:hover:text-primary-300"
        >
          Clear search
        </RouterLink>
      </div>

      <div
        v-if="error"
        class="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"
      >
        {{ error }}
      </div>
      <div v-else-if="loading" class="flex justify-center py-16">
        <LoadingSpinner />
      </div>
      <EmptyState
        v-else-if="!items.length"
        class="mt-6"
        title="No matches"
        description="Try a shorter phrase, a different topic, or browse a category instead."
      >
        <BaseButton to="/search" variant="outline">Clear search</BaseButton>
      </EmptyState>
      <template v-else>
        <div class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <PostCard v-for="post in items" :key="post.id" :post="post" show-excerpt />
        </div>
        <div class="mt-10">
          <PaginationBar :page="page" :total-pages="totalPages" @change="goTo" />
        </div>
      </template>
    </section>
  </div>
</template>
