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
  'relative inline-flex h-10 items-center px-3 py-1.5 text-sm font-medium text-neutral-800 transition hover:text-black focus:outline-none sm:h-12 dark:text-neutral-300 dark:hover:text-white'
</script>

<template>
  <header class="sticky top-0 z-30 w-full">
    <div class="relative z-10 border-b border-neutral-200/70 bg-white dark:border-transparent dark:bg-neutral-900">
      <div class="px-4 xl:container">
        <div class="flex h-16 justify-between sm:h-20">
          <!-- Left (mobile): menu toggle -->
          <div class="flex flex-1 items-center lg:hidden">
            <button
              type="button"
              class="inline-flex h-10 w-10 -ms-2 items-center justify-center rounded-full text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              aria-label="Open menu"
              @click="ui.toggleMobileNav()"
            >
              <Menu class="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <!-- Desktop left group: logo + divider + search -->
          <div class="hidden items-center gap-x-3 sm:gap-x-8 lg:flex">
            <div class="flex shrink-0">
              <Brand />
            </div>
            <div class="hidden h-8 border-s border-neutral-200 md:block dark:border-neutral-700"></div>
            <div class="hidden w-64 max-w-xs sm:block xl:w-80">
              <button
                type="button"
                class="group relative flex h-[42px] w-full items-center justify-between rounded-full border border-neutral-200 bg-white px-4 py-3 text-left text-sm font-normal text-neutral-400 transition hover:border-neutral-300 hover:ring-3 hover:ring-primary-200/50 focus:border-primary-300 focus:ring-3 focus:ring-primary-200/50 dark:border-neutral-600 dark:bg-transparent dark:placeholder:text-neutral-400 dark:hover:border-neutral-400 dark:hover:ring-primary-500/30 dark:focus:ring-primary-500/30"
                @click="ui.openSearch()"
              >
                <span class="truncate">Type to search...</span>
                <span class="absolute inset-y-0 end-0 flex items-center justify-center rounded-full pe-3 ps-2 text-neutral-500 dark:text-neutral-400">
                  <Search class="h-5 w-5" aria-hidden="true" />
                </span>
              </button>
            </div>
          </div>

          <!-- Mobile center logo -->
          <div class="flex flex-1 items-center justify-center lg:hidden">
            <Brand />
          </div>

          <!-- Right group -->
          <div class="flex flex-1 items-center justify-end gap-1.5 sm:gap-2.5">
            <nav class="hidden items-center lg:flex" aria-label="Main navigation">
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
                  <ChevronDown class="ms-1 h-4 w-4" aria-hidden="true" />
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

            <div class="mx-2 hidden h-8 self-center border-l border-neutral-200 md:block dark:border-neutral-700"></div>

            <RouterLink
              to="/submission"
              class="hidden md:inline-flex items-center gap-1.5 rounded-full bg-primary-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
            >
              <PenSquare class="h-3.5 w-3.5" aria-hidden="true" />
              Write
            </RouterLink>

            <ThemeToggle />

            <button
              type="button"
              class="inline-flex h-10 w-10 lg:hidden items-center justify-center rounded-full text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              aria-label="Open search"
              @click="ui.openSearch()"
            >
              <Search class="h-5 w-5" aria-hidden="true" />
            </button>

            <UserMenu />
          </div>
        </div>
      </div>
    </div>

    <MobileNav :categories="categories" />
  </header>
</template>
