<script setup lang="ts">
import { computed } from 'vue'
import { Trash2 } from 'lucide-vue-next'
import type { Comment } from '@/api/types'
import { formatRelativeDate } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import { can } from '@/lib/permissions'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import AppBadge from '@/components/ui/AppBadge.vue'

const props = defineProps<{ comment: Comment }>()
const emit = defineEmits<{ delete: [id: string] }>()

const auth = useAuthStore()

const canDelete = computed(() => {
  if (!auth.isAuthenticated) return false
  if (can(auth.user?.role, 'moderate_comment')) return true
  return auth.user?.id === props.comment.author.id
})
</script>

<template>
  <article class="group flex gap-3.5">
    <AppAvatar
      :src="comment.author.avatar"
      :name="comment.author.name"
      size="sm"
    />
    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex flex-wrap items-center gap-2">
          <RouterLink
            :to="`/author/${comment.author.username}`"
            class="text-sm font-semibold text-neutral-900 hover:text-primary-600 dark:text-neutral-100 dark:hover:text-primary-300"
          >
            {{ comment.author.name }}
          </RouterLink>
          <AppBadge
            v-if="comment.author.role === 'admin'"
            variant="primary"
            class="!px-2 !py-0.5 !text-[10px]"
          >
            Editor
          </AppBadge>
          <time
            :datetime="comment.createdAt"
            class="text-xs text-neutral-500 dark:text-neutral-400"
          >
            {{ formatRelativeDate(comment.createdAt) }}
          </time>
        </div>
        <button
          v-if="canDelete"
          type="button"
          class="inline-flex items-center gap-1 text-xs text-neutral-400 opacity-0 transition hover:text-rose-600 focus:opacity-100 group-hover:opacity-100 dark:hover:text-rose-400"
          title="Delete comment"
          @click="emit('delete', comment.id)"
        >
          <Trash2 class="h-3.5 w-3.5" aria-hidden="true" />
          <span class="sr-only sm:not-sr-only">Delete</span>
        </button>
      </div>
      <p
        class="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-neutral-600 dark:text-neutral-300"
      >
        {{ comment.content }}
      </p>
    </div>
  </article>
</template>
