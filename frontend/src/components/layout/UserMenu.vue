<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { onClickOutside } from '@vueuse/core'
import {
  Bookmark,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  MessageSquareOff,
  PenLine,
  Settings,
  User,
  Users,
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { can } from '@/lib/permissions'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const auth = useAuthStore()
const ui = useUiStore()
const router = useRouter()
const open = ref(false)
const root = ref<HTMLElement | null>(null)

onClickOutside(root, () => {
  open.value = false
})

async function logout(): Promise<void> {
  open.value = false
  await auth.logout()
  ui.notify('Signed out.')
  await router.push({ name: 'home' })
}
</script>

<template>
  <div v-if="!auth.isAuthenticated" class="flex items-center gap-2">
    <BaseButton to="/login" variant="ghost" size="sm" class="hidden sm:inline-flex">
      Sign in
    </BaseButton>
    <BaseButton to="/sign-up" size="sm">Join</BaseButton>
  </div>
  <div v-else ref="root" class="relative">
    <button
      type="button"
      class="flex items-center gap-2 rounded-full py-1 pe-2 ps-1 transition hover:bg-neutral-100 dark:hover:bg-neutral-800"
      :aria-expanded="open"
      aria-haspopup="menu"
      @click="open = !open"
    >
      <AppAvatar
        :src="auth.user?.avatar"
        :name="auth.user?.name ?? 'User'"
        size="sm"
      />
      <span
        class="hidden max-w-24 truncate text-sm font-semibold text-neutral-800 sm:block dark:text-neutral-100"
      >
        {{ auth.user?.name }}
      </span>
      <ChevronDown class="h-4 w-4 text-neutral-400" aria-hidden="true" />
    </button>
    <div
      v-if="open"
      class="absolute end-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-neutral-200 bg-white py-2 shadow-float dark:border-neutral-800 dark:bg-neutral-900"
      role="menu"
    >
      <div class="border-b border-neutral-100 px-4 pb-3 pt-1 dark:border-neutral-800">
        <div class="flex items-center justify-between gap-2">
          <p class="truncate text-sm font-semibold text-neutral-900 dark:text-white">
            {{ auth.user?.name }}
          </p>
          <AppBadge
            :variant="auth.user?.role === 'admin' ? 'primary' : 'neutral'"
            class="capitalize !px-1.5 !py-0 !text-[10px]"
          >
            {{ auth.user?.role }}
          </AppBadge>
        </div>
        <p class="truncate text-xs text-neutral-500 dark:text-neutral-400">
          @{{ auth.user?.username }}
        </p>
      </div>

      <!-- Author actions (penulis & admin) -->
      <template v-if="can(auth.user?.role, 'write_post')">
        <RouterLink
          to="/dashboard"
          class="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-neutral-800"
          role="menuitem"
          @click="open = false"
        >
          <LayoutDashboard class="h-4 w-4" aria-hidden="true" />
          Dashboard
        </RouterLink>
        <RouterLink
          to="/editor"
          class="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-neutral-800"
          role="menuitem"
          @click="open = false"
        >
          <PenLine class="h-4 w-4" aria-hidden="true" />
          Write Story
        </RouterLink>
      </template>

      <!-- Subscriber+ actions -->
      <RouterLink
        to="/profile"
        class="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-neutral-800"
        role="menuitem"
        @click="open = false"
      >
        <User class="h-4 w-4" aria-hidden="true" />
        My Profile
      </RouterLink>
      <RouterLink
        to="/bookmarks"
        class="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-neutral-800"
        role="menuitem"
        @click="open = false"
      >
        <Bookmark class="h-4 w-4" aria-hidden="true" />
        Bookmarks
      </RouterLink>

      <!-- Admin section (admin only) -->
      <template v-if="can(auth.user?.role, 'manage_settings')">
        <div class="my-1 border-t border-neutral-100 px-4 pt-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:border-neutral-800">
          Admin Portal
        </div>
        <RouterLink
          to="/admin/settings"
          class="flex items-center gap-3 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-neutral-800"
          role="menuitem"
          @click="open = false"
        >
          <Settings class="h-4 w-4" aria-hidden="true" />
          Site Settings
        </RouterLink>
        <RouterLink
          to="/admin/users"
          class="flex items-center gap-3 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-neutral-800"
          role="menuitem"
          @click="open = false"
        >
          <Users class="h-4 w-4" aria-hidden="true" />
          Users & Roles
        </RouterLink>
        <RouterLink
          to="/admin/moderation"
          class="flex items-center gap-3 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-neutral-800"
          role="menuitem"
          @click="open = false"
        >
          <MessageSquareOff class="h-4 w-4" aria-hidden="true" />
          Moderation
        </RouterLink>
      </template>

      <button
        type="button"
        class="flex w-full items-center gap-3 border-t border-neutral-100 px-4 py-2.5 text-start text-sm font-medium text-rose-600 hover:bg-rose-50 dark:border-neutral-800 dark:text-rose-300 dark:hover:bg-rose-950/40"
        role="menuitem"
        @click="logout"
      >
        <LogOut class="h-4 w-4" aria-hidden="true" />
        Sign out
      </button>
    </div>
  </div>
</template>
