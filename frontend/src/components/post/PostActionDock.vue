<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowUp, List, MessageCircle } from 'lucide-vue-next'
import type { Post } from '@/api/types'
import type { TocHeading } from '@/composables/usePostReading'
import { formatNumber } from '@/lib/format'
import LikeButton from './LikeButton.vue'
import SaveButton from './SaveButton.vue'

defineProps<{
  post: Post
  headings: TocHeading[]
  progress: number
  showBackToTop: boolean
}>()

const emit = defineEmits<{
  comments: []
}>()

const tocOpen = ref(false)
const tocRoot = ref<HTMLElement | null>(null)
const tocButton = ref<HTMLButtonElement | null>(null)

function toggleToc(): void {
  tocOpen.value = !tocOpen.value
}

function closeToc(restoreFocus = false): void {
  tocOpen.value = false
  if (restoreFocus) tocButton.value?.focus()
}

function onPointerDown(event: PointerEvent): void {
  if (!tocOpen.value) return
  const target = event.target as Node | null
  if (target && tocRoot.value && !tocRoot.value.contains(target)) closeToc()
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && tocOpen.value) closeToc(true)
}

function goToHeading(id: string): void {
  tocOpen.value = false
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function backToTop(): void {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function headingIndentClass(level: 2 | 3 | 4): string {
  if (level === 4) return 'ps-8'
  if (level === 3) return 'ps-4'
  return ''
}

onMounted(() => {
  document.addEventListener('pointerdown', onPointerDown)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-3"
    :style="{ bottom: 'calc(var(--player-dock-height, 0px) + 1rem)' }"
  >
    <div class="pointer-events-auto flex max-w-full items-center gap-1 sm:gap-2">
      <div
        class="flex shrink-0 items-center justify-center gap-1 rounded-full bg-white p-1.5 text-xs shadow-lg ring-1 ring-neutral-900/5 ring-offset-1 sm:gap-2 dark:bg-neutral-800 dark:ring-neutral-700 dark:ring-offset-neutral-600"
      >
        <LikeButton :post="post" variant="compact" size="md" />

        <div class="h-4 border-s border-neutral-200 dark:border-neutral-700" />

        <button
          type="button"
          class="group/comment relative flex items-center rounded-full text-xs leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
          :class="'text-neutral-600 hover:text-teal-600 dark:text-neutral-200 dark:hover:text-teal-500'"
          :aria-label="`Comments (${formatNumber(post.commentCount)})`"
          title="Comments"
          @click="emit('comments')"
        >
          <span
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-50 transition-colors duration-75 group-hover/comment:bg-teal-50 dark:bg-neutral-800 dark:group-hover/comment:bg-teal-100/10"
          >
            <MessageCircle class="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <span class="ms-2 min-w-4.5 shrink-0 text-start text-neutral-900 dark:text-neutral-200">
            {{ formatNumber(post.commentCount) }}
          </span>
        </button>

        <div class="h-4 border-s border-neutral-200 dark:border-neutral-700" />

        <SaveButton :post-id="post.id" :post-title="post.title" variant="icon" size="md" />

        <div class="h-4 border-s border-neutral-200 dark:border-neutral-700" />

        <span
          v-if="!showBackToTop"
          class="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-semibold text-neutral-900 transition-colors hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-700"
          role="status"
          :aria-label="`Reading progress ${progress}%`"
          :title="`Reading progress ${progress}%`"
        >
          {{ progress }}%
        </span>
        <button
          v-else
          type="button"
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-50 text-neutral-700 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 dark:focus-visible:ring-offset-neutral-900"
          aria-label="Back to top"
          title="Back to top"
          @click="backToTop"
        >
          <ArrowUp class="h-[18px] w-[18px]" aria-hidden="true" />
        </button>
      </div>

      <div v-if="headings.length" ref="tocRoot" class="relative shrink-0">
        <div
          class="flex items-center justify-center rounded-full bg-white p-1.5 text-xs shadow-lg ring-1 ring-neutral-900/5 ring-offset-1 dark:bg-neutral-800 dark:ring-neutral-700 dark:ring-offset-neutral-600"
        >
          <button
            ref="tocButton"
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-50 text-neutral-700 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 dark:focus-visible:ring-offset-neutral-900"
            aria-haspopup="dialog"
            :aria-expanded="tocOpen"
            aria-controls="post-toc-panel"
            aria-label="Table of contents"
            title="Table of contents"
            @click="toggleToc"
          >
            <List class="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        </div>

        <div
          v-if="tocOpen"
          id="post-toc-panel"
          role="dialog"
          aria-labelledby="post-toc-title"
          class="nc-no-scrollbar absolute bottom-full end-0 mb-3 max-h-[min(70vh,600px)] w-[min(90vw,20rem)] overflow-y-auto rounded-xl bg-white p-4 shadow-xl ring-1 ring-black/5 sm:p-6 dark:bg-neutral-800 dark:ring-neutral-600"
        >
          <nav aria-label="Table of contents navigation">
            <h2 id="post-toc-title" class="text-sm font-semibold text-neutral-900 dark:text-white">
              On this page
            </h2>
            <ol class="mt-4 space-y-3 text-sm">
              <li v-for="heading in headings" :key="heading.id">
                <a
                  :href="`#${heading.id}`"
                  class="inline-flex gap-2 rounded text-neutral-700 transition hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-neutral-200 dark:hover:text-white"
                  :class="headingIndentClass(heading.level)"
                  @click.prevent="goToHeading(heading.id)"
                >
                  <span aria-hidden="true" class="shrink-0 self-center">→</span>
                  <span>{{ heading.text }}</span>
                </a>
              </li>
            </ol>
          </nav>
        </div>
      </div>
    </div>
  </div>
</template>
