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
      class="relative overflow-hidden rounded-[32px] sm:rounded-[40px] aspect-[16/11] sm:aspect-[16/8] lg:aspect-[16/7] bg-neutral-900 shadow-card"
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
        class="absolute inset-0 rounded-[32px] sm:rounded-[40px] bg-gradient-to-t from-black/85 via-black/45 to-black/25"
      ></span>

      <!-- Content over banner -->
      <div class="absolute inset-0 flex flex-col justify-end p-6 sm:p-10 md:p-14 lg:p-16 xl:p-20">
        <div class="max-w-3xl">
          <div class="mb-3 flex flex-wrap gap-2">
            <RouterLink
              v-for="cat in heroPost.categories"
              :key="cat.id"
              :to="`/category/${cat.slug}`"
              class="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white/30"
            >
              {{ cat.name }}
            </RouterLink>
          </div>

          <h1
            class="text-xl font-bold text-white sm:text-3xl lg:text-4xl xl:text-5xl leading-tight"
          >
            <RouterLink :to="`/post/${heroPost.slug}`" class="transition hover:text-primary-200">
              <span class="line-clamp-2">{{ heroPost.title }}</span>
            </RouterLink>
          </h1>

          <p class="mt-3 hidden sm:block text-sm sm:text-base text-neutral-200 line-clamp-2 max-w-2xl leading-relaxed">
            {{ heroPost.excerpt }}
          </p>

          <div class="mt-5 sm:mt-8 flex flex-wrap items-center gap-4">
            <RouterLink
              :to="`/post/${heroPost.slug}`"
              class="nc-Button inline-flex items-center justify-center rounded-2xl bg-primary-600 hover:bg-primary-500 text-white text-sm sm:text-base font-semibold py-3 px-5 sm:py-3.5 sm:px-6 transition shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
              :aria-label="`Read story: ${heroPost.title}`"
            >
              <span>Read story</span>
              <ArrowRight class="ms-2.5 h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            </RouterLink>
            <div class="flex items-center gap-2.5 text-xs text-neutral-300">
              <AppAvatar :src="heroPost.author.avatar" :name="heroPost.author.name" size="sm" />
              <span>{{ heroPost.author.name }} · {{ formatDate(heroPost.createdAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 3 Overlapping Floating Cards (nc-Card5) -->
    <h2 class="sr-only">Featured stories</h2>
    <div
      v-if="subPosts.length"
      class="mt-6 grid transform gap-4 sm:grid-cols-2 md:-mt-20 md:grid-cols-3 lg:gap-8 lg:px-12 xl:px-16 2xl:px-24 relative z-10"
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
