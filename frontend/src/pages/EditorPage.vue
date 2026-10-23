<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  Check,
  FileText,
  Globe,
  Headphones,
  Layers,
  Save,
  SlidersHorizontal,
  Upload,
  Video,
  X,
} from 'lucide-vue-next'
import { useDraftStore } from '@/stores/draft'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { getDataSource } from '@/api'
import type { Category, Post, PostType, Tag } from '@/api/types'
import { draftSchema, firstError } from '@/lib/validation'
import { sanitizeHtml, sanitizePlainText } from '@/lib/sanitize'
import {
  DEFAULT_ALLOWED_IMAGE_DOMAINS,
  extractDomain,
  isAllowedImageDomain,
} from '@/lib/image-domains'
import { canManagePost } from '@/lib/permissions'
import { useDocumentTitle } from '@/composables/useDocumentTitle'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import RichTextEditor from '@/components/editor/RichTextEditor.vue'
import PostImage from '@/components/ui/PostImage.vue'

const route = useRoute()
const router = useRouter()
const drafts = useDraftStore()
const auth = useAuthStore()
const ui = useUiStore()

const postId = computed(() =>
  typeof route.params.id === 'string' && route.params.id ? route.params.id : '',
)
const draftId = computed(() =>
  typeof route.query.draft === 'string' ? route.query.draft : '',
)

const existingDraft = computed(() =>
  drafts.drafts.find((item) => item.id === draftId.value),
)

const post = ref<Post | null>(null)
const loading = ref(false)

// Form fields
const title = ref('')
const excerpt = ref('')
const content = ref(
  '<p>Start writing here. Formatting, rich links, and responsive images are supported.</p>',
)
const postType = ref<PostType>('standard')
const postStyle = ref<'style1' | 'style2' | 'style3' | 'style4'>('style1')
const videoUrl = ref('')
const audioUrl = ref('')
const cover = ref(
  'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80',
)
const featured = ref(false)
const scheduleTime = ref('')
const showRightSidebar = ref(true)
const allowComments = ref(true)

const selectedCategoryIds = ref<string[]>([])
const selectedTagIds = ref<string[]>([])
const newTagName = ref('')

// Post Options Modal state
const showOptionsModal = ref(false)

// Available taxonomy
const categories = ref<Category[]>([])
const tags = ref<Tag[]>([])

const tab = ref<'write' | 'preview'>('write')
const error = ref('')
const publishing = ref(false)
const pageTitle = ref('New submission')
useDocumentTitle(pageTitle)

const sampleCovers = [
  'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80',
]

const uploadingCover = ref(false)
const allowedDomains = ref<string[]>([...DEFAULT_ALLOWED_IMAGE_DOMAINS])

async function onCoverUpload(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploadingCover.value = true
  try {
    const result = await getDataSource().uploadFile(file)
    cover.value = result.url
    ui.notify('Cover image uploaded.')
  } catch (err) {
    ui.notify(err instanceof Error ? err.message : 'Upload failed', 'error')
  } finally {
    uploadingCover.value = false
    input.value = ''
  }
}

onMounted(async () => {
  const source = getDataSource()
  loading.value = true
  try {
    const [categoryList, tagList, siteSettings] = await Promise.all([
      source.listCategories(),
      source.listTags(),
      source.getSiteSettings ? source.getSiteSettings() : Promise.resolve(null),
    ])
    categories.value = categoryList
    tags.value = tagList
    if (siteSettings?.allowedImageDomains?.length) {
      allowedDomains.value = siteSettings.allowedImageDomains
    }

    if (postId.value) {
      const fetched = await source.getPostById(postId.value)
      if (!fetched) {
        ui.notify('Post not found', 'error')
        void router.push({ name: 'dashboard' })
        return
      }
      if (!canManagePost(auth.user?.role, auth.user?.id, fetched.author.id)) {
        ui.notify('You do not have permission to edit this post.', 'error')
        void router.push({ name: 'dashboard' })
        return
      }
      post.value = fetched
      title.value = fetched.title
      excerpt.value = fetched.excerpt
      content.value = fetched.content
      postType.value = fetched.postType || 'standard'
      videoUrl.value = fetched.videoUrl || ''
      audioUrl.value = fetched.audioUrl || ''
      cover.value = fetched.cover
      featured.value = fetched.featured
      selectedCategoryIds.value = fetched.categories.map((c) => c.id)
      selectedTagIds.value = fetched.tags.map((t) => t.id)
      pageTitle.value = `Edit: ${fetched.title}`
    } else if (existingDraft.value) {
      title.value = existingDraft.value.title
      excerpt.value = existingDraft.value.excerpt
      content.value = existingDraft.value.content
      postType.value = existingDraft.value.postType || 'standard'
      videoUrl.value = existingDraft.value.videoUrl || ''
      audioUrl.value = existingDraft.value.audioUrl || ''
      cover.value = existingDraft.value.cover || sampleCovers[0]
      selectedCategoryIds.value = existingDraft.value.categoryIds || []
      selectedTagIds.value = existingDraft.value.tagIds || []
      pageTitle.value = `Draft: ${existingDraft.value.title || 'Untitled'}`
    } else if (categories.value.length) {
      selectedCategoryIds.value = [categories.value[0].id]
    }
  } catch (err) {
    ui.notify(err instanceof Error ? err.message : 'Error loading taxonomies', 'error')
  } finally {
    loading.value = false
  }
})

