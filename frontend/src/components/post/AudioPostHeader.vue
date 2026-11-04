<script setup lang="ts">
import { Play } from 'lucide-vue-next'
import type { Post } from '@/api/types'
import CategoryBadgeList from '@/components/post/CategoryBadgeList.vue'
import PostHeaderInfo from '@/components/post/PostHeaderInfo.vue'
import PlayingEqualizer from '@/components/player/PlayingEqualizer.vue'

defineProps<{
  post: Post
  playing: boolean
}>()

const emit = defineEmits<{
  toggle: []
  share: []
  comments: []
}>()
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
              class="absolute inset-0 m-auto flex h-14 w-14 sm:h-20 sm:w-20 items-center justify-center rounded-full border-2 border-neutral-300 bg-black/50 text-white transition hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              :aria-label="playing ? 'Pause audio' : 'Play audio'"
              @click="emit('toggle')"
            >
              <PlayingEqualizer v-if="playing" class="h-5 w-5 sm:h-7 sm:w-7" />
              <Play v-else class="h-7 w-7 sm:h-11 sm:w-11 fill-current" aria-hidden="true" />
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

          <div class="mt-4">
            <PostHeaderInfo
              :post="post"
              @comments="emit('comments')"
              @share="emit('share')"
            />
          </div>
        </div>
      </header>
    </div>
  </section>
</template>
