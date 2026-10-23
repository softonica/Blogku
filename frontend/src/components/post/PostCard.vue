<script setup lang="ts">
import { computed } from 'vue'
import { Clock, Headphones, Layers, Play } from 'lucide-vue-next'
import type { Post } from '@/api/types'
import { formatDate } from '@/lib/format'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import PostImage from '@/components/ui/PostImage.vue'
import CategoryBadgeList from './CategoryBadgeList.vue'
import PostMeta from './PostMeta.vue'
import PostStats from './PostStats.vue'
import SaveButton from './SaveButton.vue'
import LikeButton from './LikeButton.vue'

const props = withDefaults(
  defineProps<{
    post: Post
    layout?: 'vertical' | 'horizontal' | 'overlay' | 'card5'
    showExcerpt?: boolean
    showStats?: boolean
    aspect?: string
    sizes?: string
    priority?: boolean
  }>(),
  {
    layout: 'vertical',
    showExcerpt: false,
    showStats: true,
    aspect: 'aspect-[4/3]',
    sizes: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
    priority: false,
  },
)

const postLink = computed(() => `/post/${props.post.slug}`)
</script>

<template>
  <article
    v-if="layout === 'vertical'"
    class="group flex h-full flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-card dark:border-neutral-800 dark:bg-neutral-900"
  >
    <div class="relative">
      <RouterLink :to="postLink" class="block" tabindex="-1">
        <PostImage
          :src="post.cover"
          :alt="post.title"
          :aspect="aspect"
          :sizes="sizes"
          :priority="priority"
        />
      </RouterLink>
      <div
        v-if="post.postType && post.postType !== 'standard'"
        class="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <span
          class="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow-md backdrop-blur-sm transition duration-300 group-hover:scale-110 dark:bg-neutral-900/90 dark:text-white"
        >
          <Play v-if="post.postType === 'video'" class="ms-0.5 h-5 w-5 fill-current" aria-hidden="true" />
          <Headphones v-else-if="post.postType === 'audio'" class="h-5 w-5" aria-hidden="true" />
          <Layers v-else-if="post.postType === 'gallery'" class="h-5 w-5" aria-hidden="true" />
          <span class="sr-only">{{ post.postType }}</span>
        </span>
      </div>
      <div class="absolute inset-x-3 top-3 z-10 flex items-center justify-between gap-2">
        <CategoryBadgeList :categories="post.categories" overlay />
        <SaveButton :post-id="post.id" :post-title="post.title" />
      </div>
    </div>
    <div class="flex flex-1 flex-col gap-3 p-5">
      <PostMeta :author="post.author" :date="post.createdAt" />
      <h3
        class="text-base font-semibold leading-snug text-neutral-900 dark:text-neutral-100"
      >
        <RouterLink
          :to="postLink"
          class="line-clamp-2 transition hover:text-primary-600 dark:hover:text-primary-300"
        >
          {{ post.title }}
        </RouterLink>
      </h3>
      <p
        v-if="showExcerpt"
        class="line-clamp-2 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400"
      >
        {{ post.excerpt }}
      </p>
      <div class="mt-auto flex items-center justify-between gap-3 pt-2">
        <PostStats v-if="showStats" :post="post" :show-views="false" />
        <span
          class="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 dark:text-neutral-400"
        >
          <Clock class="h-3.5 w-3.5" aria-hidden="true" />
          {{ post.readingTime }} min
        </span>
      </div>
    </div>
  </article>

  <article
    v-else-if="layout === 'horizontal'"
    class="group flex gap-4"
    :class="showStats ? 'items-start' : ''"
  >
    <RouterLink
      :to="postLink"
      class="relative w-28 shrink-0 overflow-hidden rounded-2xl sm:w-36"
      tabindex="-1"
    >
      <PostImage
        :src="post.cover"
        :alt="post.title"
        aspect="aspect-square"
        sizes="160px"
      />
      <div
        v-if="post.postType && post.postType !== 'standard'"
        class="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/10"
      >
        <span
          class="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow-sm backdrop-blur-sm dark:bg-neutral-900/90 dark:text-white"
        >
          <Play v-if="post.postType === 'video'" class="ms-0.5 h-3.5 w-3.5 fill-current" aria-hidden="true" />
          <Headphones v-else-if="post.postType === 'audio'" class="h-3.5 w-3.5" aria-hidden="true" />
          <Layers v-else-if="post.postType === 'gallery'" class="h-3.5 w-3.5" aria-hidden="true" />
          <span class="sr-only">{{ post.postType }}</span>
        </span>
      </div>
    </RouterLink>
    <div class="min-w-0 flex-1">
      <CategoryBadgeList :categories="post.categories" :limit="1" />
      <h3 class="mt-1.5 text-sm font-semibold leading-snug">
        <RouterLink
          :to="postLink"
          class="line-clamp-2 text-neutral-900 transition hover:text-primary-600 dark:text-neutral-100 dark:hover:text-primary-300"
        >
          {{ post.title }}
        </RouterLink>
      </h3>
      <time
        :datetime="post.createdAt"
        class="mt-1.5 block text-xs text-neutral-500 dark:text-neutral-400"
      >
        {{ post.readingTime }} min read
      </time>
    </div>
  </article>

  <article
    v-else-if="layout === 'card5'"
    class="nc-Card5 group relative flex flex-col justify-between rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-2xl transition duration-300 hover:-translate-y-1 hover:shadow-card dark:border-neutral-700/80 dark:bg-neutral-800"
  >
    <div class="flex flex-col">
      <div class="flex items-center justify-between gap-2">
        <CategoryBadgeList :categories="post.categories" :limit="2" />
        <SaveButton :post-id="post.id" :post-title="post.title" />
      </div>
      <h3 class="my-3 text-base font-semibold leading-snug">
        <RouterLink
          :to="postLink"
          class="line-clamp-2 text-neutral-900 transition hover:text-primary-600 dark:text-neutral-100 dark:hover:text-primary-300"
        >
          {{ post.title }}
        </RouterLink>
      </h3>
    </div>
    <div class="mt-4 flex items-center justify-between border-t border-neutral-100 pt-4 dark:border-neutral-700/60">
      <div class="flex items-center gap-2.5">
        <AppAvatar :src="post.author.avatar" :name="post.author.name" size="sm" />
        <div class="text-xs">
          <RouterLink
            :to="`/author/${post.author.username}`"
            class="font-medium text-neutral-800 hover:text-primary-600 dark:text-neutral-200 dark:hover:text-primary-300"
          >
            {{ post.author.name }}
          </RouterLink>
          <p class="text-[11px] text-neutral-400">
            {{ formatDate(post.createdAt) }}
          </p>
        </div>
      </div>
      <LikeButton :post="post" />
    </div>
  </article>

  <article v-else class="group relative overflow-hidden rounded-3xl">
    <RouterLink :to="postLink" class="absolute inset-0 z-10">
      <span class="sr-only">{{ post.title }}</span>
    </RouterLink>
    <PostImage
      :src="post.cover"
      :alt="post.title"
      :aspect="aspect"
      :sizes="sizes"
      :priority="priority"
    />
    <div
      class="pointer-events-none absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-neutral-950/30 to-neutral-950/10"
    ></div>
    <div
      v-if="post.postType && post.postType !== 'standard'"
      class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
    >
      <span
        class="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow-lg backdrop-blur-sm transition duration-300 group-hover:scale-110 dark:bg-neutral-900/90 dark:text-white"
      >
        <Play v-if="post.postType === 'video'" class="ms-0.5 h-5 w-5 fill-current" aria-hidden="true" />
        <Headphones v-else-if="post.postType === 'audio'" class="h-5 w-5" aria-hidden="true" />
        <Layers v-else-if="post.postType === 'gallery'" class="h-5 w-5" aria-hidden="true" />
        <span class="sr-only">{{ post.postType }}</span>
      </span>
    </div>
    <div class="absolute inset-x-4 top-4 z-20 flex items-center justify-between gap-2">
      <CategoryBadgeList :categories="post.categories" overlay />
      <SaveButton :post-id="post.id" :post-title="post.title" />
    </div>
    <div class="absolute inset-x-5 bottom-5 z-20">
      <h3
        class="line-clamp-2 text-lg font-semibold leading-snug text-white sm:text-xl"
      >
        {{ post.title }}
      </h3>
      <p class="mt-1.5 text-xs font-medium text-neutral-300">
        {{ post.author.name }} · {{ post.readingTime }} min read
      </p>
    </div>
  </article>
</template>
