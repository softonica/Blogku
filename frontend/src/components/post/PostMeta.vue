<script setup lang="ts">
import type { User } from '@/api/types'
import { formatDate } from '@/lib/format'
import AppAvatar from '@/components/ui/AppAvatar.vue'

withDefaults(
  defineProps<{
    author: User
    date: string
    size?: 'sm' | 'md'
    hideAvatar?: boolean
  }>(),
  { size: 'sm', hideAvatar: false },
)
</script>

<template>
  <div class="flex items-center gap-2.5">
    <AppAvatar
      v-if="!hideAvatar"
      :src="author.avatar"
      :name="author.name"
      :size="size === 'md' ? 'md' : 'sm'"
    />
    <div class="min-w-0 leading-tight">
      <RouterLink
        :to="`/author/${author.username}`"
        class="block truncate text-sm font-semibold text-neutral-900 hover:text-primary-600 dark:text-neutral-100 dark:hover:text-primary-300"
      >
        {{ author.name }}
      </RouterLink>
      <time
        :datetime="date"
        class="block text-xs text-neutral-500 dark:text-neutral-400"
      >
        {{ formatDate(date) }}
      </time>
    </div>
  </div>
</template>
