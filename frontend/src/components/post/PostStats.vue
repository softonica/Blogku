<script setup lang="ts">
import { computed } from 'vue'
import { Clock, Eye, Heart, MessageCircle } from 'lucide-vue-next'
import type { Post } from '@/api/types'
import { useReactionStore } from '@/stores/reaction'
import { formatNumber } from '@/lib/format'

const props = withDefaults(
  defineProps<{
    post: Post
    showViews?: boolean
    showReadingTime?: boolean
  }>(),
  { showViews: true, showReadingTime: false },
)

const reactions = useReactionStore()
const likes = computed(() => reactions.likeCount(props.post))
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-neutral-500 dark:text-neutral-400"
  >
    <span class="inline-flex items-center gap-1.5">
      <Heart class="h-4 w-4" aria-hidden="true" />
      {{ formatNumber(likes) }}
      <span class="sr-only">likes</span>
    </span>
    <span class="inline-flex items-center gap-1.5">
      <MessageCircle class="h-4 w-4" aria-hidden="true" />
      {{ formatNumber(post.commentCount) }}
      <span class="sr-only">comments</span>
    </span>
    <span v-if="showViews" class="inline-flex items-center gap-1.5">
      <Eye class="h-4 w-4" aria-hidden="true" />
      {{ formatNumber(post.viewCount) }}
      <span class="sr-only">views</span>
    </span>
    <span v-if="showReadingTime" class="inline-flex items-center gap-1.5">
      <Clock class="h-4 w-4" aria-hidden="true" />
      {{ post.readingTime }} min read
    </span>
  </div>
</template>
