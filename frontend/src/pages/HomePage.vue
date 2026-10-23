<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useIntersectionObserver } from '@vueuse/core'
import type { Category, Post, Tag, User } from '@/api/types'
import { getDataSource } from '@/api'
import { getErrorMessage } from '@/lib/format'
import { useInfinitePosts } from '@/composables/useInfinitePosts'
import HeroSection from '@/components/sections/HeroSection.vue'
import CategoriesSection from '@/components/sections/CategoriesSection.vue'
import PodcastSection from '@/components/sections/PodcastSection.vue'
import VideoSection from '@/components/sections/VideoSection.vue'
import NewsletterSection from '@/components/sections/NewsletterSection.vue'
import PostCard from '@/components/post/PostCard.vue'
import AuthorCard from '@/components/widgets/AuthorCard.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { posts as seedPosts } from '@/api/mock-data/posts'
import { categories as seedCategories } from '@/api/mock-data/categories'
import { users as seedUsers } from '@/api/mock-data/users'
import { tags as seedTags } from '@/api/mock-data/tags'

const featured = ref<Post[]>(seedPosts.filter((p) => p.featured).slice(0, 4))
const podcastPosts = ref<Post[]>(seedPosts.filter((p) => p.postType === 'audio').slice(0, 6))
const videoPosts = ref<Post[]>(seedPosts.filter((p) => p.postType === 'video').slice(0, 5))
const categories = ref<Category[]>(seedCategories)
const authors = ref<User[]>(seedUsers.slice(0, 4))
const tags = ref<Tag[]>(seedTags.slice(0, 10))
const loadingFeatured = ref(false)
const featuredError = ref('')
const sentinel = ref<HTMLElement | null>(null)

// Category tab filter for Latest Articles
const selectedCategory = ref<string>('all')

const {
  items: latestItems,
  loading: latestLoading,
  error: latestError,
  hasMore: latestHasMore,
  reload: reloadLatest,
  loadMore: loadMoreLatest,
} = useInfinitePosts({
  perPage: 6,
  sort: '-createdAt',
  initialItems: seedPosts.slice(0, 6),
  initialTotalItems: seedPosts.length,
  getFilter: () =>
    selectedCategory.value === 'all'
      ? undefined
      : { categorySlug: selectedCategory.value },
})

function selectTab(catSlug: string) {
  selectedCategory.value = catSlug
  void reloadLatest()
}

onMounted(async () => {
  const source = getDataSource()
  try {
    const [postPage, allPostsPage, categoryList, authorList, tagList] = await Promise.all([
      source.listPosts({
        page: 1,
        perPage: 4,
        sort: '-createdAt',
        filter: { featured: true },
      }),
      source.listPosts({
        page: 1,
        perPage: 20,
        sort: '-createdAt',
      }),
      source.listCategories(),
      source.listAuthorsFeatured(4),
      source.listTags(),
    ])
    featured.value = postPage.items.length ? postPage.items : allPostsPage.items.slice(0, 4)
    categories.value = categoryList
    authors.value = authorList
    tags.value = tagList.slice(0, 10)

    // Filter audio posts for podcast section
    const audios = allPostsPage.items.filter((p) => p.postType === 'audio')
    podcastPosts.value = audios.length >= 2 ? audios : allPostsPage.items.slice(2, 8)

    // Filter video posts for video section
    const videos = allPostsPage.items.filter((p) => p.postType === 'video')
    videoPosts.value = videos.length >= 2 ? videos : allPostsPage.items.slice(1, 6)
  } catch (error) {
    featuredError.value = getErrorMessage(error)
  } finally {
    loadingFeatured.value = false
  }
})

useIntersectionObserver(
  sentinel,
  ([entry]) => {
    if (entry?.isIntersecting && !latestLoading.value && latestHasMore.value) {
      void loadMoreLatest()
    }
  },
  { rootMargin: '100px' },
)
</script>

