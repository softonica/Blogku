<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MessageCircle } from 'lucide-vue-next'
import type { Comment } from '@/api/types'
import { getDataSource } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { commentSchema, firstError } from '@/lib/validation'
import { getErrorMessage } from '@/lib/format'
import BaseButton from '@/components/ui/BaseButton.vue'
import AppAvatar from '@/components/ui/AppAvatar.vue'

const props = defineProps<{ postId: string }>()
const emit = defineEmits<{ created: [comment: Comment] }>()

const auth = useAuthStore()
const ui = useUiStore()
const router = useRouter()
const route = useRoute()

const content = ref('')
const website = ref('')
const error = ref('')
const working = ref(false)
const remaining = computed(() => 5000 - content.value.length)

async function submit(): Promise<void> {
  error.value = ''
  if (!auth.isAuthenticated) {
    await router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  if (website.value) return
  const parsed = commentSchema.safeParse({
    content: content.value,
    website: website.value,
  })
  if (!parsed.success) {
    error.value = firstError(parsed.error)
    return
  }
  working.value = true
  try {
    const comment = await getDataSource().createComment({
      postId: props.postId,
      content: parsed.data.content,
    })
    emit('created', comment)
    content.value = ''
    ui.notify('Comment posted.')
  } catch (err) {
    error.value = getErrorMessage(err)
  } finally {
    working.value = false
  }
}
</script>

<template>
  <section class="rounded-3xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
    <h3 class="text-lg font-bold text-neutral-900 dark:text-white">
      Leave a comment
    </h3>

    <div
      v-if="!auth.isAuthenticated"
      class="mt-4 flex flex-col items-start gap-4 rounded-2xl bg-neutral-50 p-5 sm:flex-row sm:items-center sm:justify-between dark:bg-neutral-800/60"
    >
      <p class="text-sm text-neutral-600 dark:text-neutral-300">
        Sign in to join the conversation. Comments stay on this device in phase 1.
      </p>
      <BaseButton :to="{ name: 'login', query: { redirect: route.fullPath } }" size="sm">
        Sign in
      </BaseButton>
    </div>

    <form v-else class="mt-4" novalidate @submit.prevent="submit">
      <div class="flex gap-3">
        <AppAvatar
          :src="auth.user?.avatar"
          :name="auth.user?.name ?? 'User'"
          size="sm"
        />
        <div class="min-w-0 flex-1">
          <label for="comment-content" class="sr-only">Your comment</label>
          <textarea
            id="comment-content"
            v-model="content"
            rows="4"
            :maxlength="5000"
            placeholder="Add a thoughtful note…"
            class="w-full rounded-2xl border-neutral-300 bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-400 focus:ring-primary-200 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900"
          ></textarea>
          <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p class="text-xs text-neutral-400">
              {{ remaining }} characters left
            </p>
            <button
              type="submit"
              class="inline-flex h-10 items-center gap-2 rounded-full bg-primary-600 px-5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60 dark:bg-primary-500 dark:text-neutral-950 dark:hover:bg-primary-400"
              :disabled="working"
            >
              <MessageCircle class="h-4 w-4" aria-hidden="true" />
              {{ working ? 'Posting…' : 'Post comment' }}
            </button>
          </div>
        </div>
      </div>

      <div class="hidden" aria-hidden="true">
        <label for="comment-website">Website</label>
        <input
          id="comment-website"
          v-model="website"
          type="text"
          tabindex="-1"
          autocomplete="off"
        />
      </div>

      <p v-if="error" class="mt-3 text-sm font-medium text-rose-500">
        {{ error }}
      </p>
    </form>
  </section>
</template>
