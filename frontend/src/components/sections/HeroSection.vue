<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight } from 'lucide-vue-next'
import type { Post } from '@/api/types'
import { formatDate } from '@/lib/format'
import PostImage from '@/components/ui/PostImage.vue'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import PostCard from '@/components/post/PostCard.vue'

const props = defineProps<{
  post?: Post
  posts?: Post[]
}>()

const heroPost = computed(() => props.post || props.posts?.[0])
const subPosts = computed(() => (props.posts && props.posts.length > 1 ? props.posts.slice(1, 4) : []))
</script>

<template>
  <section v-if="heroPost" class="nc-SectionHero3 not-prose relative">
    <!-- Giant Rounded Hero Banner -->
    <div
      class="relative w-full max-w-full overflow-hidden rounded-[28px] sm:rounded-[40px] aspect-[4/3] sm:aspect-[16/8] lg:aspect-[16/7] bg-neutral-900 shadow-card"
    >
      <PostImage
        :src="heroPost.cover"
        :alt="heroPost.title"
        aspect="h-full w-full object-cover"
        sizes="(max-width: 1024px) 100vw, 960px"
        width="960"
        height="420"
        priority
      />
      <!-- Gradient overlay -->
      <span
        class="absolute inset-0 rounded-[28px] sm:rounded-[40px] bg-gradient-to-t from-black/85 via-black/45 to-black/25"
      ></span>

      <!-- Content over banner -->
      <div class="absolute inset-0 flex flex-col justify-end p-4 sm:p-8 md:p-12 lg:p-16">
        <div class="w-full max-w-3xl">
          <div class="mb-2 sm:mb-3 flex flex-wrap gap-2">
            <RouterLink
              v-for="cat in heroPost.categories"
              :key="cat.id"
              :to="`/category/${cat.slug}`"
              class="inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 sm:px-3 sm:py-1 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white/30"
            >
              {{ cat.name }}
            </RouterLink>
          </div>

          <h1
            class="text-lg font-bold text-white sm:text-3xl lg:text-4xl xl:text-5xl leading-snug sm:leading-tight"
          >
            <RouterLink :to="`/post/${heroPost.slug}`" class="transition hover:text-primary-200">
              <span class="line-clamp-2">{{ heroPost.title }}</span>
            </RouterLink>
          </h1>

          <p class="mt-2 sm:mt-3 hidden sm:block text-sm sm:text-base text-neutral-200 line-clamp-2 max-w-2xl leading-relaxed">
            {{ heroPost.excerpt }}
          </p>

          <div class="mt-3 sm:mt-6 flex flex-wrap items-center gap-3 sm:gap-4">
            <RouterLink
              :to="`/post/${heroPost.slug}`"
              class="nc-Button inline-flex items-center justify-center rounded-lg sm:rounded-2xl bg-primary-600 hover:bg-primary-500 text-white text-xs sm:text-base font-semibold py-2.5 px-3.5 sm:py-3.5 sm:px-6 transition shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
              :aria-label="`Read post: ${heroPost.title}`"
            >
              <span>Read post</span>
              <ArrowRight class="ms-2 h-3.5 w-3.5 sm:h-4 sm:w-4 rtl:rotate-180" aria-hidden="true" />
            </RouterLink>
            <div class="flex items-center gap-2 text-xs text-neutral-300">
              <AppAvatar :src="heroPost.author.avatar" :name="heroPost.author.name" size="xs" />
              <span class="truncate max-w-[170px] sm:max-w-none">{{ heroPost.author.name }} · {{ formatDate(heroPost.createdAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 3 Featured Sub Cards (nc-Card5) -->
    <h2 class="sr-only">Featured posts</h2>
    <div
      v-if="subPosts.length"
      class="mt-4 sm:mt-6 lg:mt-8 grid gap-3 sm:gap-4 sm:grid-cols-2 md:grid-cols-3 lg:gap-6 relative z-10 [&>*:last-child]:sm:col-span-2 [&>*:last-child]:md:col-span-1"
    >
      <PostCard
        v-for="sub in subPosts"
        :key="sub.id"
        :post="sub"
        layout="card5"
      />
    </div>
  </section>
</template>