<template>
  <div class="page-shell space-y-20 pb-24">
    <!-- Skeleton Loading -->
    <div v-if="loadingFeatured" class="space-y-6">
      <div class="h-96 animate-pulse rounded-[40px] bg-neutral-100 dark:bg-neutral-900"></div>
      <div class="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
        <div class="h-44 animate-pulse rounded-3xl bg-neutral-100 dark:bg-neutral-900"></div>
        <div class="h-44 animate-pulse rounded-3xl bg-neutral-100 dark:bg-neutral-900"></div>
        <div class="h-44 animate-pulse rounded-3xl bg-neutral-100 dark:bg-neutral-900"></div>
      </div>
    </div>

    <p
      v-else-if="featuredError"
      class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"
    >
      {{ featuredError }}
    </p>

    <template v-else>
      <!-- Section 1: Hero Banner + 3 Floating Card5 (nc-SectionHero3) -->
      <HeroSection :posts="featured" />

      <!-- Section 2: Top Trending Topics Slider (nc-SectionSliderNewCategories) -->
      <CategoriesSection v-if="categories.length" :categories="categories" />

      <!-- Section 3: Podcast Magazine (nc-SectionMagazine8) -->
      <PodcastSection v-if="podcastPosts.length" :posts="podcastPosts" />

      <!-- Section 4: Video Section (Trending Videos) -->
      <VideoSection v-if="videoPosts.length" :posts="videoPosts" />

      <!-- Section 5: Newsletter Banner ("Join our newsletter 🎉") -->
      <NewsletterSection />

      <!-- Section 6: Latest Articles Grid & Tabs (nc-SectionGridPosts) -->
      <section class="nc-SectionGridPosts relative space-y-8">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 class="text-2xl font-bold tracking-tight sm:text-3xl text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <span>Latest articles 🎈</span>
            </h2>
            <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Discover the freshest essays, field notes, and guides
            </p>
          </div>

          <!-- Category Filter Tabs -->
          <div class="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              :class="[
                'shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition',
                selectedCategory === 'all'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700',
              ]"
              @click="selectTab('all')"
            >
              All items
            </button>
            <button
              v-for="cat in categories"
              :key="cat.id"
              type="button"
              :class="[
                'shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition',
                selectedCategory === cat.slug
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700',
              ]"
              @click="selectTab(cat.slug)"
            >
              {{ cat.name }}
            </button>
          </div>
        </div>

        <div
          v-if="latestError"
          class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"
        >
          {{ latestError }}
          <button type="button" class="ms-2 font-semibold underline" @click="reloadLatest">
            Retry
          </button>
        </div>

        <!-- 2 Column Layout: Articles Grid + Sidebar -->
        <div v-else class="grid gap-10 lg:grid-cols-3">
          <!-- Main Articles Grid (2 cols on tablet, 2 cols in column) -->
          <div class="lg:col-span-2 space-y-6">
            <div class="grid gap-6 sm:grid-cols-2">
              <PostCard
                v-for="post in latestItems"
                :key="post.id"
                :post="post"
                show-excerpt
              />
            </div>

            <div
              v-if="latestLoading && !latestItems.length"
              class="flex justify-center py-10"
            >
              <LoadingSpinner />
            </div>

            <div ref="sentinel" class="mt-8 flex flex-col items-center gap-3">
              <LoadingSpinner v-if="latestLoading && latestItems.length" />
              <BaseButton
                v-else-if="latestHasMore"
                variant="outline"
                @click="loadMoreLatest()"
              >
                Load more stories
              </BaseButton>
              <p
                v-else-if="latestItems.length"
                class="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400"
              >
                You’ve reached the end
              </p>
            </div>
          </div>

          <!-- Sidebar on Right -->
          <div class="space-y-8">
            <!-- Trending Authors Widget (nc-CardAuthor2) -->
            <div
              v-if="authors.length"
              class="rounded-3xl border border-neutral-200/80 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900 shadow-sm"
            >
              <h3 class="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-4">
                Top authors ✍️
              </h3>
              <div class="space-y-4">
                <AuthorCard v-for="author in authors" :key="author.id" :author="author" />
              </div>
            </div>

            <!-- Popular Tags Cloud -->
            <div
              v-if="tags.length"
              class="rounded-3xl border border-neutral-200/80 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900 shadow-sm"
            >
              <h3 class="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-4">
                Popular tags 🏷️
              </h3>
              <div class="flex flex-wrap gap-2">
                <RouterLink
                  v-for="tag in tags"
                  :key="tag.id"
                  :to="`/tag/${tag.slug}`"
                  class="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-600 transition hover:border-primary-300 hover:text-primary-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-primary-600 dark:hover:text-primary-300"
                >
                  #{{ tag.name }}
                </RouterLink>
              </div>
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
