<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Clock, Eye, Link2, PenLine, Share2, X } from 'lucide-vue-next'
import { Facebook, Linkedin, MessageCircle, Send, Twitter } from 'lucide-vue-next'
import type { Category, Comment, Post, Tag } from '@/api/types'
import { getDataSource } from '@/api'
import { formatDate, formatNumber, getErrorMessage } from '@/lib/format'
import { sanitizeHtml } from '@/lib/sanitize'
import { getEmbedUrl } from '@/lib/video'
import { canManagePost } from '@/lib/permissions'
import { useAuthStore } from '@/stores/auth'
import { useDocumentTitle } from '@/composables/useDocumentTitle'
import { useUiStore } from '@/stores/ui'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import CategoryBadgeList from '@/components/post/CategoryBadgeList.vue'
import TagBadge from '@/components/post/TagBadge.vue'
import LikeButton from '@/components/post/LikeButton.vue'
import SaveButton from '@/components/post/SaveButton.vue'
import PostCard from '@/components/post/PostCard.vue'

import CommentList from '@/components/comments/CommentList.vue'
import CommentForm from '@/components/comments/CommentForm.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'

const route = useRoute()
const ui = useUiStore()
const auth = useAuthStore()
const slug = computed(() => String(route.params.slug ?? ''))
const post = ref<Post | null>(null)
const comments = ref<Comment[]>([])
const related = ref<Post[]>([])
const categories = ref<Category[]>([])
const tags = ref<Tag[]>([])
const loading = ref(true)
const error = ref('')
const title = ref('Post')
const shareOpen = ref(false)
useDocumentTitle(title)

const cleanContent = computed(() => sanitizeHtml(post.value?.content ?? ''))
const videoEmbedUrl = computed(() =>
  post.value?.postType === 'video' ? getEmbedUrl(post.value.videoUrl) : null,
)

// Layout style is picked in the editor (standard posts only).
const postStyle = computed(() => {
  const current = post.value
  if (!current || (current.postType && current.postType !== 'standard')) return 'style1'
  return current.postStyle ?? 'style1'
})
const isWideStyle = computed(() => postStyle.value === 'style2')
const isMagazineStyle = computed(() => postStyle.value === 'style3')
const isHeroStyle = computed(() => postStyle.value === 'style4')
const isCenteredStyle = computed(() => postStyle.value === 'style1')
const contentWidthClass = computed(() => (isWideStyle.value ? 'max-w-5xl' : 'max-w-3xl'))
const shareUrl = computed(() =>
  typeof window === 'undefined' ? '' : window.location.href,
)

const twitterShareUrl = computed(() =>
  `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl.value)}&text=${encodeURIComponent(post.value?.title ?? '')}`,
)
const facebookShareUrl = computed(() =>
  `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl.value)}`,
)
const linkedinShareUrl = computed(() =>
  `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl.value)}`,
)
const whatsappShareUrl = computed(() =>
  `https://wa.me/?text=${encodeURIComponent(`${post.value?.title ?? ''} ${shareUrl.value}`)}`,
)
const telegramShareUrl = computed(() =>
  `https://t.me/share/url?url=${encodeURIComponent(shareUrl.value)}&text=${encodeURIComponent(post.value?.title ?? '')}`,
)

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  post.value = null
  comments.value = []
  related.value = []
  const source = getDataSource()
  try {
    const found = await source.getPostBySlug(slug.value)
    if (!found) {
      title.value = 'Post not found'
      loading.value = false
      return
    }
    post.value = found
    title.value = found.title

    const [commentList, relatedPage, categoryList, tagList] = await Promise.all([
      source.listComments(found.id),
      source.listPosts({
        page: 1,
        perPage: 4,
        sort: '-createdAt',
        filter: { categorySlug: found.categories[0]?.slug },
      }),
      source.listCategories(),
      source.listTags(),
    ])
    comments.value = commentList
    related.value = relatedPage.items.filter((item) => item.id !== found.id).slice(0, 3)
    categories.value = categoryList
    tags.value = tagList
  } catch (err) {
    error.value = getErrorMessage(err)
  } finally {
    loading.value = false
  }
}

watch(slug, load, { immediate: true })

