<script setup lang="ts">
import type { AudioTrack } from '@/lib/audio-engine'
import LikeButton from '@/components/post/LikeButton.vue'
import SaveButton from '@/components/post/SaveButton.vue'

defineProps<{
  track: AudioTrack
  playing: boolean
}>()
</script>

<template>
  <div class="mr-2 flex grow items-center overflow-hidden lg:shrink-0 lg:basis-52 xl:basis-80">
    <RouterLink
      :to="`/post/${track.slug}`"
      class="relative flex h-14 items-center space-x-2 overflow-hidden ps-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 sm:h-16 sm:space-x-3"
    >
      <div
        class="absolute inset-s-0 z-0 h-10 w-10 shrink-0 overflow-hidden rounded-full shadow-sm sm:h-12 sm:w-12"
      >
        <div
          class="nc-animation-spin absolute inset-0 z-0 overflow-hidden rounded-full"
          :class="{ playing }"
        >
          <img
            :src="track.coverUrl"
            :alt="`${track.title} cover art`"
            class="h-full w-full rounded-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>
      <div class="grow overflow-hidden">
        <h3 class="text-sm font-medium sm:text-base">
          <span class="line-clamp-1">{{ track.title }}</span>
        </h3>
        <span class="block text-xs text-neutral-500 dark:text-neutral-400">
          {{ track.categoryName }}
        </span>
      </div>
    </RouterLink>
    <div class="hidden shrink-0 space-x-2.5 px-6 xl:flex">
      <LikeButton
        :post="{ id: track.postId, likeCount: track.likeCount }"
        variant="compact"
      />
      <SaveButton
        :post-id="track.postId"
        :post-title="track.title"
        variant="icon"
      />
    </div>
  </div>
</template>
