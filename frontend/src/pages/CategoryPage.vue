<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { Category } from '@/api/types'
import { getDataSource } from '@/api'
import { usePagedPosts } from '@/composables/usePagedPosts'
import { useDocumentTitle } from '@/composables/useDocumentTitle'
import PostCard from '@/components/post/PostCard.vue'
import PaginationBar from '@/components/ui/PaginationBar.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import PostImage from '@/components/ui/PostImage.vue'

const route = useRoute()
const slug = computed(() => String(route.params.slug ?? ''))
const category = ref<Category | null>(null)
const categories = ref<Category[]>([])
const ready = ref(false)
const title = ref('Category')
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
  getFilter: () => ({ categorySlug: slug.value }),
})

async function init(): Promise<void> {
  ready.value = false
  const list = await getDataSource().listCategories()
  categories.value = list
  category.value = list.find((item) => item.slug === slug.value) ?? null
  title.value = category.value?.name ?? 'Category'
  ready.value = true
  if (category.value) {
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
    <div v-if="ready && category" class="relative overflow-hidden bg-neutral-950">
      <div class="absolute inset-0 opacity-40">
        <PostImage
          :src="category.image"
          :alt="category.name"
          aspect="h-full"
          sizes="100vw"
        />
      </div>
      <div class="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/80 to-neutral-950/30"></div>
      <div class="container relative py-14 sm:py-20">
        <p class="text-xs font-bold uppercase tracking-[0.2em] text-primary-300">
          Category
        </p>
        <h1 class="mt-3 text-3xl font-bold tracking-tight text-white sm:text-5xl">
          {{ category.name }}
        </h1>
        <p class="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-300 sm:text-base">
          {{ category.description }}
        </p>
        <p class="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
          {{ totalItems }} stories
        </p>
      </div>
    </div>

    <div class="page-shell pb-20">
      <div v-if="!ready" class="flex justify-center py-20">
        <LoadingSpinner />
      </div>

      <EmptyState
        v-else-if="!category"
        title="Category not found"
        description="That desk does not exist. Try one of the categories below."
      >
        <RouterLink
          v-for="item in categories.slice(0, 3)"
          :key="item.id"
          :to="`/category/${item.slug}`"
          class="inline-flex h-10 items-center rounded-full border border-neutral-200 px-4 text-sm font-semibold text-neutral-700 dark:border-neutral-800 dark:text-neutral-200"
        >
          {{ item.name }}
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
          title="No stories yet"
          description="This desk is quiet for now. Check back soon or explore another category."
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
