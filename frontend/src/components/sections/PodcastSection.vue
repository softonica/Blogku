<script setup lang="ts">
import { Play, Pause } from 'lucide-vue-next'
import type { Post } from '@/api/types'
import { formatDate } from '@/lib/format'
import { usePlayerStore } from '@/stores/player'
import PostImage from '@/components/ui/PostImage.vue'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import CategoryBadgeList from '@/components/post/CategoryBadgeList.vue'
import LikeButton from '@/components/post/LikeButton.vue'
import SaveButton from '@/components/post/SaveButton.vue'

defineProps<{ posts: Post[] }>()

const player = usePlayerStore()

function isPlayingThis(post: Post): boolean {
  return player.isCurrentPost(post.id) && player.playing
}

function handlePlayClick(post: Post): void {
  if (!post.audioUrl) return
  if (isPlayingThis(post)) {
    player.toggle()
  } else {
    player.play(post)
  }
}
</script>

<template>
  <div v-if="posts.length" class="nc-SectionMagazine8 relative space-y-4 sm:space-y-6">
    <div class="flex items-end justify-between">
      <div>
        <h2 class="text-2xl font-bold tracking-tight sm:text-3xl text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <span>Listen to the podcast live 🎶</span>
        </h2>
        <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Audio posts, conversations, and deep dives from our editors
        </p>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-6">
      <!-- 2 Large Podcast Cards (nc-Card16Podcast) -->
      <article
        v-for="post in posts.slice(0, 2)"
        :key="post.id"
        class="nc-Card16Podcast relative flex flex-col sm:col-span-3 lg:col-span-2 group"
      >
        <div class="relative block w-full shrink-0 overflow-hidden rounded-xl sm:rounded-3xl aspect-[4/3] bg-neutral-900 shadow-md">
          <RouterLink
            :to="`/post/${post.slug}`"
            class="absolute inset-0 z-0"
            tabindex="-1"
            aria-hidden="true"
          >
            <PostImage
              :src="post.cover"
              :alt="post.title"
              aspect="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              width="500"
              height="375"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
          </RouterLink>

          <!-- Center Play Button -->
          <div class="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <button
              type="button"
              class="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-xl backdrop-blur-sm transition duration-300 group-hover:scale-110 group-hover:bg-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              :class="{ 'opacity-50 cursor-not-allowed': !post.audioUrl }"
              :disabled="!post.audioUrl"
              :aria-label="isPlayingThis(post) ? 'Pause podcast: ' + post.title : 'Play podcast: ' + post.title"
              @click="handlePlayClick(post)"
            >
              <Pause v-if="isPlayingThis(post)" class="h-6 w-6 fill-current" aria-hidden="true" />
              <Play v-else class="ms-1 h-6 w-6 fill-current" aria-hidden="true" />
            </button>
          </div>

          <div class="absolute inset-x-4 top-4 z-10 flex items-center justify-between gap-2">
            <CategoryBadgeList :categories="post.categories" overlay />
            <SaveButton :post-id="post.id" :post-title="post.title" />
          </div>
        </div>

        <div class="mt-3 sm:mt-4 flex flex-col gap-2">
          <h3 class="nc-card-title text-base sm:text-lg font-semibold leading-snug">
            <RouterLink
              :to="`/post/${post.slug}`"
              class="line-clamp-2 text-neutral-900 hover:text-primary-600 dark:text-neutral-100 dark:hover:text-primary-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-sm"
            >
              {{ post.title }}
            </RouterLink>
          </h3>
          <div class="flex items-center justify-between pt-1">
            <div class="flex items-center gap-2">
              <AppAvatar :src="post.author.avatar" :name="post.author.name" size="xs" />
              <span class="text-xs text-neutral-500 dark:text-neutral-400">
                {{ post.author.name }} · {{ formatDate(post.createdAt) }}
              </span>
            </div>
            <LikeButton :post="post" />
          </div>
        </div>
      </article>

      <!-- 4 Compact Pill Podcast Cards (nc-Card17Podcast) -->
      <div class="sm:col-span-6 lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-col gap-3">
        <article
          v-for="post in posts.slice(2, 6)"
          :key="post.id"
          class="nc-Card17Podcast relative flex items-center justify-between gap-3 rounded-full bg-neutral-100/80 p-2.5 transition duration-200 hover:shadow-md dark:bg-neutral-800/40 dark:hover:bg-neutral-800/70"
        >
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <button
              type="button"
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-primary-600 shadow-xs transition hover:scale-105 hover:bg-primary-50 dark:bg-neutral-700 dark:text-primary-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              :class="{ 'opacity-50 cursor-not-allowed': !post.audioUrl }"
              :disabled="!post.audioUrl"
              :aria-label="isPlayingThis(post) ? 'Pause podcast: ' + post.title : 'Play podcast: ' + post.title"
              @click="handlePlayClick(post)"
            >
              <Pause v-if="isPlayingThis(post)" class="h-4 w-4 fill-current" aria-hidden="true" />
              <Play v-else class="ms-0.5 h-4 w-4 fill-current" aria-hidden="true" />
            </button>
            <div class="min-w-0 flex-1">
              <h4 class="truncate text-xs sm:text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                <RouterLink
                  :to="`/post/${post.slug}`"
                  class="hover:text-primary-600 dark:hover:text-primary-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-sm"
                >
                  {{ post.title }}
                </RouterLink>
              </h4>
              <p class="truncate text-[11px] text-neutral-400">
                {{ post.author.name }} · {{ post.readingTime }}m audio
              </p>
            </div>
          </div>
          <div class="flex items-center gap-1 pe-2 shrink-0">
            <SaveButton :post-id="post.id" :post-title="post.title" />
          </div>
        </article>
      </div>
    </div>
  </div>
</template>
