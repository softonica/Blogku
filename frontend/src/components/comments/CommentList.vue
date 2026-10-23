<script setup lang="ts">
import type { Comment } from '@/api/types'
import CommentItem from './CommentItem.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'

withDefaults(
  defineProps<{
    comments: Comment[]
    loading?: boolean
  }>(),
  { loading: false },
)

const emit = defineEmits<{ delete: [id: string] }>()
</script>

<template>
  <section aria-labelledby="comments-heading">
    <div class="flex items-center justify-between">
      <h2
        id="comments-heading"
        class="text-xl font-bold tracking-tight text-neutral-900 dark:text-white"
      >
        Comments
        <span class="ms-1 text-sm font-medium text-neutral-400">
          ({{ comments.length }})
        </span>
      </h2>
    </div>

    <div v-if="loading" class="mt-6 flex justify-center py-6">
      <LoadingSpinner />
    </div>
    <EmptyState
      v-else-if="!comments.length"
      class="mt-6"
      title="No comments yet"
      description="Be the first to add a thoughtful note to this story."
    />
    <div v-else class="mt-6 space-y-6">
      <CommentItem
        v-for="comment in comments"
        :key="comment.id"
        :comment="comment"
        @delete="emit('delete', $event)"
      />
    </div>
  </section>
</template>
