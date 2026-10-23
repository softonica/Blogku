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
import PostCard from '@/components/post/PostCard.vue'
import PaginationBar from '@/components/ui/PaginationBar.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const ui = useUiStore()
const username = computed(() => String(route.params.username ?? ''))
const author = ref<User | null>(null)
const ready = ref(false)
const followed = ref(false)
const title = ref('Author')
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

async function follow(): Promise<void> {
  if (!auth.isAuthenticated) {
    await router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  followed.value = !followed.value
  ui.notify(
    followed.value
      ? 'Following is stored locally in phase 1.'
      : 'Unfollowed.',
    'info',
  )
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
        class="relative overflow-hidden rounded-[2rem] border border-neutral-200 bg-neutral-50 px-6 py-10 sm:px-10 dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div class="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <AppAvatar :src="author.avatar" :name="author.name" size="xl" />
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-3">
              <h1 class="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl dark:text-white">
                {{ author.name }}
              </h1>
              <AppBadge variant="neutral">@{{ author.username }}</AppBadge>
              <AppBadge v-if="author.role === 'admin'" variant="primary">Editor</AppBadge>
            </div>
            <p class="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
              {{ author.bio }}
            </p>
            <div class="mt-4 flex flex-wrap items-center gap-5 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
              <span>{{ totalItems }} stories</span>
              <span>{{ author.postCount ?? totalItems }} published</span>
              <span>Phase 1 mock profile</span>
            </div>
          </div>
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
      </section>

      <div class="mt-10">
        <h2 class="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Stories by {{ author.name }}
        </h2>

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
          title="No stories yet"
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
      </div>
    </template>
  </div>
</template>
