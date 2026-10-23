<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { Home, Search, X } from 'lucide-vue-next'
import type { Category } from '@/api/types'
import { useUiStore } from '@/stores/ui'
import Brand from './Brand.vue'
import ThemeToggle from './ThemeToggle.vue'

defineProps<{ categories: Category[] }>()

const ui = useUiStore()
const route = useRoute()

watch(
  () => route.fullPath,
  () => {
    ui.closeMobileNav()
  },
)

function goSearch(): void {
  ui.closeMobileNav()
  ui.openSearch()
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="ui.mobileNavOpen"
      class="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-sm lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Navigation"
      @click.self="ui.closeMobileNav()"
    >
      <aside
        class="absolute inset-y-0 start-0 flex w-[min(22rem,90vw)] flex-col overflow-y-auto border-e border-neutral-200 bg-white p-5 shadow-float dark:border-neutral-800 dark:bg-neutral-950"
      >
        <div class="flex items-center justify-between">
          <Brand />
          <div class="flex items-center gap-1">
            <ThemeToggle />
            <button
              type="button"
              class="inline-flex h-10 w-10 items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              aria-label="Close menu"
              @click="ui.closeMobileNav()"
            >
              <X class="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <nav class="mt-5 space-y-1">
          <RouterLink
            to="/"
            class="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 dark:text-neutral-100 dark:hover:bg-neutral-900"
            @click="ui.closeMobileNav()"
          >
            <Home class="h-4 w-4" aria-hidden="true" />
            Home
          </RouterLink>
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-start text-sm font-semibold text-neutral-800 hover:bg-neutral-50 dark:text-neutral-100 dark:hover:bg-neutral-900"
            @click="goSearch"
          >
            <Search class="h-4 w-4" aria-hidden="true" />
            Search
          </button>
        </nav>

        <div class="mt-6 border-t border-neutral-100 pt-5 dark:border-neutral-800">
          <p class="px-3 text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
            Categories
          </p>
          <div class="mt-2 grid grid-cols-2 gap-1">
            <RouterLink
              v-for="category in categories"
              :key="category.id"
              :to="`/category/${category.slug}`"
              class="rounded-xl px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 hover:text-primary-700 dark:text-neutral-300 dark:hover:bg-neutral-900 dark:hover:text-primary-300"
              @click="ui.closeMobileNav()"
            >
              {{ category.name }}
            </RouterLink>
          </div>
        </div>
      </aside>
    </div>
  </Teleport>
</template>
