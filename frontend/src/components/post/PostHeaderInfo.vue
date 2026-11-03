<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Ellipsis, Eye, MessageCircle, PenLine, Share2 } from 'lucide-vue-next'
import type { Post } from '@/api/types'
import { formatDate, formatNumber, initials } from '@/lib/format'
import { canManagePost } from '@/lib/permissions'
import { useAuthStore } from '@/stores/auth'
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

const metaClass = computed(() =>
  props.tone === 'on-image'
    ? 'text-white/80'
    : 'text-neutral-700 dark:text-neutral-300',
)

const countClass = computed(() =>
  props.tone === 'on-image'
    ? 'text-white'
    : 'text-neutral-900 dark:text-neutral-200',
)

const circleClass = computed(() =>
  props.tone === 'on-image'
    ? 'bg-white/10 text-white hover:bg-white/20'
    : 'bg-neutral-50 dark:bg-neutral-800',
)
</script>

<template>
  <div
    class="flex flex-wrap justify-between gap-5 sm:items-end"
    :class="tone === 'on-image' ? 'text-white dark:text-white' : ''"
  >
    <div
      class="flex shrink-0 flex-wrap items-center text-left text-base leading-none"
      :class="tone === 'on-image' ? 'text-white' : 'text-neutral-700 dark:text-neutral-200'"
    >
      <RouterLink
        :to="`/author/${post.author.username}`"
        class="flex items-center space-x-2 rtl:space-x-reverse"
      >
        <span
          class="relative inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold uppercase shadow-inner ring-1 ring-white sm:h-11 sm:w-11 dark:ring-neutral-900"
          :class="
            tone === 'on-image'
              ? 'bg-white/15 text-white'
              : 'bg-primary-100 text-neutral-100 dark:bg-primary-900/60'
          "
        >
          <img
            v-if="post.author.avatar"
            :src="post.author.avatar"
            :alt="post.author.name"
            class="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
          <span v-else class="text-xl">{{ initials(post.author.name) }}</span>
        </span>
      </RouterLink>

      <div class="ms-3">
        <div class="flex items-center">
          <RouterLink
            :to="`/author/${post.author.username}`"
            class="block font-semibold"
          >
            {{ post.author.name }}
          </RouterLink>
        </div>
        <div class="mt-[6px] flex-wrap text-xs" :class="metaClass">
          <time :datetime="post.createdAt">{{ formatDate(post.createdAt) }}</time>
          <span class="mx-2 font-semibold" aria-hidden="true">·</span>
          <span>{{ post.readingTime }} min read</span>
        </div>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2 sm:gap-2.5">
      <div class="flex items-center gap-2 sm:gap-2.5">
        <LikeButton :post="post" variant="compact" size="md" :tone="tone" />

        <button
          type="button"
          class="group/comment relative flex items-center text-xs leading-none transition-colors"
          :class="
            tone === 'on-image'
              ? 'text-white'
              : 'text-neutral-600 hover:text-teal-600 dark:text-neutral-200 dark:hover:text-teal-500'
          "
          :aria-label="`Comments (${formatNumber(post.commentCount)})`"
          title="Comments"
          @click="emit('comments')"
        >
          <span
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-75"
            :class="
              tone === 'on-image'
                ? circleClass
                : 'bg-neutral-50 group-hover/comment:bg-teal-50 dark:bg-neutral-800 dark:group-hover/comment:bg-teal-100/10'
            "
          >
            <MessageCircle class="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <span
            class="ms-2 min-w-4.5 shrink-0 text-start transition-colors duration-75"
            :class="countClass"
          >
            {{ formatNumber(post.commentCount) }}
          </span>
        </button>

        <div
          class="group/views relative flex items-center text-xs leading-none transition-colors"
          title="Views"
        >
          <span
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-75"
            :class="
              tone === 'on-image'
                ? circleClass
                : 'bg-neutral-50 group-hover/views:bg-indigo-50 dark:bg-neutral-800 dark:group-hover/views:bg-indigo-100/10'
            "
          >
            <Eye class="h-5 w-5" aria-hidden="true" />
          </span>
          <span
            class="ms-2 min-w-4.5 shrink-0 text-start transition-colors duration-75"
            :class="countClass"
            :aria-label="`Views: ${formatNumber(post.viewCount)}`"
          >
            {{ formatNumber(post.viewCount) }}
          </span>
        </div>
      </div>

      <div class="flex grow items-center justify-end gap-2 sm:gap-2.5">
        <div class="pr-1">
          <div
            class="h-5 border-s border-neutral-200 sm:h-6 dark:border-neutral-700"
            :class="tone === 'on-image' ? 'border-white/25' : ''"
          />
        </div>

        <SaveButton
          :post-id="post.id"
          :post-title="post.title"
          variant="icon"
          size="md"
          :tone="tone"
        />

        <button
          type="button"
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
          :class="
            tone === 'on-image'
              ? 'bg-white/10 text-white hover:bg-white/20'
              : 'bg-neutral-50 text-neutral-700 hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700'
          "
          aria-label="Share post"
          title="Share"
          @click="emit('share')"
        >
          <Share2 class="h-[18px] w-[18px]" aria-hidden="true" />
        </button>

        <div v-if="canEdit" ref="menuRoot" class="relative">
          <button
            ref="menuButton"
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
            :class="
              tone === 'on-image'
                ? 'bg-white/10 text-white hover:bg-white/20'
                : 'bg-neutral-50 text-neutral-500 hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
            "
            aria-label="More actions"
            aria-haspopup="menu"
            :aria-expanded="menuOpen"
            aria-controls="post-actions-menu"
            title="More"
            @click="toggleMenu"
          >
            <Ellipsis class="h-5 w-5" aria-hidden="true" />
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
