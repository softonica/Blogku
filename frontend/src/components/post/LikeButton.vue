<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Heart } from 'lucide-vue-next'
import type { Post } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { useReactionStore } from '@/stores/reaction'
import { useUiStore } from '@/stores/ui'
import { formatNumber, getErrorMessage } from '@/lib/format'

const props = withDefaults(
  defineProps<{
    post: Pick<Post, 'id' | 'likeCount'>
    showCount?: boolean
    variant?: 'pill' | 'icon' | 'compact'
  }>(),
  { showCount: true, variant: 'pill' },
)

const auth = useAuthStore()
const reactions = useReactionStore()
const router = useRouter()
const route = useRoute()
const ui = useUiStore()
const busy = ref(false)

const liked = computed(() => reactions.isLiked(props.post.id))
const count = computed(() => reactions.likeCount(props.post))
const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900'
const variantClass = computed(() =>
  props.variant === 'icon'
    ? 'h-10 w-10 border border-neutral-200 dark:border-neutral-800'
    : props.variant === 'compact'
      ? 'h-9 gap-1.5 px-1.5 text-xs'
      : 'h-10 px-3 sm:px-4 text-sm',
)

const stateClass = computed(() => {
  if (props.variant === 'compact') {
    return liked.value
      ? 'text-rose-600 dark:text-rose-300'
      : 'text-neutral-700 hover:text-rose-600 dark:text-neutral-200 dark:hover:text-rose-400'
  }
  return liked.value
    ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300'
    : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800'
})

async function toggle(): Promise<void> {
  if (busy.value) return
  if (!auth.isAuthenticated) {
    ui.notify('Sign in to like this post.', 'info')
    await router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  busy.value = true
  try {
    const next = await reactions.toggleLike(props.post.id)
    ui.notify(next ? 'Added to your likes.' : 'Removed from your likes.')
  } catch (error) {
    ui.notify(getErrorMessage(error), 'error')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <button
    type="button"
    :class="[base, variantClass, stateClass]"
    :aria-pressed="liked"
    :aria-label="
      showCount
        ? `${formatNumber(count)} ${liked ? 'likes, click to unlike' : 'likes, click to like'}`
        : liked
          ? 'Unlike this post'
          : 'Like this post'
    "
    :disabled="busy"
    @click.stop.prevent="toggle"
  >
    <span
      v-if="variant === 'compact'"
      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors"
      :class="
        liked
          ? 'bg-rose-50 dark:bg-rose-950/60'
          : 'bg-neutral-50 hover:bg-rose-50 dark:bg-neutral-800 dark:hover:bg-rose-100/10'
      "
    >
      <Heart
        class="h-[18px] w-[18px]"
        :class="liked ? 'fill-current' : ''"
        aria-hidden="true"
      />
    </span>
    <Heart
      v-else
      class="h-4 w-4"
      :class="liked ? 'fill-current' : ''"
      aria-hidden="true"
    />
    <span v-if="showCount">{{ formatNumber(count) }}</span>
  </button>
</template>
