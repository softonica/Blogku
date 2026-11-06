<script setup lang="ts">
import { ref } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import type { Category } from '@/api/types'
import PostImage from '@/components/ui/PostImage.vue'

defineProps<{ categories: Category[] }>()

const sliderRef = ref<HTMLElement | null>(null)

function scrollLeft() {
  sliderRef.value?.scrollBy({ left: -320, behavior: 'smooth' })
}

function scrollRight() {
  sliderRef.value?.scrollBy({ left: 320, behavior: 'smooth' })
}

const colorClasses = [
  'bg-emerald-500',
  'bg-rose-500',
  'bg-indigo-500',
  'bg-amber-500',
  'bg-sky-500',
  'bg-purple-500',
  'bg-teal-500',
  'bg-pink-500',
]
</script>

<template>
  <div class="nc-SectionSliderNewCategories relative">
    <div class="mb-4 sm:mb-6 flex items-end justify-between">
      <div>
        <h2 class="text-2xl font-bold tracking-tight sm:text-3xl text-neutral-900 dark:text-neutral-100">
          Top trending topics
        </h2>
        <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Discover {{ categories.length }} curated desks and categories
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 shadow-xs transition hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          aria-label="Previous categories"
          @click="scrollLeft"
        >
          <ChevronLeft class="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 shadow-xs transition hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          aria-label="Next categories"
          @click="scrollRight"
        >
          <ChevronRight class="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>

    <div
      ref="sliderRef"
      role="region"
      aria-label="Trending categories carousel"
      tabindex="0"
      class="no-scrollbar -mx-4 sm:-mx-6 lg:mx-0 flex snap-x snap-mandatory gap-4 sm:gap-6 overflow-x-auto px-4 sm:px-6 lg:px-0 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-2xl"
    >
      <div
        v-for="(category, index) in categories"
        :key="category.id"
        class="w-56 shrink-0 snap-start sm:w-64"
      >
        <RouterLink
          :to="`/category/${category.slug}`"
          class="nc-CardCategory4 group flex flex-col rounded-xl sm:rounded-3xl p-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          <div
            class="relative aspect-[7/5] w-full shrink-0 overflow-hidden rounded-xl sm:rounded-3xl ring-2 ring-white shadow-sm dark:ring-neutral-900"
          >
            <PostImage
              :src="category.image"
              :alt="category.name"
              aspect="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              width="280"
              height="200"
            />
            <span
              class="absolute start-3 top-3 inline-flex items-center rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-neutral-800 shadow-xs backdrop-blur-md dark:bg-neutral-900/90 dark:text-neutral-200"
            >
              #{{ index + 1 }}
            </span>
            <span
              class="absolute inset-0 bg-black/10 opacity-0 transition-opacity group-hover:opacity-100"
            ></span>
          </div>

          <div class="mt-3.5 flex items-center sm:mt-4">
            <div
              :class="[
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-xs',
                colorClasses[index % colorClasses.length],
              ]"
              aria-hidden="true"
            >
              {{ category.name[0] }}
            </div>
            <div class="ms-3 min-w-0">
              <h3
                class="truncate text-base font-semibold text-neutral-900 group-hover:text-primary-600 dark:text-neutral-100 dark:group-hover:text-primary-400"
              >
                {{ category.name }}
              </h3>
              <span class="block text-xs text-neutral-500 dark:text-neutral-400">
                {{ category.postCount ?? 0 }} Articles
              </span>
            </div>
          </div>
        </RouterLink>
      </div>
    </div>
  </div>
</template>
