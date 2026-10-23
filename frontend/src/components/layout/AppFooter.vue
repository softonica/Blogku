<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Facebook, Instagram, Linkedin, Twitter, Youtube } from 'lucide-vue-next'
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
  categories.value = categoryList.slice(0, 6)
  tags.value = tagList.slice(0, 6)
})

const year = new Date().getFullYear()

const socials = [
  { label: 'Facebook', href: 'https://facebook.com', icon: Facebook },
  { label: 'Twitter', href: 'https://twitter.com', icon: Twitter },
  { label: 'Instagram', href: 'https://instagram.com', icon: Instagram },
  { label: 'YouTube', href: 'https://youtube.com', icon: Youtube },
  { label: 'LinkedIn', href: 'https://linkedin.com', icon: Linkedin },
]
</script>

<template>
  <footer class="nc-Footer relative border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
    <div class="container px-4 py-14 sm:px-6 lg:py-20 lg:px-8">
      <div class="grid grid-cols-2 gap-10 md:grid-cols-3 xl:grid-cols-4">
        <!-- Brand -->
        <div class="col-span-2 space-y-6 md:col-span-1">
          <Brand />
          <p class="max-w-sm text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
            A calm magazine about technology, design, travel and culture.
            Built as a phase 1 rewrite with Vue 3 and a backend-ready data
            adapter.
          </p>
          <div class="flex items-center gap-2">
            <a
              v-for="social in socials"
              :key="social.label"
              :href="social.href"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="social.label"
              class="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition hover:bg-primary-50 hover:text-primary-600 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-primary-300"
            >
              <component :is="social.icon" class="h-5 w-5" aria-hidden="true" />
            </a>
          </div>
        </div>

        <!-- Explore -->
        <div>
          <h3 class="text-sm font-bold text-neutral-900 dark:text-white">Explore</h3>
          <ul class="mt-5 space-y-3 text-sm">
            <li><RouterLink to="/" class="text-neutral-600 hover:text-primary-600 dark:text-neutral-300 dark:hover:text-primary-300">Home</RouterLink></li>
            <li><RouterLink to="/search" class="text-neutral-600 hover:text-primary-600 dark:text-neutral-300 dark:hover:text-primary-300">Search</RouterLink></li>
            <li><RouterLink to="/bookmarks" class="text-neutral-600 hover:text-primary-600 dark:text-neutral-300 dark:hover:text-primary-300">Bookmarks</RouterLink></li>
            <li><RouterLink to="/dashboard" class="text-neutral-600 hover:text-primary-600 dark:text-neutral-300 dark:hover:text-primary-300">Dashboard</RouterLink></li>
            <li><RouterLink to="/editor" class="text-neutral-600 hover:text-primary-600 dark:text-neutral-300 dark:hover:text-primary-300">Write a draft</RouterLink></li>
            <li><RouterLink to="/about" class="text-neutral-600 hover:text-primary-600 dark:text-neutral-300 dark:hover:text-primary-300">About</RouterLink></li>
            <li><RouterLink to="/contact" class="text-neutral-600 hover:text-primary-600 dark:text-neutral-300 dark:hover:text-primary-300">Contact</RouterLink></li>
            <li><RouterLink to="/privacy" class="text-neutral-600 hover:text-primary-600 dark:text-neutral-300 dark:hover:text-primary-300">Privacy Policy</RouterLink></li>
          </ul>
        </div>

        <!-- Categories -->
        <div>
          <h3 class="text-sm font-bold text-neutral-900 dark:text-white">Categories</h3>
          <ul class="mt-5 space-y-3 text-sm">
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

        <!-- Subscribe -->
        <div class="col-span-2 md:col-span-1">
          <h3 class="text-sm font-bold text-neutral-900 dark:text-white">Subscribe</h3>
          <p class="mt-5 max-w-xs text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
            Get the latest blogku posts delivered to your inbox. No spam, ever.
          </p>
          <div class="mt-2 max-w-xs">
            <NewsletterForm compact />
          </div>
        </div>
      </div>

      <div class="mt-14 flex flex-col items-start justify-between gap-4 border-t border-neutral-200 pt-6 text-sm text-neutral-500 sm:flex-row sm:items-center dark:border-neutral-800 dark:text-neutral-400">
        <p>© {{ year }} Blogku. Safe · Fast · Simple digital editorial platform.</p>
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
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
  </footer>
</template>
