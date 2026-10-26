<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Bell, HelpCircle, Menu, Search, Settings } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import ThemeToggle from '@/components/layout/ThemeToggle.vue'

const emit = defineEmits<{ 'toggle-sidebar': [] }>()

const route = useRoute()
const auth = useAuthStore()
const ui = useUiStore()

const title = computed(() => (route.meta.title as string | undefined) ?? 'Admin')
const subtitle = computed(() =>
  route.path === '/admin' || route.path === '/admin/dashboard'
    ? 'Content operations at a glance'
    : 'Administrative controls & RBAC management',
)
</script>

<template>
  <header
    class="sticky top-0 z-30 border-b border-neutral-200/70 bg-white/80 backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-900/80"
  >
    <div class="flex h-16 items-center gap-3 px-4 sm:h-20 sm:px-6 lg:px-8">
      <button
        type="button"
        class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-neutral-600 transition hover:bg-neutral-100 lg:hidden dark:text-neutral-300 dark:hover:bg-neutral-800"
        aria-label="Open sidebar"
        @click="emit('toggle-sidebar')"
      >
        <Menu class="h-5 w-5" aria-hidden="true" />
      </button>

      <div class="min-w-0 flex-1">
        <h1 class="truncate text-lg font-bold tracking-tight text-neutral-900 sm:text-xl dark:text-white">
          {{ title }}
        </h1>
        <p class="hidden truncate text-xs text-neutral-500 sm:block dark:text-neutral-400">
          {{ subtitle }}
        </p>
      </div>

      <div class="flex items-center gap-1 sm:gap-2">
        <button
          type="button"
          class="hidden h-10 items-center gap-2 rounded-full border border-neutral-200 bg-white px-3.5 text-xs font-medium text-neutral-500 transition hover:border-neutral-300 hover:text-neutral-800 sm:inline-flex dark:border-neutral-700 dark:bg-neutral-950/40 dark:text-neutral-400 dark:hover:border-neutral-600 dark:hover:text-neutral-100"
          aria-label="Open search"
          @click="ui.openSearch()"
        >
          <Search class="h-4 w-4" aria-hidden="true" />
          Search
          <kbd
            class="rounded-md border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800"
          >
            Ctrl K
          </kbd>
        </button>

        <RouterLink
          to="/admin/settings"
          class="inline-flex h-10 w-10 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
          aria-label="Site settings"
          title="Site settings"
        >
          <Settings class="h-5 w-5" aria-hidden="true" />
        </RouterLink>

        <RouterLink
          to="/contact"
          class="hidden h-10 w-10 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 sm:inline-flex dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
          aria-label="Get help"
          title="Get help"
        >
          <HelpCircle class="h-5 w-5" aria-hidden="true" />
        </RouterLink>

        <RouterLink
          to="/admin/moderation"
          class="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
          aria-label="Comment moderation notifications"
          title="Comment moderation"
        >
          <Bell class="h-5 w-5" aria-hidden="true" />
          <span class="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-neutral-900" />
        </RouterLink>

        <ThemeToggle />

        <RouterLink
          to="/profile"
          class="ms-1 inline-flex rounded-full ring-2 ring-transparent transition hover:ring-violet-400/50"
          aria-label="Open profile"
        >
          <AppAvatar :src="auth.user?.avatar" :name="auth.user?.name ?? 'Admin'" size="sm" />
        </RouterLink>
      </div>
    </div>
  </header>
</template>
