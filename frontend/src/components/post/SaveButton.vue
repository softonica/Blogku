<script setup lang="ts">
import { computed } from 'vue'
import { Bookmark } from 'lucide-vue-next'
import { useBookmarkStore } from '@/stores/bookmark'
import { useUiStore } from '@/stores/ui'

const props = withDefaults(
  defineProps<{
    postId: string
    postTitle?: string
    showLabel?: boolean
    variant?: 'pill' | 'icon'
  }>(),
  {
    postTitle: '',
    showLabel: false,
    variant: 'icon',
  },
)

const bookmarks = useBookmarkStore()
const ui = useUiStore()
const saved = computed(() => bookmarks.has(props.postId))

const isPill = computed(() => props.showLabel || props.variant === 'pill')

const accessibleLabel = computed(() => {
  if (props.postTitle) {
    return saved.value
      ? `Remove "${props.postTitle}" from bookmarks`
      : `Save "${props.postTitle}" to bookmarks`
  }
  return saved.value ? 'Remove from bookmarks' : 'Save story to bookmarks'
})

function toggle(): void {
  const next = bookmarks.toggle(props.postId)
  ui.notify(
    next
      ? props.postTitle
        ? `Saved "${props.postTitle}" to your bookmarks.`
        : 'Saved to your bookmarks.'
      : props.postTitle
        ? `Removed "${props.postTitle}" from bookmarks.`
        : 'Removed from bookmarks.',
  )
}
</script>

<template>
  <button
    type="button"
    class="group/save inline-flex items-center justify-center font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
    :class="[
      isPill
        ? 'h-10 px-4 text-sm gap-2 rounded-full border'
        : 'h-9 w-9 sm:h-10 sm:w-10 rounded-full border shadow-sm backdrop-blur-md',
      saved
        ? 'border-primary-300 bg-primary-50 text-primary-600 hover:bg-primary-100 hover:border-primary-400 dark:border-primary-700 dark:bg-primary-950/80 dark:text-primary-300 dark:hover:bg-primary-900'
        : 'border-neutral-200/90 bg-white/95 text-neutral-700 hover:bg-white hover:text-neutral-900 hover:border-neutral-300 dark:border-neutral-700/90 dark:bg-neutral-900/95 dark:text-neutral-200 dark:hover:bg-neutral-800 dark:hover:text-white',
    ]"
    :aria-pressed="saved"
    :aria-label="accessibleLabel"
    :title="accessibleLabel"
    @click.stop.prevent="toggle"
  >
    <Bookmark
      class="h-4 w-4 transition-transform duration-200 group-hover/save:scale-110"
      :class="saved ? 'fill-current text-primary-600 dark:text-primary-400' : 'stroke-[2.2]'"
      aria-hidden="true"
    />
    <span v-if="showLabel" class="text-xs sm:text-sm font-semibold">
      {{ saved ? 'Saved' : 'Save' }}
    </span>
    <span v-else class="sr-only">{{ accessibleLabel }}</span>
  </button>
</template>