function addComment(comment: Comment): void {
  comments.value = [...comments.value, comment]
  if (post.value) {
    post.value = { ...post.value, commentCount: comments.value.length }
  }
}

async function deleteComment(commentId: string): Promise<void> {
  if (!confirm('Are you sure you want to delete this comment?')) return
  try {
    await getDataSource().deleteComment(commentId)
    comments.value = comments.value.filter((c) => c.id !== commentId)
    if (post.value) {
      post.value = { ...post.value, commentCount: comments.value.length }
    }
    ui.notify('Comment removed.')
  } catch (err) {
    ui.notify(getErrorMessage(err), 'error')
  }
}

function openShare(): void {
  shareOpen.value = true
}

function closeShare(): void {
  shareOpen.value = false
}

async function copyLink(): Promise<void> {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    ui.notify('Link copied to your clipboard.')
    closeShare()
  } catch {
    ui.notify('Could not copy the link.', 'error')
  }
}
</script>

<template>
  <div class="page-shell pb-20">
    <div v-if="loading" class="flex justify-center py-24">
      <LoadingSpinner />
    </div>

    <p
      v-else-if="error"
      class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"
    >
      {{ error }}
    </p>

    <EmptyState
      v-else-if="!post"
      title="Post not found"
      description="This post may have been moved, unpublished, or never existed."
    >
      <RouterLink
        to="/"
        class="inline-flex h-11 items-center rounded-full bg-primary-600 px-5 text-sm font-semibold text-white"
      >
        Back home
      </RouterLink>
    </EmptyState>

    <template v-else>
      <nav class="mb-6 flex flex-wrap items-center gap-2 text-xs font-medium text-neutral-400">
        <RouterLink to="/" class="hover:text-primary-600 dark:hover:text-primary-300">Home</RouterLink>
        <span>/</span>
        <RouterLink
          v-if="post.categories[0]"
          :to="`/category/${post.categories[0].slug}`"
          class="hover:text-primary-600 dark:hover:text-primary-300"
        >
          {{ post.categories[0].name }}
        </RouterLink>
        <span>/</span>
        <span class="line-clamp-1 text-neutral-500 dark:text-neutral-400">{{ post.title }}</span>
      </nav>

      <!-- Style 4: full-bleed hero with overlay title -->
      <div
        v-if="isHeroStyle && post.cover"
        class="relative mt-2 overflow-hidden rounded-[2rem] ring-1 ring-neutral-200 dark:ring-neutral-800"
      >
        <img :src="post.cover" :alt="post.title" class="h-[360px] w-full object-cover sm:h-[480px]" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent"></div>
        <div class="absolute inset-x-0 bottom-0 p-6 sm:p-10">
          <CategoryBadgeList :categories="post.categories" />
          <h1 class="mt-4 max-w-4xl text-balance text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
            {{ post.title }}
          </h1>
          <p class="mt-3 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">
            {{ post.excerpt }}
          </p>
          <div class="mt-5 flex flex-wrap items-center gap-4 text-xs font-medium text-white/80">
            <RouterLink :to="`/author/${post.author.username}`" class="font-semibold text-white hover:underline">
              {{ post.author.name }}
            </RouterLink>
            <span>·</span>
            <span>{{ formatDate(post.createdAt) }}</span>
            <span>·</span>
            <span>{{ post.readingTime }} min read</span>
          </div>
        </div>
      </div>

      <header
        v-if="!isHeroStyle"
        :class="['mx-auto', isWideStyle ? 'max-w-5xl' : 'max-w-4xl', isCenteredStyle ? 'text-center' : 'text-start']"
      >
        <div :class="['flex', isCenteredStyle ? 'justify-center' : 'justify-start']">
          <CategoryBadgeList :categories="post.categories" />
        </div>
        <h1
          class="mt-5 text-balance text-3xl font-bold leading-tight tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl dark:text-white"
        >
          {{ post.title }}
        </h1>
        <p
          :class="[
            'mt-5 text-base leading-relaxed text-neutral-500 sm:text-lg dark:text-neutral-400',
            isCenteredStyle ? 'mx-auto max-w-3xl' : 'max-w-3xl',
          ]"
        >
          {{ post.excerpt }}
        </p>

        <div :class="['mt-7 flex flex-wrap items-center gap-5', isCenteredStyle ? 'justify-center' : 'justify-start']">
          <div class="flex items-center gap-3">
            <AppAvatar :src="post.author.avatar" :name="post.author.name" size="md" />
            <div class="text-start text-sm">
              <RouterLink
                :to="`/author/${post.author.username}`"
                class="font-semibold text-neutral-900 hover:text-primary-600 dark:text-white dark:hover:text-primary-300"
              >
                {{ post.author.name }}
              </RouterLink>
              <p class="text-xs text-neutral-500 dark:text-neutral-400">
                {{ formatDate(post.createdAt) }}
              </p>
            </div>
          </div>
          <span class="h-8 w-px bg-neutral-200 dark:bg-neutral-800"></span>
          <span class="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
            <Clock class="h-4 w-4" aria-hidden="true" />
            {{ post.readingTime }} min read
          </span>
          <span class="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
            <Eye class="h-4 w-4" aria-hidden="true" />
            {{ formatNumber(post.viewCount) }} views
          </span>
        </div>
      </header>

      <div
        :class="[
          'mt-7 flex flex-wrap items-center gap-2',
          isCenteredStyle || isHeroStyle ? 'justify-center' : 'justify-start',
        ]"
      >
        <RouterLink
          v-if="canManagePost(auth.user?.role, auth.user?.id, post.author.id)"
          :to="`/editor/${post.id}`"
          class="inline-flex h-10 items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          <PenLine class="h-4 w-4" aria-hidden="true" />
          Edit post
        </RouterLink>
        <LikeButton :post="post" />
        <SaveButton :post-id="post.id" :post-title="post.title" show-label />
        <button
          type="button"
          class="inline-flex h-10 items-center gap-2 rounded-full border border-neutral-200 px-4 text-sm font-semibold text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
          aria-label="Share post"
          @click="openShare"
        >
          <Share2 class="h-4 w-4" aria-hidden="true" />
          Share
        </button>
      </div>

      <!-- Styles 2 & 3 show the cover as a wide banner -->
      <div
        v-if="(isWideStyle || isMagazineStyle) && post.cover"
        :class="['mt-8 overflow-hidden rounded-[2rem] ring-1 ring-neutral-200 dark:ring-neutral-800', isWideStyle ? 'mx-auto max-w-5xl' : '']"
      >
        <img
          :src="post.cover"
          :alt="post.title"
          class="h-[280px] w-full object-cover sm:h-[400px]"
        />
      </div>

      <div v-if="post.postType === 'video' && videoEmbedUrl" class="mx-auto mt-10 max-w-5xl overflow-hidden rounded-[2rem] shadow-xl ring-1 ring-neutral-200 dark:ring-neutral-800">
        <div class="aspect-[16/9] w-full bg-black">
          <iframe
            :src="videoEmbedUrl"
            :title="post.title"
            class="h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
          ></iframe>
        </div>
      </div>

      <div v-else-if="post.postType === 'video' && post.videoUrl" class="mx-auto mt-10 max-w-5xl overflow-hidden rounded-[2rem] shadow-xl ring-1 ring-neutral-200 dark:ring-neutral-800">
        <div class="aspect-[16/9] w-full bg-black">
          <video :src="post.videoUrl" controls class="h-full w-full object-cover"></video>
        </div>
      </div>

      <!-- Style 3: content + sticky sidebar -->
      <div :class="isMagazineStyle ? 'mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]' : ''">
        <div>
          <article
            :class="[
              'prose prose-neutral dark:prose-invert',
              isMagazineStyle ? 'mt-0 max-w-none' : ['mt-10 mx-auto', contentWidthClass],
            ]"
            :data-post-style="postStyle"
            v-html="cleanContent"
          ></article>

          <div
            v-if="post.tags?.length"
            :class="['mt-8 flex flex-wrap gap-2', isMagazineStyle ? '' : ['mx-auto', contentWidthClass]]"
          >
            <TagBadge v-for="tag in post.tags" :key="tag.id" :tag="tag" />
          </div>
        </div>

        <aside v-if="isMagazineStyle" class="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div class="rounded-3xl border border-neutral-200 p-5 dark:border-neutral-800">
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
              Written by
            </p>
            <div class="mt-3 flex items-center gap-3">
              <AppAvatar :src="post.author.avatar" :name="post.author.name" size="md" />
              <div>
                <RouterLink
                  :to="`/author/${post.author.username}`"
                  class="text-sm font-bold text-neutral-900 hover:text-primary-600 dark:text-white dark:hover:text-primary-300"
                >
                  {{ post.author.name }}
                </RouterLink>
                <p class="text-xs text-neutral-500 dark:text-neutral-400">
                  {{ formatDate(post.createdAt) }}
                </p>
              </div>
            </div>
            <div class="mt-4 flex flex-wrap items-center gap-2">
              <LikeButton :post="post" />
              <SaveButton :post-id="post.id" :post-title="post.title" show-label />
            </div>
            <button
              type="button"
              class="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-full border border-neutral-200 text-xs font-semibold text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
              @click="openShare"
            >
              <Share2 class="h-4 w-4" aria-hidden="true" />
              Share
            </button>
          </div>

          <div class="rounded-3xl border border-neutral-200 p-5 dark:border-neutral-800">
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
              Post details
            </p>
            <p class="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
              {{ post.readingTime }} min read · {{ formatNumber(post.viewCount) }} views
            </p>
            <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              {{ formatNumber(post.commentCount) }} comments
            </p>
          </div>
        </aside>
      </div>

      <div
        v-if="!isMagazineStyle"
        class="mt-10 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-neutral-200 p-5 dark:border-neutral-800"
      >
        <div class="flex items-center gap-3">
          <AppAvatar :src="post.author.avatar" :name="post.author.name" size="md" />
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
              Written by
            </p>
            <RouterLink
              :to="`/author/${post.author.username}`"
              class="text-sm font-bold text-neutral-900 hover:text-primary-600 dark:text-white dark:hover:text-primary-300"
            >
              {{ post.author.name }}
            </RouterLink>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <LikeButton :post="post" />
          <SaveButton :post-id="post.id" :post-title="post.title" show-label />
        </div>
      </div>

      <div class="mt-12">
        <CommentList :comments="comments" @delete="deleteComment" />
        <div class="mt-8">
          <CommentForm :post-id="post.id" @created="addComment" />
        </div>
      </div>
    </template>

    <section v-if="related.length" class="mt-16">
      <div class="mb-6 flex items-end justify-between">
        <h2 class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Keep reading
        </h2>
        <RouterLink
          v-if="post?.categories?.[0]"
          :to="`/category/${post.categories[0].slug}`"
          class="text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-300"
        >
          More in {{ post.categories[0].name }}
        </RouterLink>
      </div>
      <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <PostCard v-for="item in related" :key="item.id" :post="item" />
      </div>
    </section>
  </div>

  <Teleport to="body">
    <div
      v-if="shareOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Share post"
      @click.self="closeShare"
      @keydown.esc="closeShare"
    >
      <div class="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 shadow-float dark:border-neutral-800 dark:bg-neutral-950">
        <div class="flex items-center justify-between gap-3">
          <h2 class="text-lg font-bold text-neutral-900 dark:text-white">Share this post</h2>
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Close share"
            @click="closeShare"
          >
            <X class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <a
            :href="twitterShareUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-neutral-200 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900"
          >
            <Twitter class="h-4 w-4" aria-hidden="true" />
            X
          </a>
          <a
            :href="facebookShareUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-neutral-200 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900"
          >
            <Facebook class="h-4 w-4" aria-hidden="true" />
            Facebook
          </a>
          <a
            :href="linkedinShareUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-neutral-200 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900"
          >
            <Linkedin class="h-4 w-4" aria-hidden="true" />
            LinkedIn
          </a>
          <a
            :href="whatsappShareUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-neutral-200 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900"
          >
            <MessageCircle class="h-4 w-4" aria-hidden="true" />
            WhatsApp
          </a>
          <a
            :href="telegramShareUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-neutral-200 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900"
          >
            <Send class="h-4 w-4" aria-hidden="true" />
            Telegram
          </a>
          <button
            type="button"
            class="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 text-sm font-semibold text-white transition hover:bg-primary-700"
            @click="copyLink"
          >
            <Link2 class="h-4 w-4" aria-hidden="true" />
            Copy link
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
