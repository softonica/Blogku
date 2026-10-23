<script setup lang="ts">
import { ArrowUpRight } from 'lucide-vue-next'
import type { User } from '@/api/types'
import AppAvatar from '@/components/ui/AppAvatar.vue'

withDefaults(
  defineProps<{
    author: User
    compact?: boolean
  }>(),
  { compact: false },
)
</script>

<template>
  <div
    class="flex items-start gap-4 rounded-3xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
  >
    <AppAvatar :src="author.avatar" :name="author.name" :size="compact ? 'md' : 'lg'" />
    <div class="min-w-0 flex-1">
      <RouterLink
        :to="`/author/${author.username}`"
        class="inline-flex items-center gap-1 text-base font-semibold text-neutral-900 hover:text-primary-600 dark:text-white dark:hover:text-primary-300"
      >
        {{ author.name }}
        <ArrowUpRight class="h-4 w-4" aria-hidden="true" />
      </RouterLink>
      <p class="mt-1 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {{ author.postCount ?? 0 }} stories
      </p>
      <p
        v-if="!compact"
        class="mt-2 line-clamp-3 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400"
      >
        {{ author.bio }}
      </p>
    </div>
  </div>
</template>
