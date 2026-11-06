<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Facebook, Instagram, Linkedin, Twitter, Youtube } from 'lucide-vue-next'
import type { Category } from '@/api/types'
import { getDataSource } from '@/api'
import Brand from './Brand.vue'
import NewsletterForm from '@/components/widgets/NewsletterForm.vue'

const categories = ref<Category[]>([])

onMounted(async () => {
  const source = getDataSource()
  categories.value = (await source.listCategories()).slice(0, 6)
})

const year = new Date().getFullYear()

const socials = [
  { label: 'Facebook', href: 'https://facebook.com', icon: Facebook },
  { label: 'Twitter', href: 'https://twitter.com', icon: Twitter },
  { label: 'Instagram', href: 'https://instagram.com', icon: Instagram },
  { label: 'YouTube', href: 'https://youtube.com', icon: Youtube },
  { label: 'LinkedIn', href: 'https://linkedin.com', icon: Linkedin },
]

const footerLinkClass =
  'rounded text-neutral-600 transition hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-neutral-300 dark:hover:text-primary-300'
</script>

<template>
  <footer class="nc-Footer relative border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
    <div class="mx-auto max-w-8xl px-4 py-14 sm:px-6 lg:py-20 lg:px-8">
      <div class="grid grid-cols-2 gap-8 sm:gap-10 md:grid-cols-3 xl:grid-cols-4">
        <!-- Brand -->
        <div class="col-span-2 space-y-4 sm:space-y-6 md:col-span-1">
          <Brand />
          <p class="max-w-sm text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
            A calm magazine about technology, design, travel and culture.
            Built with Vue 3 and a backend-ready data adapter.
          </p>
          <div class="flex items-center gap-2">
            <a
              v-for="social in socials"
              :key="social.label"
              :href="social.href"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="`${social.label} (opens in new window)`"
              class="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition hover:bg-primary-50 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-primary-300"
            >
              <component :is="social.icon" class="h-5 w-5" aria-hidden="true" />
            </a>
          </div>
        </div>

        <!-- Explore -->
        <nav aria-label="Footer explore links">
          <h2 class="text-sm font-bold text-neutral-900 dark:text-white">Explore</h2>
          <ul class="mt-4 sm:mt-5 space-y-3 text-sm">
            <li><RouterLink to="/" :class="footerLinkClass">Home</RouterLink></li>
            <li><RouterLink to="/search" :class="footerLinkClass">Search</RouterLink></li>
            <li><RouterLink to="/bookmarks" :class="footerLinkClass">Bookmarks</RouterLink></li>
            <li><RouterLink to="/dashboard" :class="footerLinkClass">Dashboard</RouterLink></li>
            <li><RouterLink to="/editor" :class="footerLinkClass">Write a draft</RouterLink></li>
            <li><RouterLink to="/about" :class="footerLinkClass">About</RouterLink></li>
            <li><RouterLink to="/contact" :class="footerLinkClass">Contact</RouterLink></li>
            <li><RouterLink to="/privacy" :class="footerLinkClass">Privacy Policy</RouterLink></li>
          </ul>
        </nav>

        <!-- Categories -->
        <nav aria-label="Footer categories">
          <h2 class="text-sm font-bold text-neutral-900 dark:text-white">Categories</h2>
          <ul class="mt-4 sm:mt-5 space-y-3 text-sm">
            <li v-for="category in categories" :key="category.id">
              <RouterLink
                :to="`/category/${category.slug}`"
                :class="footerLinkClass"
              >
                {{ category.name }}
              </RouterLink>
            </li>
          </ul>
        </nav>

        <!-- Subscribe -->
        <div class="col-span-2 md:col-span-1">
          <h2 class="text-sm font-bold text-neutral-900 dark:text-white">Subscribe</h2>
          <p class="mt-4 sm:mt-5 max-w-xs text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
            Get the latest blogku posts delivered to your inbox. No spam, ever.
          </p>
          <div class="mt-2 w-full">
            <NewsletterForm compact />
          </div>
        </div>
      </div>

      <div class="mt-14 flex flex-col gap-3 sm:gap-4 border-t border-neutral-200 pt-4 sm:pt-6 text-sm text-neutral-500 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800 dark:text-neutral-400">
        <p>© {{ year }} Blogku. Safe · Fast · Simple digital editorial platform.</p>
      </div>
    </div>
  </footer>
</template>
