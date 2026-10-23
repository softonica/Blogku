<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ArrowUpRight } from 'lucide-vue-next'
import type { Category, Tag } from '@/api/types'
import { getDataSource } from '@/api'
import Brand from './Brand.vue'
import NewsletterForm from '@/components/widgets/NewsletterForm.vue'

const categories = ref<Category[]>([])
const tags = ref<Tag[]>([])

onMounted(async () => {
  const source = getDataSource()
  const [categoryList, tagList] = await Promise.all([
    source.listCategories(),
    source.listTags(),
  ])
  categories.value = categoryList
  tags.value = tagList.slice(0, 8)
})

const year = new Date().getFullYear()
</script>

<template>
  <footer class="border-t border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
    <div class="container py-14">
      <div class="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1.4fr]">
        <div>
          <Brand />
          <p class="mt-4 max-w-sm text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
            A calm magazine about technology, design, travel and culture.
            Built as a phase 1 rewrite with Vue 3 and a backend-ready data
            adapter.
          </p>
          <p class="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
            Safe · Fast · Simple
          </p>
        </div>

        <div>
          <h3 class="text-xs font-bold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
            Explore
          </h3>
          <ul class="mt-4 space-y-2.5 text-sm">
            <li><RouterLink to="/" class="text-neutral-600 hover:text-primary-600 dark:text-neutral-300 dark:hover:text-primary-300">Home</RouterLink></li>
            <li><RouterLink to="/search" class="text-neutral-600 hover:text-primary-600 dark:text-neutral-300 dark:hover:text-primary-300">Search</RouterLink></li>
            <li><RouterLink to="/bookmarks" class="text-neutral-600 hover:text-primary-600 dark:text-neutral-300 dark:hover:text-primary-300">Bookmarks</RouterLink></li>
            <li><RouterLink to="/dashboard" class="text-neutral-600 hover:text-primary-600 dark:text-neutral-300 dark:hover:text-primary-300">Dashboard</RouterLink></li>
            <li><RouterLink to="/editor" class="text-neutral-600 hover:text-primary-600 dark:text-neutral-300 dark:hover:text-primary-300">Write a draft</RouterLink></li>
          </ul>
        </div>

        <div>
          <h3 class="text-xs font-bold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
            Categories
          </h3>
          <ul class="mt-4 space-y-2.5 text-sm">
            <li v-for="category in categories" :key="category.id">
              <RouterLink
                :to="`/category/${category.slug}`"
                class="text-neutral-600 hover:text-primary-600 dark:text-neutral-300 dark:hover:text-primary-300"
              >
                {{ category.name }}
              </RouterLink>
            </li>
          </ul>
        </div>

        <div>
          <h3 class="text-xs font-bold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
            Sunday read
          </h3>
          <p class="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
            One carefully chosen story, delivered weekly.
          </p>
          <div class="mt-4">
            <NewsletterForm compact />
          </div>
          <div class="mt-5 flex flex-wrap gap-2">
            <RouterLink
              v-for="tag in tags"
              :key="tag.id"
              :to="`/tag/${tag.slug}`"
              class="rounded-full border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-500 hover:border-primary-300 hover:text-primary-700 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-primary-700 dark:hover:text-primary-300"
            >
              #{{ tag.name }}
            </RouterLink>
          </div>
        </div>
      </div>

      <div class="mt-12 flex flex-col items-start justify-between gap-4 border-t border-neutral-200 pt-6 text-xs text-neutral-500 sm:flex-row sm:items-center dark:border-neutral-800 dark:text-neutral-400">
        <p>© {{ year }} Blogku. Safe · Fast · Simple digital editorial platform.</p>
        <RouterLink
          to="/"
          class="inline-flex items-center gap-1 font-semibold text-neutral-600 hover:text-primary-600 dark:text-neutral-300 dark:hover:text-primary-300"
        >
          Back to top
          <ArrowUpRight class="h-3.5 w-3.5" aria-hidden="true" />
        </RouterLink>
      </div>
    </div>
  </footer>
</template>
