<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Search, Trash2 } from 'lucide-vue-next'
import { getDataSource } from '@/api'
import type { Comment } from '@/api/types'
import { useUiStore } from '@/stores/ui'
import { formatRelativeDate } from '@/lib/format'
import { useDocumentTitle } from '@/composables/useDocumentTitle'
import AdminNav from '@/components/admin/AdminNav.vue'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

const ui = useUiStore()
const pageTitle = ref('Comment Moderation — Admin')
useDocumentTitle(pageTitle)

const comments = ref<Comment[]>([])
const loading = ref(true)
const searchQuery = ref('')
const deletingId = ref<string | null>(null)

async function load(): Promise<void> {
  loading.value = true
  try {
    comments.value = await getDataSource().listAllComments()
  } catch (err) {
    ui.notify(err instanceof Error ? err.message : 'Failed to load comments.', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(load)

const filteredComments = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return comments.value
  return comments.value.filter(
    (c) =>
      c.content.toLowerCase().includes(q) ||
      c.author.name.toLowerCase().includes(q) ||
      c.author.username.toLowerCase().includes(q),
  )
})

async function removeComment(comment: Comment): Promise<void> {
  if (!confirm(`Are you sure you want to delete this comment by ${comment.author.name}?`)) {
    return
  }
  deletingId.value = comment.id
  try {
    await getDataSource().deleteComment(comment.id)
    comments.value = comments.value.filter((c) => c.id !== comment.id)
    ui.notify('Comment deleted.')
  } catch (err) {
    ui.notify(err instanceof Error ? err.message : 'Failed to delete comment.', 'error')
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <div class="page-shell pb-20">
    <div class="mx-auto max-w-5xl">
      <AdminNav />

      <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl dark:text-white">
            Comment Moderation
          </h1>
          <p class="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Review community remarks across all stories and remove abusive or spam comments.
          </p>
        </div>

        <div class="relative w-full sm:w-64">
          <label for="search-comments" class="sr-only">Search comments</label>
          <Search class="absolute start-3 top-3 h-4 w-4 text-neutral-400" aria-hidden="true" />
          <input
            id="search-comments"
            v-model="searchQuery"
            type="text"
            placeholder="Search comments…"
            class="h-10 w-full rounded-2xl border-neutral-300 bg-white ps-9 pe-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-400 focus:ring-primary-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900"
          />
        </div>
      </header>

      <div v-if="loading" class="flex justify-center py-20">
        <LoadingSpinner />
      </div>

      <EmptyState
        v-else-if="!filteredComments.length"
        class="mt-8"
        title="No comments found"
        description="No comments match your search criteria."
      />

      <div v-else class="mt-8 space-y-4">
        <div
          v-for="comment in filteredComments"
          :key="comment.id"
          class="flex flex-col gap-4 rounded-3xl border border-neutral-200 bg-white p-5 sm:flex-row sm:items-start sm:justify-between dark:border-neutral-800 dark:bg-neutral-900"
        >
          <div class="flex gap-4">
            <AppAvatar :src="comment.author.avatar" :name="comment.author.name" size="md" />
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-semibold text-neutral-900 dark:text-white">
                  {{ comment.author.name }}
                </span>
                <span class="text-xs text-neutral-400">
                  @{{ comment.author.username }}
                </span>
                <AppBadge
                  v-if="comment.author.role === 'admin'"
                  variant="primary"
                  class="!px-1.5 !py-0.5 !text-[10px]"
                >
                  Admin
                </AppBadge>
                <span class="text-xs text-neutral-400">·</span>
                <span class="text-xs text-neutral-400">
                  {{ formatRelativeDate(comment.createdAt) }}
                </span>
              </div>
              <p class="mt-2 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                {{ comment.content }}
              </p>
              <div class="mt-2 text-xs text-neutral-400">
                Post ID: <span class="font-mono">{{ comment.postId }}</span>
              </div>
            </div>
          </div>

          <div class="flex shrink-0 items-center gap-2 sm:self-center">
            <button
              type="button"
              class="inline-flex h-9 items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60"
              :disabled="deletingId === comment.id"
              @click="removeComment(comment)"
            >
              <Trash2 class="h-3.5 w-3.5" aria-hidden="true" />
              {{ deletingId === comment.id ? 'Deleting…' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
