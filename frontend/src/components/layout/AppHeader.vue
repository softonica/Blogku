<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { Bookmark, ChevronDown, Menu, PenSquare, Search } from 'lucide-vue-next'
import type { Category } from '@/api/types'
import { getDataSource } from '@/api'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import Brand from './Brand.vue'
import ThemeToggle from './ThemeToggle.vue'
import UserMenu from './UserMenu.vue'
import MobileNav from './MobileNav.vue'

const ui = useUiStore()
const auth = useAuthStore()
const categories = ref<Category[]>([])
const categoriesOpen = ref(false)
const categoryRoot = ref<HTMLElement | null>(null)

onMounted(async () => {
  categories.value = await getDataSource().listCategories()
})

onClickOutside(categoryRoot, () => {
  categoriesOpen.value = false
})

const linkClass =
  'inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white'
</script>

<template>
  <header
    class="sticky top-0 z-40 border-b border-neutral-200/70 bg-white/85 backdrop-blur-xl dark:border-neutral-800/70 dark:bg-neutral-950/85"
  >
    <div class="container flex h-16 sm:h-20 items-center justify-between gap-4">
      <div class="flex items-center gap-4 lg:gap-6">
        <Brand />
        <div class="hidden h-7 border-s border-neutral-200 md:block dark:border-neutral-700"></div>
        <div class="hidden w-64 max-w-xs md:block xl:w-72">
          <button
            type="button"
            class="group relative flex h-[40px] w-full items-center justify-between rounded-full border border-neutral-200 bg-neutral-50/60 px-4 py-2 text-left text-xs font-normal text-neutral-400 transition hover:border-neutral-300 hover:bg-white hover:ring-2 hover:ring-primary-100 dark:border-neutral-700 dark:bg-neutral-900/60 dark:hover:border-neutral-600 dark:hover:bg-neutral-900 dark:hover:ring-primary-900/30"
            @click="ui.openSearch()"
          >
            <span class="truncate">Type to search...</span>
            <Search class="h-4 w-4 shrink-0 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300" aria-hidden="true" />
          </button>
        </div>
      </div>

      <nav class="hidden items-center gap-1 xl:flex" aria-label="Main navigation">
        <RouterLink to="/" :class="linkClass">Home</RouterLink>
        <div ref="categoryRoot" class="relative">
          <button
            type="button"
            :class="[linkClass, 'gap-1']"
            :aria-expanded="categoriesOpen"
            aria-haspopup="menu"
            @click="categoriesOpen = !categoriesOpen"
          >
            Categories
            <ChevronDown class="h-4 w-4" aria-hidden="true" />
          </button>
          <div
            v-if="categoriesOpen"
            class="absolute start-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-2 shadow-float dark:border-neutral-800 dark:bg-neutral-900"
            role="menu"
          >
            <RouterLink
              v-for="category in categories"
              :key="category.id"
              :to="`/category/${category.slug}`"
              class="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 hover:text-primary-700 dark:text-neutral-200 dark:hover:bg-neutral-800 dark:hover:text-primary-300"
              role="menuitem"
              @click="categoriesOpen = false"
            >
              {{ category.name }}
              <span class="text-xs text-neutral-400">
                {{ category.slug }}
              </span>
            </RouterLink>
          </div>
        </div>
        <RouterLink to="/search" :class="linkClass">Explore</RouterLink>
        <RouterLink v-if="auth.isAuthenticated" to="/bookmarks" :class="linkClass">
          <Bookmark class="me-1.5 h-4 w-4" aria-hidden="true" />
          Bookmarks
        </RouterLink>
      </nav>

      <div class="flex items-center gap-1.5 sm:gap-2.5">
        <button
          type="button"
          class="inline-flex h-10 w-10 md:hidden items-center justify-center rounded-full text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
          aria-label="Open search"
          @click="ui.openSearch()"
        >
          <Search class="h-5 w-5" aria-hidden="true" />
        </button>
        <ThemeToggle />
        <RouterLink
          to="/submission"
          class="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-primary-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
        >
          <PenSquare class="h-3.5 w-3.5" aria-hidden="true" />
          Write
        </RouterLink>
        <UserMenu />
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-full text-neutral-600 transition hover:bg-neutral-100 lg:hidden dark:text-neutral-300 dark:hover:bg-neutral-800"
          aria-label="Open menu"
          @click="ui.toggleMobileNav()"
        >
          <Menu class="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>

    <MobileNav :categories="categories" />
  </header>
</template>
