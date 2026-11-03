<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Ellipsis, Eye, MessageCircle, PenLine, Share2 } from 'lucide-vue-next'
import type { Post } from '@/api/types'
import { formatDate, formatNumber } from '@/lib/format'
import { canManagePost } from '@/lib/permissions'
import { useAuthStore } from '@/stores/auth'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import LikeButton from './LikeButton.vue'
import SaveButton from './SaveButton.vue'

const props = withDefaults(
  defineProps<{
    post: Post
    tone?: 'default' | 'on-image'
  }>(),
  { tone: 'default' },
)

const emit = defineEmits<{
  comments: []
  share: []
}>()

const auth = useAuthStore()
const canEdit = computed(() =>
  canManagePost(auth.user?.role, auth.user?.id, props.post.author.id),
)

const menuOpen = ref(false)
const menuRoot = ref<HTMLElement | null>(null)
const menuButton = ref<HTMLButtonElement | null>(null)

function toggleMenu(): void {
  menuOpen.value = !menuOpen.value
}

function closeMenu(restoreFocus = false): void {
  menuOpen.value = false
  if (restoreFocus) menuButton.value?.focus()
}

function onPointerDown(event: PointerEvent): void {
  if (!menuOpen.value) return
  const target = event.target as Node | null
  if (target && menuRoot.value && !menuRoot.value.contains(target)) {
    closeMenu()
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && menuOpen.value) closeMenu(true)
}

onMounted(() => {
  document.addEventListener('pointerdown', onPointerDown)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown)
  document.removeEventListener('keydown', onKeydown)
})

const roundButtonClass = computed(() =>
  props.tone === 'on-image'
    ? 'bg-white/10 text-white hover:bg-white/20 dark:bg-white/10 focus-visible:ring-white/70'
    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 focus-visible:ring-primary-500',
)

const countClass = computed(() =>
  props.tone === 'on-image'
    ? 'text-white/90'
    : 'text-neutral-700 dark:text-neutral-200',
)
</script>

<template>
  <div
    class="flex flex-col items-start gap-5 sm:gap-8"
    :class="tone === 'on-image' ? 'text-white dark:text-white' : ''"
  >
    <RouterLink
      :to="`/author/${post.author.username}`"
      class="flex min-w-0 items-center gap-3"
    >
      <AppAvatar :src="post.author.avatar" :name="post.author.name" size="md" />
      <span class="min-w-0">
        <span
          class="block min-w-0 truncate text-lg font-bold leading-tight transition-colors sm:text-xl"
          :class="
            tone === 'on-image'
              ? 'text-white hover:text-white/80 dark:text-white dark:hover:text-white/80'
              : 'text-neutral-900 hover:text-primary-600 dark:text-neutral-100 dark:hover:text-primary-300'
          "
        >
          {{ post.author.name }}
        </span>
        <span
          class="mt-1 flex flex-wrap items-center text-sm leading-tight"
          :class="
            tone === 'on-image'
              ? 'text-white/80'
              : 'text-neutral-500 dark:text-neutral-400'
          "
        >
          <time :datetime="post.createdAt">{{ formatDate(post.createdAt) }}</time>
          <span class="mx-1.5" aria-hidden="true">·</span>
          <span>{{ post.readingTime }} min read</span>
        </span>
      </span>
    </RouterLink>

    <div class="flex flex-wrap items-center gap-4 sm:gap-6">
      <LikeButton :post="post" variant="compact" size="md" :tone="tone" />

      <div class="flex items-center gap-2 sm:gap-2.5">
        <button
          type="button"
          class="inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
          :class="roundButtonClass"
          :aria-label="`Comments (${formatNumber(post.commentCount)})`"
          @click="emit('comments')"
        >
          <MessageCircle class="h-[22px] w-[22px]" aria-hidden="true" />
        </button>
        <span class="text-sm font-semibold" :class="countClass">
          {{ formatNumber(post.commentCount) }}
        </span>
      </div>

      <div class="flex items-center gap-2 sm:gap-2.5" title="Views">
        <span
          class="inline-flex h-11 w-11 items-center justify-center rounded-full"
          :class="roundButtonClass"
          aria-hidden="true"
        >
          <Eye class="h-[22px] w-[22px]" aria-hidden="true" />
        </span>
        <span
          class="text-sm font-semibold"
          :class="countClass"
          :aria-label="`Views: ${formatNumber(post.viewCount)}`"
        >
          {{ formatNumber(post.viewCount) }}
        </span>
      </div>

      <div
        class="mx-1 h-6 border-s sm:mx-2"
        :class="
          tone === 'on-image'
            ? 'border-white/25'
            : 'border-neutral-200 dark:border-neutral-700'
        "
        aria-hidden="true"
      />

      <div class="flex items-center gap-2.5 sm:gap-3">
        <SaveButton
          :post-id="post.id"
          :post-title="post.title"
          variant="icon"
          size="md"
          :tone="tone"
        />

        <button
          type="button"
          class="inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
          :class="roundButtonClass"
          aria-label="Share post"
          title="Share"
          @click="emit('share')"
        >
          <Share2 class="h-[22px] w-[22px]" aria-hidden="true" />
        </button>

        <div v-if="canEdit" ref="menuRoot" class="relative">
          <button
            ref="menuButton"
            type="button"
            class="inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
            :class="roundButtonClass"
            aria-label="More actions"
            aria-haspopup="menu"
            :aria-expanded="menuOpen"
            aria-controls="post-actions-menu"
            @click="toggleMenu"
          >
            <Ellipsis class="h-[22px] w-[22px]" aria-hidden="true" />
          </button>

          <div
            v-if="menuOpen"
            id="post-actions-menu"
            role="menu"
            class="absolute end-0 z-30 w-44 rounded-xl border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
            :class="tone === 'on-image' ? 'bottom-full mb-2' : 'top-full mt-2'"
          >
            <RouterLink
              :to="`/editor/${post.id}`"
              role="menuitem"
              class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
              @click="menuOpen = false"
            >
              <PenLine class="h-4 w-4" aria-hidden="true" />
              Edit post
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
