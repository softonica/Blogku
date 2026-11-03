<script setup lang="ts">
import { computed } from 'vue'
import { Clock, Eye, MessageCircle, PenLine, Play, Share2 } from 'lucide-vue-next'
import type { Post } from '@/api/types'
import { formatDate, formatNumber } from '@/lib/format'
import { canManagePost } from '@/lib/permissions'
import { useAuthStore } from '@/stores/auth'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import CategoryBadgeList from '@/components/post/CategoryBadgeList.vue'
import LikeButton from '@/components/post/LikeButton.vue'
import SaveButton from '@/components/post/SaveButton.vue'
import PlayingEqualizer from '@/components/player/PlayingEqualizer.vue'

const props = defineProps<{
  post: Post
  playing: boolean
}>()

const emit = defineEmits<{
  toggle: []
  share: []
  comments: []
}>()

const auth = useAuthStore()
const canEdit = computed(() =>
  canManagePost(auth.user?.role, auth.user?.id, props.post.author.id),
)
</script>

<template>
  <section class="relative isolate">
    <div
      class="absolute -inset-x-4 top-0 -z-10 h-60 bg-primary-50 sm:-inset-x-6 lg:-inset-x-8 dark:bg-neutral-800"
      aria-hidden="true"
    />
    <div class="relative mx-auto max-w-[78rem] pt-8 lg:pt-16">
      <header
        class="flex flex-col items-center justify-center gap-8 rounded-2xl bg-white px-4 py-7 shadow-2xl sm:px-5 md:flex-row md:rounded-[40px] lg:gap-10 lg:p-11 dark:bg-neutral-900"
      >
        <div class="w-1/2 shrink-0 sm:w-1/3 md:w-1/4 lg:w-1/5">
          <div
            class="group relative aspect-square cursor-pointer overflow-hidden rounded-full shadow-2xl"
          >
            <img
              :src="post.cover"
              :alt="post.title"
              class="nc-animation-spin h-full w-full rounded-full object-cover"
              :class="{ playing }"
              loading="eager"
              decoding="async"
            />
            <div
              class="absolute inset-0 rounded-full bg-neutral-900/75 bg-blend-multiply"
              aria-hidden="true"
            />
            <button
              type="button"
              class="absolute inset-0 m-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-neutral-300 bg-black/50 text-white transition hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              :aria-label="playing ? 'Pause audio' : 'Play audio'"
              @click="emit('toggle')"
            >
              <PlayingEqualizer v-if="playing" class="h-7 w-7" />
              <Play v-else class="h-11 w-11 fill-current" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div class="flex min-w-0 flex-1 flex-col">
          <CategoryBadgeList :categories="post.categories" :limit="2" />
          <h1
            class="mt-4 max-w-4xl text-2xl font-semibold leading-[1.15] text-neutral-900 sm:text-3xl lg:text-4xl xl:text-[2.75rem] dark:text-neutral-100"
            :title="post.title"
          >
            {{ post.title }}
          </h1>
          <div class="mt-4 border-b border-neutral-200 dark:border-neutral-700" />

          <div class="mt-4 flex flex-wrap justify-between gap-5 sm:items-end">
            <div class="flex shrink-0 flex-wrap items-center gap-3 text-start leading-none">
              <RouterLink
                :to="`/author/${post.author.username}`"
                class="flex items-center gap-2"
              >
                <AppAvatar :src="post.author.avatar" :name="post.author.name" size="md" />
              </RouterLink>
              <div class="ms-1">
                <RouterLink
                  :to="`/author/${post.author.username}`"
                  class="block text-sm font-semibold text-neutral-900 hover:text-primary-600 dark:text-neutral-100 dark:hover:text-primary-300"
                >
                  {{ post.author.name }}
                </RouterLink>
                <div class="mt-1 flex flex-wrap items-center text-xs text-neutral-700 dark:text-neutral-300">
                  <span>{{ formatDate(post.createdAt) }}</span>
                  <span class="mx-2 font-semibold" aria-hidden="true">·</span>
                  <span class="inline-flex items-center gap-1">
                    <Clock class="h-3.5 w-3.5" aria-hidden="true" />
                    {{ post.readingTime }} min read
                  </span>
                </div>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2 sm:justify-end">
              <div class="flex items-center gap-2">
                <LikeButton :post="post" variant="compact" />
                <button
                  type="button"
                  class="inline-flex h-9 items-center gap-1.5 px-1.5 text-xs font-semibold text-neutral-700 transition-colors hover:text-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-neutral-200 dark:hover:text-teal-400"
                  :aria-label="`Comments (${post.commentCount})`"
                  @click="emit('comments')"
                >
                  <MessageCircle class="h-[18px] w-[18px]" aria-hidden="true" />
                  <span>{{ formatNumber(post.commentCount) }}</span>
                </button>
                <span
                  class="inline-flex h-9 items-center gap-1.5 px-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300"
                  title="Views"
                >
                  <Eye class="h-[18px] w-[18px]" aria-hidden="true" />
                  <span>{{ formatNumber(post.viewCount) }}</span>
                </span>
              </div>

              <div class="mx-1 h-5 border-s border-neutral-200 dark:border-neutral-700" />

              <SaveButton
                :post-id="post.id"
                :post-title="post.title"
                variant="icon"
              />
              <button
                type="button"
                class="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-50 text-neutral-700 transition hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                aria-label="Share post"
                title="Share"
                @click="emit('share')"
              >
                <Share2 class="h-[18px] w-[18px]" aria-hidden="true" />
              </button>
              <RouterLink
                v-if="canEdit"
                :to="`/editor/${post.id}`"
                class="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-50 text-neutral-700 transition hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                aria-label="Edit post"
                title="Edit post"
              >
                <PenLine class="h-[18px] w-[18px]" aria-hidden="true" />
              </RouterLink>
            </div>
          </div>
        </div>
      </header>
    </div>
  </section>
</template>
