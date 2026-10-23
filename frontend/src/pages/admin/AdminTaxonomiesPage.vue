<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  AlertTriangle,
  Edit2,
  FolderTree,
  Image as ImageIcon,
  Plus,
  Search,
  Tag as TagIcon,
  Trash2,
  Upload,
  X,
} from 'lucide-vue-next'
import { getDataSource } from '@/api'
import type { Category, CategoryInput, Tag, TagInput } from '@/api/types'
import { useUiStore } from '@/stores/ui'
import { useDocumentTitle } from '@/composables/useDocumentTitle'
import AdminNav from '@/components/admin/AdminNav.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import { categorySchema, firstError, tagSchema } from '@/lib/validation'

const ui = useUiStore()
const pageTitle = ref('Categories & Tags — Admin')
useDocumentTitle(pageTitle)

const activeTab = ref<'categories' | 'tags'>('categories')
const loading = ref(true)

// Categories state
const categories = ref<Category[]>([])
const categorySearch = ref('')
const categoryModalOpen = ref(false)
const editingCategoryId = ref<string | null>(null)
const categorySaving = ref(false)
const categoryForm = ref<CategoryInput>({
  name: '',
  slug: '',
  description: '',
  image: '',
  parentId: null,
})
const deleteCategoryModalOpen = ref(false)
const categoryToDelete = ref<Category | null>(null)
const categoryDeleting = ref(false)
const uploadingCategoryImage = ref(false)

// Tags state
const tags = ref<Tag[]>([])
const tagSearch = ref('')
const tagModalOpen = ref(false)
const editingTagId = ref<string | null>(null)
const tagSaving = ref(false)
const tagForm = ref<TagInput>({
  name: '',
  slug: '',
})
const deleteTagModalOpen = ref(false)
const tagToDelete = ref<Tag | null>(null)
const tagDeleting = ref(false)

async function loadData() {
  loading.value = true
  try {
    const [catList, tagList] = await Promise.all([
      getDataSource().listCategories(),
      getDataSource().listTags(),
    ])
    categories.value = catList
    tags.value = tagList
  } catch (err) {
    ui.notify(err instanceof Error ? err.message : 'Failed to load taxonomies.', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadData()
})

// Auto-slugify helper
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Filtered lists
const filteredCategories = computed(() => {
  const q = categorySearch.value.trim().toLowerCase()
  if (!q) return categories.value
  return categories.value.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.slug.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q)),
  )
})

const filteredTags = computed(() => {
  const q = tagSearch.value.trim().toLowerCase()
  if (!q) return tags.value
  return tags.value.filter(
    (t) => t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q),
  )
})

// Category Actions
function openCreateCategoryModal() {
  editingCategoryId.value = null
  categoryForm.value = {
    name: '',
    slug: '',
    description: '',
    image: '',
    parentId: null,
  }
  categoryModalOpen.value = true
}

function openEditCategoryModal(cat: Category) {
  editingCategoryId.value = cat.id
  categoryForm.value = {
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    description: cat.description || '',
    image: cat.image || '',
    parentId: cat.parentId || null,
  }
  categoryModalOpen.value = true
}

function onCategoryNameInput() {
  if (!editingCategoryId.value) {
    categoryForm.value.slug = slugify(categoryForm.value.name)
  }
}

async function handleCategoryImageUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    ui.notify('Please select an image file (PNG, JPG, WebP, SVG).', 'error')
    return
  }

  uploadingCategoryImage.value = true
  try {
    const res = await getDataSource().uploadFile(file)
    categoryForm.value.image = res.url
    ui.notify('Category image uploaded successfully!')
  } catch (err) {
    ui.notify(err instanceof Error ? err.message : 'Image upload failed.', 'error')
  } finally {
    uploadingCategoryImage.value = false
    target.value = ''
  }
}

async function saveCategorySubmit() {
  const parsed = categorySchema.safeParse(categoryForm.value)
  if (!parsed.success) {
    ui.notify(firstError(parsed.error), 'error')
    return
  }

  categorySaving.value = true
  try {
    const payload: CategoryInput = {
      name: categoryForm.value.name.trim(),
      slug: categoryForm.value.slug?.trim() || slugify(categoryForm.value.name),
      description: categoryForm.value.description?.trim() || '',
      image: categoryForm.value.image?.trim() || '',
      parentId: categoryForm.value.parentId || null,
    }

    if (editingCategoryId.value) {
      await getDataSource().updateCategory(editingCategoryId.value, payload)
      ui.notify(`Category "${payload.name}" updated successfully!`)
    } else {
      await getDataSource().createCategory(payload)
      ui.notify(`Category "${payload.name}" created successfully!`)
    }

    categoryModalOpen.value = false
    await loadData()
  } catch (err) {
    ui.notify(err instanceof Error ? err.message : 'Failed to save category.', 'error')
  } finally {
    categorySaving.value = false
  }
}

