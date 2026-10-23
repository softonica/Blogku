<script setup lang="ts">
import { computed, ref } from 'vue'
import { Play } from 'lucide-vue-next'
import type { Post } from '@/api/types'
import { formatDate } from '@/lib/format'
import PostImage from '@/components/ui/PostImage.vue'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import CategoryBadgeList from '@/components/post/CategoryBadgeList.vue'
import LikeButton from '@/components/post/LikeButton.vue'
import SaveButton from '@/components/post/SaveButton.vue'

const props = defineProps<{ posts: Post[] }>()

const activeIndex = ref(0)
const isPlaying = ref(false)
const activePost = computed(() => props.posts[activeIndex.value] || props.posts[0])

function selectVideo(index: number): void {
  activeIndex.value = index
  isPlaying.value = true
}
</script>

<template>
  <div v-if="posts.length" class="nc-SectionSliderPosts relative space-y-6">
    <div class="flex items-end justify-between">
      <div>
        <h2 class="text-2xl font-bold tracking-tight sm:text-3xl text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <span>Trending Videos 🎬</span>
        </h2>
        <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Watch latest documentaries, interviews, and short films
        </p>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <!-- Main Active Video Player -->
      <div class="lg:col-span-2 flex flex-col">
        <div class="relative aspect-video w-full overflow-hidden rounded-[32px] bg-neutral-950 shadow-lg">
          <iframe
            v-if="isPlaying && activePost.videoUrl && (activePost.videoUrl.includes('youtube.com') || activePost.videoUrl.includes('youtu.be'))"
            :src="activePost.videoUrl.replace('watch?v=', 'embed/') + '?autoplay=1'"
            class="h-full w-full"
            title="Video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          ></iframe>
          <div v-else class="relative h-full w-full">
            <PostImage
              :src="activePost.cover"
              :alt="activePost.title"
              aspect="h-full w-full object-cover"
              width="800"
              height="450"
            />
            <div class="absolute inset-0 bg-black/40 flex items-center justify-center">
              <button
                type="button"
                class="flex h-16 w-16 items-center justify-center rounded-full bg-primary-600 text-white shadow-2xl transition hover:scale-110 hover:bg-primary-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
                aria-label="Play video"
                @click="isPlaying = true"
              >
                <Play class="ms-1 h-7 w-7 fill-current" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        <div class="mt-4 flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <CategoryBadgeList :categories="activePost.categories" :limit="2" />
            <div class="flex items-center gap-2">
              <LikeButton :post="activePost" />
              <SaveButton :post-id="activePost.id" :post-title="activePost.title" />
            </div>
          </div>
          <h3 class="text-lg sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            <RouterLink :to="`/post/${activePost.slug}`" class="hover:text-primary-600 dark:hover:text-primary-400">
              {{ activePost.title }}
            </RouterLink>
          </h3>
          <p class="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2">
            {{ activePost.excerpt }}
          </p>
          <div class="flex items-center gap-3 pt-1">
            <AppAvatar :src="activePost.author.avatar" :name="activePost.author.name" size="xs" />
            <span class="text-xs text-neutral-500 dark:text-neutral-400">
              {{ activePost.author.name }} · {{ formatDate(activePost.createdAt) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Playlist Queue on Right -->
      <div class="flex flex-col gap-3">
        <h4 class="text-xs font-bold uppercase tracking-wider text-neutral-400">
          Playlist ({{ posts.length }} videos)
        </h4>
        <div class="flex flex-col gap-3 overflow-y-auto max-h-[500px] pe-1">
          <button
            v-for="(post, index) in posts"
            :key="post.id"
            type="button"
            :class="[
              'group flex items-center gap-3 rounded-2xl p-2.5 text-left transition duration-200',
              activeIndex === index
                ? 'bg-primary-50 ring-2 ring-primary-500 dark:bg-primary-950/40 dark:ring-primary-400'
                : 'hover:bg-neutral-100 dark:hover:bg-neutral-800/60',
            ]"
            @click="selectVideo(index)"
          >
            <div class="relative aspect-video w-24 shrink-0 overflow-hidden rounded-xl bg-neutral-900">
              <PostImage :src="post.cover" :alt="post.title" aspect="h-full w-full object-cover" />
              <div class="absolute inset-0 bg-black/20 flex items-center justify-center">
                <span class="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow-xs">
                  <Play class="ms-0.5 h-3 w-3 fill-current" aria-hidden="true" />
                </span>
              </div>
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-xs font-semibold text-neutral-800 group-hover:text-primary-600 dark:text-neutral-200 dark:group-hover:text-primary-400">
                {{ post.title }}
              </p>
              <span class="mt-1 block text-[11px] text-neutral-400">
                {{ post.author.name }} · {{ post.readingTime }}m
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
