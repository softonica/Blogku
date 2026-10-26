<script setup lang="ts">
import { onMounted, ref, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ChevronDown,
  ExternalLink,
  FileText,
  FolderTree,
  LayoutDashboard,
  LogOut,
  MessageSquareOff,
  PenLine,
  Settings,
  Sparkles,
  Type,
  Users,
  X,
} from 'lucide-vue-next'
import { getDataSource } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import AppAvatar from '@/components/ui/AppAvatar.vue'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

interface NavItem {
  name: string
  to: string
  icon: Component
  exact?: boolean
}

interface NavGroup {
  id: string
  label: string
  items: NavItem[]
}

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const ui = useUiStore()
const siteName = ref('Blogku')

const groups: NavGroup[] = [
  {
    id: 'main',
    label: 'Main',
    items: [
      { name: 'Overview', to: '/admin', icon: LayoutDashboard, exact: true },
      { name: 'My Posts', to: '/dashboard', icon: FileText, exact: true },
      { name: 'New Post', to: '/editor', icon: PenLine },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    items: [
      { name: 'Categories & Tags', to: '/admin/taxonomies', icon: FolderTree },
      { name: 'Pages', to: '/admin/pages', icon: FileText },
      { name: 'Comments', to: '/admin/moderation', icon: MessageSquareOff },
    ],
  },
  {
    id: 'community',
    label: 'Community',
    items: [{ name: 'Users & Roles', to: '/admin/users', icon: Users }],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      { name: 'Site Settings', to: '/admin/settings', icon: Settings },
      { name: 'Editor Settings', to: '/admin/editor-settings', icon: Type },
    ],
  },
]

const openGroups = ref<Record<string, boolean>>({
  main: true,
  content: true,
  community: true,
  system: true,
})

function toggleGroup(id: string): void {
  openGroups.value[id] = !openGroups.value[id]
}

function isActive(item: NavItem): boolean {
  if (item.exact) {
    if (item.to === '/admin') {
      return route.path === '/admin' || route.path === '/admin/dashboard'
    }
    return route.path === item.to
  }
  return route.path === item.to || route.path.startsWith(`${item.to}/`)
}

async function logout(): Promise<void> {
  await auth.logout()
  emit('close')
  ui.notify('Signed out.')
  await router.push({ name: 'home' })
}

onMounted(async () => {
  try {
    const settings = await getDataSource().getSiteSettings()
    if (settings.siteName) siteName.value = settings.siteName
  } catch {
    /* keep the fallback brand name */
  }
})
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-40 bg-neutral-950/40 backdrop-blur-sm lg:hidden"
    aria-hidden="true"
    @click="emit('close')"
  />
  <aside
    class="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-e border-neutral-200/80 bg-white transition-transform duration-300 dark:border-neutral-800 dark:bg-neutral-900"
    :class="open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
    aria-label="Admin sidebar"
  >
    <div class="flex h-20 shrink-0 items-center justify-between px-5">
      <RouterLink to="/admin" class="flex min-w-0 items-center gap-2.5" @click="emit('close')">
        <span
          class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 via-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-500/30"
        >
          <Sparkles class="h-5 w-5" aria-hidden="true" />
        </span>
        <span class="truncate text-xl font-black tracking-tight text-neutral-900 dark:text-white">
          {{ siteName }}<span class="text-violet-500">.</span>
        </span>
      </RouterLink>
      <button
        type="button"
        class="inline-flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 lg:hidden dark:text-neutral-400 dark:hover:bg-neutral-800"
        aria-label="Close sidebar"
        @click="emit('close')"
      >
        <X class="h-5 w-5" aria-hidden="true" />
      </button>
    </div>

    <nav class="flex-1 space-y-5 overflow-y-auto px-3 pb-4" aria-label="Admin navigation">
      <div v-for="group in groups" :key="group.id">
        <button
          type="button"
          class="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400 transition hover:text-neutral-600 dark:hover:text-neutral-200"
          :aria-expanded="openGroups[group.id]"
          @click="toggleGroup(group.id)"
        >
          {{ group.label }}
          <ChevronDown
            class="h-3.5 w-3.5 transition-transform duration-200"
            :class="openGroups[group.id] ? '' : '-rotate-90'"
            aria-hidden="true"
          />
        </button>
        <ul v-show="openGroups[group.id]" class="mt-1 space-y-1">
          <li v-for="item in group.items" :key="item.to">
            <RouterLink
              :to="item.to"
              class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition"
              :class="
                isActive(item)
                  ? 'bg-violet-50 font-semibold text-violet-700 dark:bg-violet-500/10 dark:text-violet-200'
                  : 'font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800/70 dark:hover:text-white'
              "
              :aria-current="isActive(item) ? 'page' : undefined"
              @click="emit('close')"
            >
              <component
                :is="item.icon"
                class="h-[18px] w-[18px] shrink-0"
                :class="isActive(item) ? 'text-violet-500' : ''"
                aria-hidden="true"
              />
              <span class="truncate">{{ item.name }}</span>
            </RouterLink>
          </li>
        </ul>
      </div>
    </nav>

    <div class="shrink-0 space-y-1 border-t border-neutral-200/80 p-3 dark:border-neutral-800">
      <RouterLink
        to="/"
        class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800/70 dark:hover:text-white"
        @click="emit('close')"
      >
        <ExternalLink class="h-[18px] w-[18px]" aria-hidden="true" />
        Back to site
      </RouterLink>
      <div class="flex items-center gap-2 rounded-xl px-2 py-2">
        <RouterLink
          to="/profile"
          class="flex min-w-0 flex-1 items-center gap-3 rounded-lg"
          @click="emit('close')"
        >
          <AppAvatar :src="auth.user?.avatar" :name="auth.user?.name ?? 'Admin'" size="sm" />
          <span class="min-w-0">
            <span class="block truncate text-sm font-semibold text-neutral-900 dark:text-white">
              {{ auth.user?.name ?? 'Administrator' }}
            </span>
            <span class="block truncate text-xs capitalize text-neutral-500 dark:text-neutral-400">
              {{ auth.user?.role ?? 'admin' }}
            </span>
          </span>
        </RouterLink>
        <button
          type="button"
          class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"
          aria-label="Sign out"
          title="Sign out"
          @click="logout"
        >
          <LogOut class="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  </aside>
</template>