function confirmDeleteCategory(cat: Category) {
  categoryToDelete.value = cat
  deleteCategoryModalOpen.value = true
}

async function executeDeleteCategory() {
  if (!categoryToDelete.value) return
  categoryDeleting.value = true
  try {
    await getDataSource().deleteCategory(categoryToDelete.value.id)
    ui.notify(`Category "${categoryToDelete.value.name}" deleted successfully!`)
    deleteCategoryModalOpen.value = false
    categoryToDelete.value = null
    await loadData()
  } catch (err) {
    ui.notify(err instanceof Error ? err.message : 'Failed to delete category.', 'error')
  } finally {
    categoryDeleting.value = false
  }
}

// Tag Actions
function openCreateTagModal() {
  editingTagId.value = null
  tagForm.value = {
    name: '',
    slug: '',
  }
  tagModalOpen.value = true
}

function openEditTagModal(tag: Tag) {
  editingTagId.value = tag.id
  tagForm.value = {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
  }
  tagModalOpen.value = true
}

function onTagNameInput() {
  if (!editingTagId.value) {
    tagForm.value.slug = slugify(tagForm.value.name)
  }
}

async function saveTagSubmit() {
  const parsed = tagSchema.safeParse(tagForm.value)
  if (!parsed.success) {
    ui.notify(firstError(parsed.error), 'error')
    return
  }

  tagSaving.value = true
  try {
    const payload: TagInput = {
      name: tagForm.value.name.trim(),
      slug: tagForm.value.slug?.trim() || slugify(tagForm.value.name),
    }

    if (editingTagId.value) {
      await getDataSource().updateTag(editingTagId.value, payload)
      ui.notify(`Tag #${payload.name} updated successfully!`)
    } else {
      await getDataSource().createTag(payload)
      ui.notify(`Tag #${payload.name} created successfully!`)
    }

    tagModalOpen.value = false
    await loadData()
  } catch (err) {
    ui.notify(err instanceof Error ? err.message : 'Failed to save tag.', 'error')
  } finally {
    tagSaving.value = false
  }
}

function confirmDeleteTag(tag: Tag) {
  tagToDelete.value = tag
  deleteTagModalOpen.value = true
}

async function executeDeleteTag() {
  if (!tagToDelete.value) return
  tagDeleting.value = true
  try {
    await getDataSource().deleteTag(tagToDelete.value.id)
    ui.notify(`Tag #${tagToDelete.value.name} deleted successfully!`)
    deleteTagModalOpen.value = false
    tagToDelete.value = null
    await loadData()
  } catch (err) {
    ui.notify(err instanceof Error ? err.message : 'Failed to delete tag.', 'error')
  } finally {
    tagDeleting.value = false
  }
}
</script>

