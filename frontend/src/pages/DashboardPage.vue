<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  Bookmark,
  FileText,
  Heart,
  PenLine,
  Trash2,
} from 'lucide-vue-next'
import type { Post } from '@/api/types'
import { getDataSource } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { useBookmarkStore } from '@/stores/bookmark'
import { useDraftStore } from '@/stores/draft'
import { useUiStore } from '@/stores/ui'
import { formatDate, formatNumber } from '@/lib/format'
import { canManagePost } from '@/lib/permissions'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import PostCard from '@/components/post/PostCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'

const auth = useAuthStore()
const bookmarks = useBookmarkStore()
const drafts = useDraftStore()
const ui = useUiStore()

const posts = ref<Post[]>([])
const loading = ref(true)

const totalLikes = computed(() =>
  posts.value.reduce((total, post) => total + post.likeCount, 0),
)

const stats = computed(() => [
  {
    label: 'Published stories',
    value: formatNumber(posts.value.length),
    icon: FileText,
  },
  {
    label: 'Local drafts',
    value: formatNumber(drafts.count),
    icon: PenLine,
  },
  {
    label: 'Bookmarks',
    value: formatNumber(bookmarks.count),
    icon: Bookmark,
  },
  {
    label: 'Likes received',
    value: formatNumber(totalLikes.value),
    icon: Heart,
  },
])

onMounted(async () => {
  const username = auth.user?.username
  if (!username) return
  try {
    const page = await getDataSource().listPosts({
      page: 1,
      perPage: 100,
      sort: '-createdAt',
      filter: { authorUsername: username },
    })
    posts.value = page.items
  } finally {
    loading.value = false
  }
})

function removeDraft(id: string): void {
  drafts.remove(id)
  ui.notify('Draft deleted.')
}

async function deletePost(id: string): Promise<void> {
  if (!confirm('Are you sure you want to delete this story?')) return
  try {
    await getDataSource().deletePost(id)
    posts.value = posts.value.filter((p) => p.id !== id)
    ui.notify('Story deleted.')
  } catch (err) {
    ui.notify(err instanceof Error ? err.message : 'Failed to delete story.', 'error')
  }
}
</script>

<template>
  <div class="page-shell pb-20">
    <header class="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-4">
        <AppAvatar
          :src="auth.user?.avatar"
          :name="auth.user?.name ?? 'User'"
          size="lg"
        />
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.18em] text-primary-600 dark:text-primary-300">
            Dashboard
          </p>
          <h1 class="mt-1 text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl dark:text-white">
            {{ auth.user?.name }}
          </h1>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            @{{ auth.user?.username }} · {{ auth.user?.role }}
          </p>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <BaseButton to="/editor" size="sm">
          <PenLine class="h-4 w-4" aria-hidden="true" />
          New draft
        </BaseButton>
        <BaseButton to="/bookmarks" variant="outline" size="sm">
          <Bookmark class="h-4 w-4" aria-hidden="true" />
          Bookmarks
        </BaseButton>
      </div>
    </header>

    <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="rounded-3xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div class="flex items-center justify-between">
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
            {{ stat.label }}
          </p>
          <component :is="stat.icon" class="h-4 w-4 text-primary-500" aria-hidden="true" />
        </div>
        <p class="mt-3 text-2xl font-bold text-neutral-900 dark:text-white">
          {{ stat.value }}
        </p>
      </div>
    </div>

    <div class="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section>
        <div class="flex items-end justify-between">
          <h2 class="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Your stories
          </h2>
          <RouterLink
            to="/search"
            class="text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-300"
          >
            Explore
          </RouterLink>
        </div>

        <div v-if="loading" class="flex justify-center py-14">
          <LoadingSpinner />
        </div>
        <EmptyState
          v-else-if="!posts.length"
          class="mt-5"
          title="No published stories"
          description="This account has no posts in the mock data. Try the demo account or save a local draft."
        >
          <BaseButton to="/editor" size="sm">Write a draft</BaseButton>
        </EmptyState>
        <div v-else class="mt-5 grid gap-6 sm:grid-cols-2">
          <div v-for="post in posts" :key="post.id" class="flex flex-col">
            <div class="flex-1">
              <PostCard :post="post" />
            </div>
            <div
              v-if="canManagePost(auth.user?.role, auth.user?.id, post.author.id)"
              class="mt-2 flex items-center justify-end gap-2 px-1"
            >
              <RouterLink
                :to="`/editor/${post.id}`"
                class="inline-flex h-8 items-center gap-1 rounded-full border border-neutral-200 px-3 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                <PenLine class="h-3.5 w-3.5" aria-hidden="true" />
                Edit
              </RouterLink>
              <button
                type="button"
                class="inline-flex h-8 items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60"
                @click="deletePost(post.id)"
              >
                <Trash2 class="h-3.5 w-3.5" aria-hidden="true" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </section>

      <aside class="space-y-6">
        <div class="rounded-3xl border border-neutral-200 p-6 dark:border-neutral-800">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-bold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
              Local drafts
            </h2>
            <span class="text-xs font-semibold text-neutral-400">{{ drafts.count }}</span>
          </div>
          <p
            v-if="!drafts.count"
            class="mt-4 text-sm text-neutral-500 dark:text-neutral-400"
          >
            Nothing saved locally yet. Drafts never leave this browser.
          </p>
          <ul v-else class="mt-4 space-y-3">
            <li
              v-for="draft in drafts.drafts"
              :key="draft.id"
              class="rounded-2xl border border-neutral-100 p-3 dark:border-neutral-800"
            >
              <RouterLink
                :to="{ name: 'editor', query: { draft: draft.id } }"
                class="line-clamp-2 text-sm font-semibold text-neutral-900 hover:text-primary-600 dark:text-neutral-100 dark:hover:text-primary-300"
              >
                {{ draft.title }}
              </RouterLink>
              <div class="mt-2 flex items-center justify-between gap-2">
                <span class="text-xs text-neutral-400">
                  {{ formatDate(draft.updatedAt, 'MMM d, HH:mm') }}
                </span>
                <button
                  type="button"
                  class="inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
                  aria-label="Delete draft"
                  @click="removeDraft(draft.id)"
                >
                  <Trash2 class="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          </ul>
        </div>

        <div class="rounded-3xl bg-neutral-900 p-6 text-white">
          <h2 class="text-sm font-bold uppercase tracking-[0.18em] text-neutral-400">
            Phase 2 preview
          </h2>
          <p class="mt-3 text-sm leading-relaxed text-neutral-300">
            Publishing, uploads and realtime comments arrive when
            <code class="font-mono text-primary-300">PocketBaseSource</code>
            replaces the mock adapter. The UI will not need to change.
          </p>
        </div>
      </aside>
    </div>
  </div>
</template>