// Auto-save draft changes locally
watch(
  [title, excerpt, content, postType, selectedCategoryIds, selectedTagIds, cover, videoUrl, audioUrl],
  () => {
    if (postId.value) return
    if (!title.value.trim() && !content.value.trim()) return

    drafts.save({
      id: draftId.value || undefined,
      title: title.value,
      excerpt: excerpt.value,
      content: content.value,
      postType: postType.value,
      categoryIds: selectedCategoryIds.value,
      tagIds: selectedTagIds.value,
      cover: cover.value,
      videoUrl: videoUrl.value,
      audioUrl: audioUrl.value,
    })
  },
  { deep: true },
)

function toggleCategory(catId: string): void {
  const index = selectedCategoryIds.value.indexOf(catId)
  if (index >= 0) {
    if (selectedCategoryIds.value.length > 1) {
      selectedCategoryIds.value.splice(index, 1)
    }
  } else {
    selectedCategoryIds.value.push(catId)
  }
}

function toggleTag(tagId: string): void {
  const index = selectedTagIds.value.indexOf(tagId)
  if (index >= 0) {
    selectedTagIds.value.splice(index, 1)
  } else {
    if (selectedTagIds.value.length >= 5) {
      ui.notify('Maximum 5 tags allowed.', 'info')
      return
    }
    selectedTagIds.value.push(tagId)
  }
}

function removeTag(tagId: string): void {
  selectedTagIds.value = selectedTagIds.value.filter((id) => id !== tagId)
}

function onTagInputKeydown(e: KeyboardEvent): void {
  if (['Enter', ',', ' '].includes(e.key)) {
    e.preventDefault()
    addNewTag()
  }
}

