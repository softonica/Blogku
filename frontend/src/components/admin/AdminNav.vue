<script setup lang="ts">
import { useRoute } from 'vue-router'
import { FolderTree, MessageSquareOff, Settings, Users } from 'lucide-vue-next'

const route = useRoute()

const tabs = [
  {
    name: 'Site Settings',
    to: '/admin/settings',
    icon: Settings,
    current: route.path === '/admin/settings',
  },
  {
    name: 'Categories & Tags',
    to: '/admin/taxonomies',
    icon: FolderTree,
    current: route.path === '/admin/taxonomies',
  },
  {
    name: 'Users & Roles',
    to: '/admin/users',
    icon: Users,
    current: route.path === '/admin/users',
  },
  {
    name: 'Comment Moderation',
    to: '/admin/moderation',
    icon: MessageSquareOff,
    current: route.path === '/admin/moderation',
  },
]
</script>

<template>
  <div class="mb-8 border-b border-neutral-200 dark:border-neutral-800">
    <div class="flex items-center gap-2 pb-4">
      <span class="rounded-lg bg-primary-100 px-2 py-1 text-xs font-bold uppercase tracking-wider text-primary-700 dark:bg-primary-950 dark:text-primary-300">
        Admin Portal
      </span>
      <span class="text-xs text-neutral-400">·</span>
      <span class="text-xs text-neutral-500 dark:text-neutral-400">
        Administrative controls & RBAC management
      </span>
    </div>
    <nav class="-mb-px flex space-x-6 overflow-x-auto" aria-label="Admin tabs">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.name"
        :to="tab.to"
        class="inline-flex items-center gap-2 border-b-2 py-3 text-sm font-semibold transition"
        :class="
          route.path === tab.to
            ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
            : 'border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200'
        "
      >
        <component :is="tab.icon" class="h-4 w-4" aria-hidden="true" />
        {{ tab.name }}
      </RouterLink>
    </nav>
  </div>
</template>
