<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { UserPlus } from 'lucide-vue-next'
import type { User } from '@/api/types'
import { getDataSource } from '@/api'
import { usePagedPosts } from '@/composables/usePagedPosts'
import { useDocumentTitle } from '@/composables/useDocumentTitle'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AuthorSocialLinks from '@/components/ui/AuthorSocialLinks.vue'
import PostCard from '@/components/post/PostCard.vue'
import PaginationBar from '@/components/ui/PaginationBar.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'

type AuthorTab = 'articles' | 'favorites' | 'bookmarks'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const ui = useUiStore()

const username = computed(() => String(route.params.username ?? ''))
const author = ref<User | null>(null)
const ready = ref(false)
const followed = ref(false)
const activeTab = ref<AuthorTab>('articles')
const sortBy = ref('-createdAt')
const title = ref('Author')
useDocumentTitle(title)

const sortOptions = [
  { value: '-createdAt', label: 'Newest to oldest' },
  { value: 'createdAt', label: 'Oldest to newest' },
  { value: '-viewCount', label: 'Most viewed' },
]

const authorTabs: { key: AuthorTab; label: string }[] = [
  { key: 'articles', label: 'Articles' },
  { key: 'favorites', label: 'Favorites list' },
  { key: 'bookmarks', label: 'Bookmarks' },
]

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
  getSort: () => sortBy.value,
  getFilter: () => ({ authorUsername: username.value }),
})

async function init(): Promise<void> {
  ready.value = false
  const found = await getDataSource().getUserByUsername(username.value)
  author.value = found
  title.value = found?.name ?? 'Author'
  ready.value = true
  if (found) {
    await reset()
  } else {
    items.value = []
    totalItems.value = 0
    totalPages.value = 1
  }
}

watch(username, init, { immediate: true })
watch(sortBy, () => {
  void reset()
})

async function follow(): Promise<void> {
  if (!auth.isAuthenticated) {
    await router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  followed.value = !followed.value
  ui.notify(
    followed.value ? 'Following is stored locally in phase 1.' : 'Unfollowed.',
    'info',
  )
}

function selectTab(tab: AuthorTab): void {
  activeTab.value = tab
}
</script>

<template>
  <div class="page-shell pb-20">
    <div v-if="!ready" class="flex justify-center py-20">
      <LoadingSpinner />
    </div>

    <EmptyState
      v-else-if="!author"
      title="Author not found"
      description="This profile does not exist or has been removed."
    >
      <RouterLink
        to="/"
        class="inline-flex h-10 items-center rounded-full bg-primary-600 px-4 text-sm font-semibold text-white"
      >
        Back home
      </RouterLink>
    </EmptyState>

    <template v-else>
      <section
        class="mt-4 overflow-hidden rounded-[2rem] ring-1 ring-neutral-200 dark:ring-neutral-800"
      >
        <!-- Cover banner -->
        <div class="relative h-40 sm:h-56">
          <img
            v-if="author.coverBanner"
            :src="author.coverBanner"
            :alt="author.name"
            class="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
          <div
            v-else
            class="h-full w-full bg-gradient-to-br from-primary-400 via-primary-500 to-primary-700"
          ></div>
          <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent"></div>
        </div>

        <div class="bg-white px-6 pb-8 sm:px-10 dark:bg-neutral-950">
          <div class="relative z-10 -mt-14 flex flex-col gap-5 sm:-mt-16 sm:flex-row sm:items-end">
            <AppAvatar
              :src="author.avatar"
              :name="author.name"
              size="xl"
              class="ring-4 ring-white dark:ring-neutral-950"
            />
            <div class="min-w-0 flex-1 sm:pb-1">
              <div class="flex flex-wrap items-center gap-3">
                <h1 class="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl dark:text-white">
                  {{ author.name }}
                </h1>
                <AppBadge variant="neutral">@{{ author.username }}</AppBadge>
                <AppBadge v-if="author.role === 'admin'" variant="primary">Editor</AppBadge>
              </div>
              <p
                v-if="author.bio"
                class="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-500 dark:text-neutral-400"
              >
                {{ author.bio }}
              </p>
              <div class="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
                <span>{{ totalItems }} posts</span>
                <span>{{ author.postCount ?? totalItems }} published</span>
              </div>
            </div>
            <div class="flex items-center gap-4 sm:pb-1">
              <AuthorSocialLinks :socials="author.socials" />
              <button
                type="button"
                class="inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-5 text-sm font-semibold transition"
                :class="
                  followed
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
                    : 'bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:text-neutral-950'
                "
                @click="follow"
              >
                <UserPlus class="h-4 w-4" aria-hidden="true" />
                {{ followed ? 'Following' : 'Follow' }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Tabs -->
      <div
        class="mt-8 flex flex-wrap items-center gap-2 rounded-2xl bg-neutral-50 p-1.5 dark:bg-neutral-900"
      >
        <button
          v-for="tab in authorTabs"
          :key="tab.key"
          type="button"
          class="whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition"
          :class="
            activeTab === tab.key
              ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-white'
              : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
          "
          @click="selectTab(tab.key)"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="mt-8">
        <template v-if="activeTab === 'articles'">
          <div class="flex items-center justify-between gap-4">
            <h2 class="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
              Posts by {{ author.name }}
            </h2>
            <label class="inline-flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
              <span>Sort</span>
              <select
                v-model="sortBy"
                class="h-9 rounded-full border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-700 focus:border-primary-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
              >
                <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </label>
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
            title="No posts yet"
            description="This author has not published anything in the mock data."
          />
          <template v-else>
            <div class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <PostCard v-for="post in items" :key="post.id" :post="post" show-excerpt />
            </div>
            <div class="mt-10">
              <PaginationBar :page="page" :total-pages="totalPages" @change="goTo" />
            </div>
          </template>
        </template>

        <EmptyState
          v-else
          class="mt-6"
          :title="activeTab === 'favorites' ? 'Favorites list' : 'Bookmarks'"
          :description="
            activeTab === 'favorites'
              ? 'Favorites for this author will appear here.'
              : 'Bookmarks saved by this author will appear here.'
          "
        />
      </div>
    </template>
  </div>
</template>
