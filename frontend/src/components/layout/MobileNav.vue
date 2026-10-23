<script setup lang="ts">
import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Bookmark,
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  MessageSquareOff,
  PenLine,
  Search,
  Settings,
  User,
  UserPlus,
  Users,
  X,
} from 'lucide-vue-next'
import type { Category } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { can } from '@/lib/permissions'
import Brand from './Brand.vue'
import ThemeToggle from './ThemeToggle.vue'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import AppBadge from '@/components/ui/AppBadge.vue'

defineProps<{ categories: Category[] }>()

const ui = useUiStore()
const auth = useAuthStore()
const router = useRouter()
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

async function logout(): Promise<void> {
  ui.closeMobileNav()
  await auth.logout()
  ui.notify('Signed out.')
  await router.push({ name: 'home' })
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
        class="absolute inset-y-0 end-0 flex w-[min(22rem,90vw)] flex-col overflow-y-auto bg-white p-5 shadow-float dark:bg-neutral-950"
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

        <div
          v-if="auth.isAuthenticated"
          class="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-neutral-50 p-3 dark:bg-neutral-900"
        >
          <div class="flex items-center gap-3 min-w-0">
            <AppAvatar
              :src="auth.user?.avatar"
              :name="auth.user?.name ?? 'User'"
              size="sm"
            />
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-neutral-900 dark:text-white">
                {{ auth.user?.name }}
              </p>
              <p class="truncate text-xs text-neutral-500 dark:text-neutral-400">
                @{{ auth.user?.username }}
              </p>
            </div>
          </div>
          <AppBadge
            :variant="auth.user?.role === 'admin' ? 'primary' : 'neutral'"
            class="capitalize shrink-0"
          >
            {{ auth.user?.role }}
          </AppBadge>
        </div>

        <nav class="mt-5 space-y-1">
          <RouterLink
            to="/"
            class="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 dark:text-neutral-100 dark:hover:bg-neutral-900"
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
          <RouterLink
            v-if="auth.isAuthenticated"
            to="/bookmarks"
            class="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 dark:text-neutral-100 dark:hover:bg-neutral-900"
          >
            <Bookmark class="h-4 w-4" aria-hidden="true" />
            Bookmarks
          </RouterLink>

          <template v-if="auth.isAuthenticated">
            <RouterLink
              to="/profile"
              class="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 dark:text-neutral-100 dark:hover:bg-neutral-900"
            >
              <User class="h-4 w-4" aria-hidden="true" />
              Profile
            </RouterLink>

            <template v-if="can(auth.user?.role, 'write_post')">
              <RouterLink
                to="/dashboard"
                class="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 dark:text-neutral-100 dark:hover:bg-neutral-900"
              >
                <LayoutDashboard class="h-4 w-4" aria-hidden="true" />
                Dashboard
              </RouterLink>
              <RouterLink
                to="/editor"
                class="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 dark:text-neutral-100 dark:hover:bg-neutral-900"
              >
                <PenLine class="h-4 w-4" aria-hidden="true" />
                New story
              </RouterLink>
            </template>

            <!-- Admin links -->
            <template v-if="can(auth.user?.role, 'manage_settings')">
              <div class="pt-2 pb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Admin
              </div>
              <RouterLink
                to="/admin/settings"
                class="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 dark:text-neutral-100 dark:hover:bg-neutral-900"
              >
                <Settings class="h-4 w-4" aria-hidden="true" />
                Site Settings
              </RouterLink>
              <RouterLink
                to="/admin/users"
                class="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 dark:text-neutral-100 dark:hover:bg-neutral-900"
              >
                <Users class="h-4 w-4" aria-hidden="true" />
                Users & Roles
              </RouterLink>
              <RouterLink
                to="/admin/moderation"
                class="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 dark:text-neutral-100 dark:hover:bg-neutral-900"
              >
                <MessageSquareOff class="h-4 w-4" aria-hidden="true" />
                Moderation
              </RouterLink>
            </template>

            <button
              type="button"
              class="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-start text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/40"
              @click="logout"
            >
              <LogOut class="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </template>
          <template v-else>
            <RouterLink
              to="/login"
              class="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 dark:text-neutral-100 dark:hover:bg-neutral-900"
            >
              <LogIn class="h-4 w-4" aria-hidden="true" />
              Sign in
            </RouterLink>
            <RouterLink
              to="/sign-up"
              class="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 dark:text-neutral-100 dark:hover:bg-neutral-900"
            >
              <UserPlus class="h-4 w-4" aria-hidden="true" />
              Create account
            </RouterLink>
          </template>
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
            >
              {{ category.name }}
            </RouterLink>
          </div>
        </div>
      </aside>
    </div>
  </Teleport>
</template>
