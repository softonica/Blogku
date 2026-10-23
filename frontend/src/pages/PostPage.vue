<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Clock, Eye, Headphones, Link2, PenLine } from 'lucide-vue-next'
import type { Category, Comment, Post, Tag } from '@/api/types'
import { getDataSource } from '@/api'
import { formatDate, formatNumber, getErrorMessage } from '@/lib/format'
import { sanitizeHtml } from '@/lib/sanitize'
import { getEmbedUrl } from '@/lib/video'
import { canManagePost } from '@/lib/permissions'
import { useAuthStore } from '@/stores/auth'
import { useDocumentTitle } from '@/composables/useDocumentTitle'
import { useUiStore } from '@/stores/ui'
import PostImage from '@/components/ui/PostImage.vue'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import CategoryBadgeList from '@/components/post/CategoryBadgeList.vue'
import TagBadge from '@/components/post/TagBadge.vue'
import LikeButton from '@/components/post/LikeButton.vue'
import SaveButton from '@/components/post/SaveButton.vue'
import PostCard from '@/components/post/PostCard.vue'
import AuthorCard from '@/components/widgets/AuthorCard.vue'
import SidebarCategories from '@/components/widgets/SidebarCategories.vue'
import SidebarTags from '@/components/widgets/SidebarTags.vue'
import SidebarNewsletter from '@/components/widgets/SidebarNewsletter.vue'
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
const title = ref('Story')
useDocumentTitle(title)

const cleanContent = computed(() => sanitizeHtml(post.value?.content ?? ''))
const videoEmbedUrl = computed(() =>
  post.value?.postType === 'video' ? getEmbedUrl(post.value.videoUrl) : null,
)
const shareUrl = computed(() =>
  typeof window === 'undefined' ? '' : window.location.href,
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
      title.value = 'Story not found'
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

async function copyLink(): Promise<void> {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    ui.notify('Link copied to your clipboard.')
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
      title="Story not found"
      description="This story may have been moved, unpublished, or never existed."
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

      <header class="mx-auto max-w-4xl text-center">
        <div class="flex justify-center">
          <CategoryBadgeList :categories="post.categories" />
        </div>
        <h1
          class="mt-5 text-balance text-3xl font-bold leading-tight tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl dark:text-white"
        >
          {{ post.title }}
        </h1>
        <p
          class="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-neutral-500 sm:text-lg dark:text-neutral-400"
        >
          {{ post.excerpt }}
        </p>

        <div class="mt-7 flex flex-wrap items-center justify-center gap-5">
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

        <div class="mt-7 flex flex-wrap items-center justify-center gap-2">
          <RouterLink
            v-if="canManagePost(auth.user?.role, auth.user?.id, post.author.id)"
            :to="`/editor/${post.id}`"
            class="inline-flex h-10 items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            <PenLine class="h-4 w-4" aria-hidden="true" />
            Edit story
          </RouterLink>
          <LikeButton :post="post" />
          <SaveButton :post-id="post.id" :post-title="post.title" show-label />
          <button
            type="button"
            class="inline-flex h-10 items-center gap-2 rounded-full border border-neutral-200 px-4 text-sm font-semibold text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
            @click="copyLink"
          >
            <Link2 class="h-4 w-4" aria-hidden="true" />
            Copy link
          </button>
        </div>
      </header>

      <!-- Video embed (YouTube / Vimeo) -->
      <div
        v-if="post.postType === 'video' && videoEmbedUrl"
        class="mx-auto mt-10 max-w-5xl overflow-hidden rounded-[2rem] shadow-xl ring-1 ring-neutral-200 dark:ring-neutral-800"
      >
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

      <!-- Direct Video file -->
      <div
        v-else-if="post.postType === 'video' && post.videoUrl"
        class="mx-auto mt-10 max-w-5xl overflow-hidden rounded-[2rem] shadow-xl ring-1 ring-neutral-200 dark:ring-neutral-800"
      >
        <div class="aspect-[16/9] w-full bg-black">
          <video
            :src="post.videoUrl"
            controls
            class="h-full w-full object-cover"
          ></video>
        </div>
      </div>

      <!-- Audio Story / Podcast -->
      <div
        v-else-if="post.postType === 'audio' && post.audioUrl"
        class="mx-auto mt-10 max-w-5xl overflow-hidden rounded-[2rem] bg-neutral-900 shadow-xl ring-1 ring-neutral-200 dark:ring-neutral-800"
      >
        <div class="relative">
          <PostImage
            :src="post.cover"
            :alt="post.title"
            aspect="aspect-[16/9]"
            sizes="(max-width: 1024px) 100vw, 1024px"
            priority
          />
          <div
            class="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent"
          ></div>
          <div class="absolute inset-x-4 bottom-4 sm:inset-x-8 sm:bottom-8">
            <div
              class="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/95 p-4 shadow-xl backdrop-blur-md dark:bg-neutral-900/95 sm:p-5"
            >
              <div class="flex items-center gap-3">
                <div
                  class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white"
                >
                  <Headphones class="h-5 w-5" aria-hidden="true" />
                </div>
                <div class="min-w-0 flex-1">
                  <p
                    class="truncate text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400"
                  >
                    Audio Story / Podcast
                  </p>
                  <p class="truncate text-sm font-semibold text-neutral-900 dark:text-white">
                    {{ post.title }}
                  </p>
                </div>
              </div>
              <audio
                :src="post.audioUrl"
                controls
                preload="metadata"
                class="w-full focus:outline-none"
              ></audio>
            </div>
          </div>
        </div>
      </div>

      <!-- Standard Image Cover -->
      <div v-else class="mx-auto mt-10 max-w-5xl overflow-hidden rounded-[2rem]">
        <PostImage
          :src="post.cover"
          :alt="post.title"
          aspect="aspect-[16/9]"
          sizes="(max-width: 1024px) 100vw, 1024px"
          priority
        />
      </div>

      <div class="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div class="min-w-0">
          <div class="prose-ncmaz" v-html="cleanContent"></div>

          <div class="mt-8 flex flex-wrap gap-2">
            <TagBadge v-for="tag in post.tags" :key="tag.id" :tag="tag" />
          </div>

          <div class="mt-10 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-neutral-200 p-5 dark:border-neutral-800">
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
        </div>

        <aside class="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <AuthorCard :author="post.author" compact />
          <SidebarCategories :categories="categories" />
          <SidebarTags :tags="tags" />
          <SidebarNewsletter />
        </aside>
      </div>

      <section v-if="related.length" class="mt-16">
        <div class="mb-6 flex items-end justify-between">
          <h2 class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Keep reading
          </h2>
          <RouterLink
            v-if="post.categories[0]"
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
    </template>
  </div>
</template>
