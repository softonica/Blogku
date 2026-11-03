<script setup lang="ts">
import { computed } from 'vue'
import { Eye, MessageCircle, Share2 } from 'lucide-vue-next'
import type { Post } from '@/api/types'
import { formatDate, formatNumber } from '@/lib/format'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import LikeButton from './LikeButton.vue'
import SaveButton from './SaveButton.vue'

const props = withDefaults(
  defineProps<{
    post: Post
    tone?: 'default' | 'on-image'
    align?: 'start' | 'center'
  }>(),
  { tone: 'default', align: 'start' },
)

const emit = defineEmits<{
  comments: []
  share: []
}>()

const roundButtonClass = computed(() =>
  props.tone === 'on-image'
    ? 'bg-white/10 text-white hover:bg-white/20 dark:bg-white/10 focus-visible:ring-white/70'
    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 focus-visible:ring-primary-500',
)
</script>

<template>
  <div
    class="flex flex-col gap-4"
    :class="[
      align === 'center' ? 'items-center' : 'items-start',
      tone === 'on-image' ? 'text-white dark:text-white' : '',
    ]"
  >
    <div class="flex flex-wrap items-center gap-2.5">
      <RouterLink
        :to="`/author/${post.author.username}`"
        class="flex min-w-0 items-center gap-2.5"
      >
        <AppAvatar :src="post.author.avatar" :name="post.author.name" size="md" />
        <span
          class="min-w-0 truncate text-lg font-bold transition-colors"
          :class="
            tone === 'on-image'
              ? 'text-white hover:text-white/80 dark:text-white dark:hover:text-white/80'
              : 'text-neutral-900 hover:text-primary-600 dark:text-neutral-100 dark:hover:text-primary-300'
          "
        >
          {{ post.author.name }}
        </span>
      </RouterLink>
      <div
        class="flex min-w-0 items-center text-sm leading-tight"
        :class="
          tone === 'on-image'
            ? 'text-white/80'
            : 'text-neutral-500 dark:text-neutral-400'
        "
      >
        <time :datetime="post.createdAt">{{ formatDate(post.createdAt) }}</time>
        <span class="mx-1.5" aria-hidden="true">·</span>
        <span>{{ post.readingTime }} min read</span>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
      <LikeButton :post="post" variant="compact" size="md" :tone="tone" />

      <button
        type="button"
        class="inline-flex h-11 w-11 items-center justify-center gap-1 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
        :class="roundButtonClass"
        :aria-label="`Comments (${formatNumber(post.commentCount)})`"
        @click="emit('comments')"
      >
        <MessageCircle class="h-5 w-5" aria-hidden="true" />
        <span class="text-sm font-semibold">{{ formatNumber(post.commentCount) }}</span>
      </button>

      <span
        class="inline-flex h-11 w-11 items-center justify-center gap-1.5 rounded-full text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
        :class="roundButtonClass"
        title="Views"
        :aria-label="`Views: ${formatNumber(post.viewCount)}`"
      >
        <Eye class="h-5 w-5" aria-hidden="true" />
        <span>{{ formatNumber(post.viewCount) }}</span>
      </span>

      <div
        class="mx-1 h-5 border-s"
        :class="
          tone === 'on-image'
            ? 'border-white/25'
            : 'border-neutral-200 dark:border-neutral-700'
        "
        aria-hidden="true"
      />

      <SaveButton
        :post-id="post.id"
        :post-title="post.title"
        variant="icon"
        size="md"
        :tone="tone"
      />

      <button
        type="button"
        class="inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
        :class="roundButtonClass"
        aria-label="Share post"
        title="Share"
        @click="emit('share')"
      >
        <Share2 class="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>