<template>
  <div class="page-shell space-y-8 pb-24">
    <!-- Admin Header Tabs -->
    <AdminNav />

    <!-- Top Headline & Action Bar -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl dark:text-neutral-100">
          Taxonomies & Classification 🏷️
        </h1>
        <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Manage editorial categories, subcategories, tags and topic hierarchies.
        </p>
      </div>

      <!-- Quick Action Buttons -->
      <div class="flex items-center gap-3">
        <BaseButton
          v-if="activeTab === 'categories'"
          variant="primary"
          class="gap-2"
          @click="openCreateCategoryModal"
        >
          <Plus class="h-4 w-4" />
          <span>New Category</span>
        </BaseButton>

        <BaseButton
          v-else
          variant="primary"
          class="gap-2"
          @click="openCreateTagModal"
        >
          <Plus class="h-4 w-4" />
          <span>New Tag</span>
        </BaseButton>
      </div>
    </div>

    <!-- Tab Filter Switcher -->
    <div class="flex border-b border-neutral-200 dark:border-neutral-800">
      <button
        type="button"
        class="flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition"
        :class="
          activeTab === 'categories'
            ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
            : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
        "
        @click="activeTab = 'categories'"
      >
        <FolderTree class="h-4 w-4" />
        <span>Categories</span>
        <span
          class="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
        >
          {{ categories.length }}
        </span>
      </button>

      <button
        type="button"
        class="flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition"
        :class="
          activeTab === 'tags'
            ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
            : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
        "
        @click="activeTab = 'tags'"
      >
        <TagIcon class="h-4 w-4" />
        <span>Tags</span>
        <span
          class="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
        >
          {{ tags.length }}
        </span>
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-20">
      <LoadingSpinner />
    </div>

    <!-- TAB 1: CATEGORIES -->
    <section v-else-if="activeTab === 'categories'" class="space-y-6">
      <!-- Search Input Bar -->
      <div class="flex items-center justify-between gap-4">
        <div class="relative w-full max-w-md">
          <Search class="absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            v-model="categorySearch"
            type="search"
            placeholder="Search categories by name, slug or description..."
            class="h-10 w-full rounded-2xl border border-neutral-200 bg-white ps-10 pe-4 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:ring-primary-900/40"
          />
        </div>
        <p class="text-xs text-neutral-500 dark:text-neutral-400">
          Showing {{ filteredCategories.length }} of {{ categories.length }} categories
        </p>
      </div>

      <!-- Categories Table -->
      <div
        class="overflow-hidden rounded-3xl border border-neutral-200/80 bg-white shadow-xs dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div class="overflow-x-auto">
          <table class="w-full text-start text-sm">
            <thead class="border-b border-neutral-200 bg-neutral-50/70 text-xs uppercase tracking-wider text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950/50 dark:text-neutral-400">
              <tr>
                <th scope="col" class="px-6 py-4 font-semibold">Category</th>
                <th scope="col" class="px-6 py-4 font-semibold">Slug</th>
                <th scope="col" class="px-6 py-4 font-semibold">Description</th>
                <th scope="col" class="px-6 py-4 font-semibold text-center">Stories</th>
                <th scope="col" class="px-6 py-4 font-semibold text-end">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-neutral-200 dark:divide-neutral-800">
              <tr
                v-for="cat in filteredCategories"
                :key="cat.id"
                class="transition hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40"
              >
                <!-- Category Info + Image Preview -->
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div
                      class="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/70 dark:border-neutral-700/60"
                    >
                      <img
                        v-if="cat.image"
                        :src="cat.image"
                        :alt="cat.name"
                        class="h-full w-full object-cover"
                        loading="lazy"
                      />
                      <div
                        v-else
                        class="flex h-full w-full items-center justify-center text-xs font-bold uppercase text-neutral-400"
                      >
                        {{ cat.name[0] }}
                      </div>
                    </div>
                    <div>
                      <RouterLink
                        :to="`/category/${cat.slug}`"
                        class="font-semibold text-neutral-900 hover:text-primary-600 dark:text-neutral-100 dark:hover:text-primary-400"
                      >
                        {{ cat.name }}
                      </RouterLink>
                      <span
                        v-if="cat.parentId"
                        class="ms-2 inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                      >
                        Subcategory
                      </span>
                    </div>
                  </div>
                </td>

                <!-- Slug -->
                <td class="px-6 py-4 font-mono text-xs text-neutral-500 dark:text-neutral-400">
                  /category/{{ cat.slug }}
                </td>

                <!-- Description -->
                <td class="px-6 py-4 max-w-xs truncate text-neutral-500 dark:text-neutral-400">
                  {{ cat.description || '—' }}
                </td>

                <!-- Post Count -->
                <td class="px-6 py-4 text-center font-medium text-neutral-700 dark:text-neutral-300">
                  <span class="inline-flex rounded-full bg-neutral-100 px-2.5 py-1 text-xs dark:bg-neutral-800">
                    {{ cat.postCount ?? 0 }}
                  </span>
                </td>

                <!-- Actions -->
                <td class="px-6 py-4 text-end">
                  <div class="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      class="flex h-8 w-8 items-center justify-center rounded-xl border border-neutral-200 text-neutral-600 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-primary-600 dark:hover:bg-primary-950/60 dark:hover:text-primary-300"
                      title="Edit Category"
                      @click="openEditCategoryModal(cat)"
                    >
                      <Edit2 class="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      class="flex h-8 w-8 items-center justify-center rounded-xl border border-neutral-200 text-neutral-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-rose-800 dark:hover:bg-rose-950/60 dark:hover:text-rose-400"
                      title="Delete Category"
                      @click="confirmDeleteCategory(cat)"
                    >
                      <Trash2 class="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>

              <tr v-if="!filteredCategories.length">
                <td colspan="5" class="py-12 text-center text-sm text-neutral-500 dark:text-neutral-400">
                  No categories found matching your query.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- TAB 2: TAGS -->
    <section v-else class="space-y-6">
      <!-- Search Input Bar -->
      <div class="flex items-center justify-between gap-4">
        <div class="relative w-full max-w-md">
          <Search class="absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            v-model="tagSearch"
            type="search"
            placeholder="Search tags by name or slug..."
            class="h-10 w-full rounded-2xl border border-neutral-200 bg-white ps-10 pe-4 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:ring-primary-900/40"
          />
        </div>
        <p class="text-xs text-neutral-500 dark:text-neutral-400">
          Showing {{ filteredTags.length }} of {{ tags.length }} tags
        </p>
      </div>

      <!-- Tags Grid Cards -->
      <div class="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <div
          v-for="tag in filteredTags"
          :key="tag.id"
          class="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-xs transition hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
        >
          <div class="min-w-0 flex-1">
            <RouterLink
              :to="`/tag/${tag.slug}`"
              class="block truncate font-semibold text-neutral-900 hover:text-primary-600 dark:text-neutral-100 dark:hover:text-primary-400"
            >
              #{{ tag.name }}
            </RouterLink>
            <p class="mt-0.5 truncate font-mono text-[11px] text-neutral-400">
              {{ tag.slug }} · {{ tag.postCount ?? 0 }} stories
            </p>
          </div>

          <div class="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              class="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-primary-600 dark:hover:bg-primary-950/60 dark:hover:text-primary-300"
              title="Edit Tag"
              @click="openEditTagModal(tag)"
            >
              <Edit2 class="h-3 w-3" />
            </button>
            <button
              type="button"
              class="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-rose-800 dark:hover:bg-rose-950/60 dark:hover:text-rose-400"
              title="Delete Tag"
              @click="confirmDeleteTag(tag)"
            >
              <Trash2 class="h-3 w-3" />
            </button>
          </div>
        </div>

        <div
          v-if="!filteredTags.length"
          class="col-span-full py-12 text-center text-sm text-neutral-500 dark:text-neutral-400"
        >
          No tags found matching your query.
        </div>
      </div>
    </section>

    <!-- MODAL: CATEGORY CREATE / EDIT -->
    <div
      v-if="categoryModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div
        class="w-full max-w-lg rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 max-h-[90vh] overflow-y-auto"
      >
        <div class="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <h2 class="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            {{ editingCategoryId ? 'Edit Category' : 'Create New Category' }}
          </h2>
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            @click="categoryModalOpen = false"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <form class="mt-5 space-y-4" @submit.prevent="saveCategorySubmit">
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
              Name *
            </label>
            <input
              v-model="categoryForm.name"
              type="text"
              required
              placeholder="e.g. Technology, Travel, Modern Art"
              class="mt-1 h-10 w-full rounded-2xl border border-neutral-200 bg-white px-3.5 text-sm text-neutral-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:ring-primary-900/40"
              @input="onCategoryNameInput"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
              Slug
            </label>
            <input
              v-model="categoryForm.slug"
              type="text"
              placeholder="e.g. technology"
              class="mt-1 h-10 w-full rounded-2xl border border-neutral-200 bg-white px-3.5 font-mono text-xs text-neutral-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:ring-primary-900/40"
            />
            <p class="mt-1 text-[11px] text-neutral-400">
              URL path: /category/{{ categoryForm.slug || 'category-name' }}
            </p>
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
              Description
            </label>
            <textarea
              v-model="categoryForm.description"
              rows="3"
              placeholder="Short editorial summary of what this category covers..."
              class="mt-1 w-full rounded-2xl border border-neutral-200 bg-white p-3 text-sm text-neutral-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:ring-primary-900/40"
            ></textarea>
          </div>

          <!-- Category Image Upload & Preview -->
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
              Cover Image
            </label>
            <div class="mt-2 flex items-center gap-4">
              <div
                class="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800"
              >
                <img
                  v-if="categoryForm.image"
                  :src="categoryForm.image"
                  alt="Preview"
                  class="h-full w-full object-cover"
                />
                <div
                  v-else
                  class="flex h-full w-full items-center justify-center text-neutral-400"
                >
                  <ImageIcon class="h-6 w-6" />
                </div>
              </div>

              <div class="flex-1 space-y-2">
                <input
                  v-model="categoryForm.image"
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  class="h-9 w-full rounded-xl border border-neutral-200 bg-white px-3 text-xs text-neutral-900 outline-none focus:border-primary-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
                <div>
                  <label
                    class="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                  >
                    <Upload class="h-3.5 w-3.5" />
                    <span>{{ uploadingCategoryImage ? 'Uploading...' : 'Upload Image' }}</span>
                    <input
                      type="file"
                      accept="image/*"
                      class="hidden"
                      :disabled="uploadingCategoryImage"
                      @change="handleCategoryImageUpload"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <!-- Parent Category -->
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
              Parent Category (Optional)
            </label>
            <select
              v-model="categoryForm.parentId"
              class="mt-1 h-10 w-full rounded-2xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none focus:border-primary-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            >
              <option :value="null">None (Top Level)</option>
              <option
                v-for="cat in categories.filter((c) => c.id !== editingCategoryId)"
                :key="cat.id"
                :value="cat.id"
              >
                {{ cat.name }}
              </option>
            </select>
          </div>

          <!-- Submit Buttons -->
          <div class="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <BaseButton
              type="button"
              variant="outline"
              @click="categoryModalOpen = false"
            >
              Cancel
            </BaseButton>
            <BaseButton
              type="submit"
              variant="primary"
              :disabled="categorySaving"
            >
              {{ categorySaving ? 'Saving...' : editingCategoryId ? 'Save Changes' : 'Create Category' }}
            </BaseButton>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL: DELETE CATEGORY CONFIRMATION -->
    <div
      v-if="deleteCategoryModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div
        class="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div class="flex items-center gap-3 text-rose-600 dark:text-rose-400">
          <AlertTriangle class="h-6 w-6" />
          <h2 class="text-lg font-bold">Delete Category?</h2>
        </div>
        <p class="mt-3 text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
          Are you sure you want to delete
          <strong class="font-semibold text-neutral-900 dark:text-white">
            "{{ categoryToDelete?.name }}"
          </strong>?
          Articles tagged with this category will not be deleted, but this category tag will be removed.
        </p>
        <div class="mt-6 flex items-center justify-end gap-3">
          <BaseButton
            type="button"
            variant="outline"
            @click="deleteCategoryModalOpen = false"
          >
            Cancel
          </BaseButton>
          <button
            type="button"
            class="inline-flex h-11 items-center justify-center rounded-2xl bg-rose-600 px-5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
            :disabled="categoryDeleting"
            @click="executeDeleteCategory"
          >
            {{ categoryDeleting ? 'Deleting...' : 'Delete Permanently' }}
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL: TAG CREATE / EDIT -->
    <div
      v-if="tagModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div
        class="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div class="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <h2 class="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            {{ editingTagId ? 'Edit Tag' : 'Create New Tag' }}
          </h2>
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            @click="tagModalOpen = false"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <form class="mt-5 space-y-4" @submit.prevent="saveTagSubmit">
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
              Tag Name *
            </label>
            <div class="relative mt-1">
              <span class="absolute start-3.5 top-1/2 -translate-y-1/2 font-bold text-neutral-400">#</span>
              <input
                v-model="tagForm.name"
                type="text"
                required
                placeholder="e.g. design, webdev, architecture"
                class="h-10 w-full rounded-2xl border border-neutral-200 bg-white ps-8 pe-3.5 text-sm text-neutral-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:ring-primary-900/40"
                @input="onTagNameInput"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
              Slug
            </label>
            <input
              v-model="tagForm.slug"
              type="text"
              placeholder="e.g. webdev"
              class="mt-1 h-10 w-full rounded-2xl border border-neutral-200 bg-white px-3.5 font-mono text-xs text-neutral-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:ring-primary-900/40"
            />
            <p class="mt-1 text-[11px] text-neutral-400">
              URL path: /tag/{{ tagForm.slug || 'tag-name' }}
            </p>
          </div>

          <div class="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <BaseButton
              type="button"
              variant="outline"
              @click="tagModalOpen = false"
            >
              Cancel
            </BaseButton>
            <BaseButton
              type="submit"
              variant="primary"
              :disabled="tagSaving"
            >
              {{ tagSaving ? 'Saving...' : editingTagId ? 'Save Changes' : 'Create Tag' }}
            </BaseButton>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL: DELETE TAG CONFIRMATION -->
    <div
      v-if="deleteTagModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div
        class="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div class="flex items-center gap-3 text-rose-600 dark:text-rose-400">
          <AlertTriangle class="h-6 w-6" />
          <h2 class="text-lg font-bold">Delete Tag?</h2>
        </div>
        <p class="mt-3 text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
          Are you sure you want to delete
          <strong class="font-semibold text-neutral-900 dark:text-white">
            "#{{ tagToDelete?.name }}"
          </strong>?
          Articles will keep their content, but this tag badge will be removed.
        </p>
        <div class="mt-6 flex items-center justify-end gap-3">
          <BaseButton
            type="button"
            variant="outline"
            @click="deleteTagModalOpen = false"
          >
            Cancel
          </BaseButton>
          <button
            type="button"
            class="inline-flex h-11 items-center justify-center rounded-2xl bg-rose-600 px-5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
            :disabled="tagDeleting"
            @click="executeDeleteTag"
          >
            {{ tagDeleting ? 'Deleting...' : 'Delete Permanently' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>