function addNewTag(): void {
  const raw = newTagName.value.replace(/[,#]/g, '').trim()
  if (!raw) return
  if (selectedTagIds.value.length >= 5) {
    ui.notify('Maximum 5 tags allowed.', 'info')
    newTagName.value = ''
    return
  }
  const clean = sanitizePlainText(raw)
  const existing = tags.value.find(
    (t) => t.name.toLowerCase() === clean.toLowerCase() || t.slug.toLowerCase() === clean.toLowerCase(),
  )
  if (existing) {
    if (!selectedTagIds.value.includes(existing.id)) {
      selectedTagIds.value.push(existing.id)
    }
  } else {
    const newTag: Tag = {
      id: `tag_${Date.now()}`,
      name: clean,
      slug: clean.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      postCount: 1,
    }
    tags.value.push(newTag)
    selectedTagIds.value.push(newTag.id)
  }
  newTagName.value = ''
}

const sanitizedPreview = computed(() => sanitizeHtml(content.value))

function applyPostOptions(): void {
  showOptionsModal.value = false
  ui.notify('Post options applied!')
}

function saveLocalDraft(): void {
  error.value = ''
  const parsed = draftSchema.safeParse({
    title: title.value || 'Untitled draft',
    excerpt: excerpt.value,
    content: content.value,
    postType: postType.value,
    categoryIds: selectedCategoryIds.value,
    tagIds: selectedTagIds.value,
    cover: cover.value,
    videoUrl: videoUrl.value,
    audioUrl: audioUrl.value,
  })
  if (!parsed.success) {
    error.value = firstError(parsed.error)
    return
  }
  drafts.save({
    id: draftId.value || undefined,
    title: parsed.data.title,
    excerpt: parsed.data.excerpt,
    content: parsed.data.content,
    postType: postType.value,
    categoryIds: selectedCategoryIds.value,
    tagIds: selectedTagIds.value,
    cover: cover.value,
    videoUrl: videoUrl.value,
    audioUrl: audioUrl.value,
  })
  ui.notify('Draft saved.')
}

async function publishStory(): Promise<void> {
  error.value = ''
  if (cover.value && !isAllowedImageDomain(cover.value, allowedDomains.value)) {
    const domain = extractDomain(cover.value) || 'eksternal'
    error.value = `Domain gambar cover "${domain}" tidak diizinkan. Gunakan upload gambar atau domain yang diizinkan.`
    return
  }
  const parsed = draftSchema.safeParse({
    title: title.value,
    excerpt: excerpt.value,
    content: content.value,
    postType: postType.value,
    categoryIds: selectedCategoryIds.value,
    tagIds: selectedTagIds.value,
    cover: cover.value,
    videoUrl: videoUrl.value,
    audioUrl: audioUrl.value,
  })
  if (!parsed.success) {
    error.value = firstError(parsed.error)
    return
  }
  publishing.value = true
  try {
    if (postId.value && post.value) {
      const updated = await getDataSource().updatePost(post.value.id, {
        title: parsed.data.title,
        excerpt: parsed.data.excerpt,
        content: parsed.data.content,
        postType: postType.value,
        videoUrl: videoUrl.value || undefined,
        audioUrl: audioUrl.value || undefined,
        cover: cover.value,
        featured: featured.value,
        categoryIds: selectedCategoryIds.value,
        tagIds: selectedTagIds.value,
        status: 'published',
      })
      ui.notify('Story updated successfully!')
      void router.push({ name: 'post', params: { slug: updated.slug } })
    } else {
      const created = await getDataSource().createPost({
        title: parsed.data.title,
        excerpt: parsed.data.excerpt,
        content: parsed.data.content,
        postType: postType.value,
        videoUrl: videoUrl.value || undefined,
        audioUrl: audioUrl.value || undefined,
        cover: cover.value,
        featured: featured.value,
        categoryIds: selectedCategoryIds.value,
        tagIds: selectedTagIds.value,
        status: 'published',
      })
      if (existingDraft.value) {
        drafts.remove(existingDraft.value.id)
      }
      ui.notify('Story published!')
      void router.push({ name: 'post', params: { slug: created.slug } })
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to publish story.'
  } finally {
    publishing.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-neutral-950 pb-28">
    <div v-if="loading" class="flex justify-center py-28">
      <LoadingSpinner />
    </div>

    <div v-else>
      <!-- Top Action Bar (matching ncmaz-faust /submission header) -->
      <div
        class="sticky top-0 z-30 border-b border-neutral-200/80 bg-white/90 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-950/90"
      >
        <div class="mx-auto flex h-16 sm:h-20 max-w-5xl items-center justify-between px-4 sm:px-6">
          <!-- Left: Back to Home & Brand -->
          <div class="flex items-center gap-3">
            <RouterLink
              to="/"
              class="flex h-10 w-10 items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 transition"
              title="Back to home"
            >
              <ArrowLeft class="h-5 w-5" />
            </RouterLink>
            <div class="hidden sm:block">
              <span class="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
                {{ postId ? 'Editing Story' : 'Draft Autosaved' }}
              </span>
            </div>
          </div>

          <!-- Right: Actions -->
          <div class="flex items-center gap-2 sm:gap-3">
            <!-- Post Options Trigger (Hexagonal icon) -->
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 shadow-xs transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
              title="Post options"
              @click="showOptionsModal = true"
            >
              <SlidersHorizontal class="h-3.5 w-3.5 text-primary-600 dark:text-primary-400" />
              <span>Options</span>
              <span
                v-if="selectedCategoryIds.length"
                class="ms-1 rounded-full bg-primary-100 px-1.5 py-0.2 text-[10px] font-bold text-primary-700 dark:bg-primary-950 dark:text-primary-300"
              >
                {{ selectedCategoryIds.length }}
              </span>
            </button>

            <!-- Mode Toggle (Write / Preview) -->
            <div class="flex rounded-full bg-neutral-100 p-1 dark:bg-neutral-800">
              <button
                type="button"
                :class="[
                  'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                  tab === 'write'
                    ? 'bg-white text-neutral-900 shadow-xs dark:bg-neutral-900 dark:text-white'
                    : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white',
                ]"
                @click="tab = 'write'"
              >
                Write
              </button>
              <button
                type="button"
                :class="[
                  'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                  tab === 'preview'
                    ? 'bg-white text-neutral-900 shadow-xs dark:bg-neutral-900 dark:text-white'
                    : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white',
                ]"
                @click="tab = 'preview'"
              >
                Preview
              </button>
            </div>

            <!-- Save Draft Button -->
            <button
              type="button"
              class="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-4 py-2 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
              @click="saveLocalDraft"
            >
              <Save class="h-3.5 w-3.5" />
              Save draft
            </button>

            <!-- Publish Button -->
            <button
              type="button"
              :disabled="publishing"
              class="inline-flex items-center gap-1.5 rounded-full bg-primary-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-50"
              @click="publishStory"
            >
              <Globe class="h-3.5 w-3.5" />
              {{ publishing ? 'Publishing…' : postId ? 'Update' : 'Publish' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Main Canvas Container -->
      <main class="mx-auto max-w-4xl px-4 sm:px-6 pt-10 sm:pt-14 space-y-8">
        <!-- Error alert banner -->
        <div
          v-if="error"
          class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"
        >
          {{ error }}
        </div>

        <!-- Write Tab -->
        <div v-show="tab === 'write'" class="space-y-6">
          <!-- Title Input (Document Style) -->
          <div>
            <textarea
              v-model="title"
              rows="1"
              maxlength="140"
              placeholder="New post title here…"
              class="w-full resize-none border-none bg-transparent p-0 text-3xl font-bold leading-tight text-neutral-900 placeholder:text-neutral-300 focus:outline-none focus:ring-0 sm:text-4xl lg:text-5xl dark:text-neutral-100 dark:placeholder:text-neutral-600"
              @input="
                (e) => {
                  const target = e.target as HTMLTextAreaElement
                  target.style.height = 'auto'
                  target.style.height = target.scrollHeight + 'px'
                }
              "
            ></textarea>
          </div>

          <!-- Interactive Tags Bar -->
          <div class="flex flex-wrap items-center gap-2 border-b border-neutral-100 pb-4 dark:border-neutral-800">
            <span
              v-for="tagId in selectedTagIds"
              :key="tagId"
              class="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200"
            >
              <span># {{ tags.find((t) => t.id === tagId)?.name || tagId }}</span>
              <button
                type="button"
                class="ms-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
                title="Remove tag"
                @click="removeTag(tagId)"
              >
                <X class="h-3 w-3" />
              </button>
            </span>

            <!-- Tag input -->
            <div v-if="selectedTagIds.length < 5" class="relative flex items-center">
              <input
                v-model="newTagName"
                type="text"
                placeholder="+ Add tag (press enter)"
                class="h-8 rounded-full border-none bg-transparent px-3 text-xs text-neutral-600 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:text-neutral-300"
                @keydown="onTagInputKeydown"
              />
            </div>
          </div>

          <!-- Cover Image Widget / Banner -->
          <div class="relative overflow-hidden rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 p-4 dark:bg-neutral-900/30">
            <div v-if="cover" class="relative aspect-[16/8] sm:aspect-[16/7] w-full overflow-hidden rounded-2xl bg-neutral-950 mb-3">
              <PostImage :src="cover" :alt="title || 'Cover image'" aspect="h-full w-full object-cover" />
              <button
                type="button"
                class="absolute end-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white shadow-md hover:bg-black transition"
                title="Remove cover"
                @click="cover = ''"
              >
                <X class="h-4 w-4" />
              </button>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <label
                  class="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-white px-4 text-xs font-semibold text-neutral-700 shadow-xs ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-200 dark:ring-neutral-700 dark:hover:bg-neutral-700"
                >
                  <Upload class="h-3.5 w-3.5" />
                  <span>{{ uploadingCover ? 'Uploading…' : cover ? 'Change image' : 'Upload feature image' }}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/avif"
                    class="sr-only"
                    :disabled="uploadingCover"
                    @change="onCoverUpload"
                  />
                </label>

                <!-- Sample covers picker -->
                <button
                  type="button"
                  class="text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white"
                  @click="cover = sampleCovers[Math.floor(Math.random() * sampleCovers.length)]"
                >
                  Random sample
                </button>
              </div>

              <span class="text-[11px] text-neutral-400">
                1200×630 px recommended · Max 5MB
              </span>
            </div>
          </div>

          <!-- Rich Text Content Editor (Tiptap) -->
          <div class="pt-2">
            <RichTextEditor v-model="content" placeholder="Write your post content here…" />
          </div>
        </div>

        <!-- Preview Tab -->
        <div v-show="tab === 'preview'" class="space-y-6">
          <div class="border-b border-neutral-200 pb-6 dark:border-neutral-800">
            <div class="mb-3 flex flex-wrap gap-2">
              <span
                v-for="catId in selectedCategoryIds"
                :key="catId"
                class="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 dark:bg-primary-950 dark:text-primary-300"
              >
                {{ categories.find((c) => c.id === catId)?.name || 'Category' }}
              </span>
            </div>
            <h1 class="text-3xl font-bold text-neutral-900 sm:text-5xl dark:text-white leading-tight">
              {{ title || 'Untitled Story' }}
            </h1>
            <p v-if="excerpt" class="mt-4 text-base text-neutral-500 dark:text-neutral-300 leading-relaxed">
              {{ excerpt }}
            </p>
          </div>

          <div v-if="cover" class="aspect-[16/8] overflow-hidden rounded-3xl bg-neutral-900">
            <PostImage :src="cover" :alt="title" aspect="h-full w-full object-cover" />
          </div>

          <div class="prose-ncmaz" v-html="sanitizedPreview"></div>
        </div>
      </main>

      <!-- Post Options Modal (Matching Ncmaz Faust "Post options" dialog) -->
      <div
        v-if="showOptionsModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        @click.self="showOptionsModal = false"
      >
        <div
          class="relative w-full max-w-lg overflow-hidden rounded-[32px] bg-white p-6 shadow-2xl dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 max-h-[90vh] flex flex-col"
        >
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-neutral-100 pb-4 dark:border-neutral-800">
            <h3 class="text-lg font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <SlidersHorizontal class="h-4 w-4 text-primary-600" />
              <span>Post options</span>
            </h3>
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-white"
              @click="showOptionsModal = false"
            >
              <X class="h-4 w-4" />
            </button>
          </div>

          <!-- Body -->
          <div class="overflow-y-auto space-y-5 py-4 pe-1">
            <!-- Post Format -->
            <div>
              <label class="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                Post Format
              </label>
              <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button
                  type="button"
                  :class="[
                    'flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-xs font-semibold transition',
                    postType === 'standard'
                      ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-500 dark:bg-primary-950/60 dark:text-primary-300'
                      : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800',
                  ]"
                  @click="postType = 'standard'"
                >
                  <FileText class="h-4 w-4" />
                  Standard
                </button>
                <button
                  type="button"
                  :class="[
                    'flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-xs font-semibold transition',
                    postType === 'video'
                      ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-500 dark:bg-primary-950/60 dark:text-primary-300'
                      : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800',
                  ]"
                  @click="postType = 'video'"
                >
                  <Video class="h-4 w-4" />
                  Video
                </button>
                <button
                  type="button"
                  :class="[
                    'flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-xs font-semibold transition',
                    postType === 'audio'
                      ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-500 dark:bg-primary-950/60 dark:text-primary-300'
                      : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800',
                  ]"
                  @click="postType = 'audio'"
                >
                  <Headphones class="h-4 w-4" />
                  Audio
                </button>
                <button
                  type="button"
                  :class="[
                    'flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-xs font-semibold transition',
                    postType === 'gallery'
                      ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-500 dark:bg-primary-950/60 dark:text-primary-300'
                      : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800',
                  ]"
                  @click="postType = 'gallery'"
                >
                  <Layers class="h-4 w-4" />
                  Gallery
                </button>
              </div>
            </div>

            <!-- Post Style (Only applies to Standard) -->
            <div v-if="postType === 'standard'">
              <div class="flex items-center justify-between mb-2">
                <label class="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                  Post Layout Style
                </label>
                <span class="text-[11px] text-neutral-400">Standard format only</span>
              </div>
              <div class="grid grid-cols-4 gap-2">
                <button
                  v-for="s in ['style1', 'style2', 'style3', 'style4'] as const"
                  :key="s"
                  type="button"
                  :class="[
                    'rounded-xl border py-2 text-xs font-semibold capitalize transition',
                    postStyle === s
                      ? 'border-primary-600 bg-primary-50 text-primary-700 dark:border-primary-500 dark:bg-primary-950 dark:text-primary-300'
                      : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800',
                  ]"
                  @click="postStyle = s"
                >
                  {{ s.replace('style', 'Style ') }}
                </button>
              </div>
            </div>

            <!-- Video URL (if video) -->
            <div v-if="postType === 'video'">
              <label class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                Video URL (YouTube or Vimeo)
              </label>
              <input
                v-model="videoUrl"
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                class="h-10 w-full rounded-xl border border-neutral-300 bg-white px-3 text-xs text-neutral-900 focus:border-primary-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </div>

            <!-- Audio URL (if audio) -->
            <div v-if="postType === 'audio'">
              <label class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                Audio Stream URL (MP3 / SoundCloud)
              </label>
              <input
                v-model="audioUrl"
                type="url"
                placeholder="https://example.com/audio.mp3"
                class="h-10 w-full rounded-xl border border-neutral-300 bg-white px-3 text-xs text-neutral-900 focus:border-primary-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </div>

            <!-- Categories -->
            <div>
              <label class="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                Categories
              </label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="cat in categories"
                  :key="cat.id"
                  type="button"
                  :class="[
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition',
                    selectedCategoryIds.includes(cat.id)
                      ? 'bg-primary-600 text-white dark:bg-primary-500 dark:text-neutral-950'
                      : 'border border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800',
                  ]"
                  @click="toggleCategory(cat.id)"
                >
                  <Check v-if="selectedCategoryIds.includes(cat.id)" class="h-3 w-3" />
                  {{ cat.name }}
                </button>
              </div>
            </div>

            <!-- Tags -->
            <div>
              <label class="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                Tags (max 5)
              </label>
              <div class="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                <button
                  v-for="t in tags"
                  :key="t.id"
                  type="button"
                  :class="[
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition',
                    selectedTagIds.includes(t.id)
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700',
                  ]"
                  @click="toggleTag(t.id)"
                >
                  <Check v-if="selectedTagIds.includes(t.id)" class="h-3 w-3" />
                  #{{ t.name }}
                </button>
              </div>
            </div>

            <!-- Excerpt -->
            <div>
              <label class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                Post Excerpt
              </label>
              <textarea
                v-model="excerpt"
                rows="2"
                maxlength="300"
                placeholder="Brief summary for social cards and previews…"
                class="w-full rounded-xl border border-neutral-300 bg-white p-2.5 text-xs text-neutral-900 focus:border-primary-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              ></textarea>
            </div>

            <!-- Schedule Publication -->
            <div>
              <label class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                Schedule Time (UTC)
              </label>
              <input
                v-model="scheduleTime"
                type="datetime-local"
                class="h-10 w-full rounded-xl border border-neutral-300 bg-white px-3 text-xs text-neutral-900 focus:border-primary-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </div>

            <!-- Toggles (Sidebar & Comments) -->
            <div class="space-y-3 border-t border-neutral-100 pt-3 dark:border-neutral-800">
              <label class="flex items-center justify-between cursor-pointer">
                <span class="text-xs font-medium text-neutral-800 dark:text-neutral-200">Show right sidebar</span>
                <input
                  v-model="showRightSidebar"
                  type="checkbox"
                  class="h-4 w-4 rounded-sm text-primary-600 focus:ring-primary-500 border-neutral-300 dark:border-neutral-700"
                />
              </label>
              <label class="flex items-center justify-between cursor-pointer">
                <span class="text-xs font-medium text-neutral-800 dark:text-neutral-200">Allow reader comments</span>
                <input
                  v-model="allowComments"
                  type="checkbox"
                  class="h-4 w-4 rounded-sm text-primary-600 focus:ring-primary-500 border-neutral-300 dark:border-neutral-700"
                />
              </label>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between border-t border-neutral-100 pt-4 dark:border-neutral-800">
            <button
              type="button"
              class="text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white"
              @click="showOptionsModal = false"
            >
              Cancel
            </button>
            <button
              type="button"
              class="rounded-full bg-primary-600 px-5 py-2 text-xs font-semibold text-white hover:bg-primary-700 transition"
              @click="applyPostOptions"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
