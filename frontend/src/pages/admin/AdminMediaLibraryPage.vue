<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Copy, ExternalLink, Image as ImageIcon, Search } from 'lucide-vue-next'
import { getDataSource } from '@/api'
import type { MediaItem } from '@/api/types'
import { formatMediaDate, groupMediaByMonth, mediaDisplayName } from '@/lib/media'
import { useDocumentTitle } from '@/composables/useDocumentTitle'
import { useUiStore } from '@/stores/ui'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

const PER_PAGE = 48

const ui = useUiStore()
const pageTitle = ref('Media Library — Admin')
useDocumentTitle(pageTitle)

const items = ref<MediaItem[]>([])
const search = ref('')
const page = ref(1)
const totalPages = ref(1)
const totalItems = ref(0)
const loading = ref(true)
const loadingMore = ref(false)
const error = ref('')

const groups = computed(() => groupMediaByMonth(items.value))

let searchTimer: ReturnType<typeof setTimeout> | undefined

async function load(reset = false): Promise<void> {
  if (loadingMore.value) return
  const nextPage = reset ? 1 : page.value + 1
  if (reset) {
    loading.value = true
    error.value = ''
  } else {
    loadingMore.value = true
  }

  try {
    const result = await getDataSource().listMedia({
      page: nextPage,
      perPage: PER_PAGE,
      search: search.value,
    })
    items.value = reset ? result.items : [...items.value, ...result.items]
    page.value = result.page
    totalPages.value = result.totalPages
    totalItems.value = result.totalItems
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load media.'
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function onSearchInput(): void {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    void load(true)
  }, 350)
}

function fallbackCopy(text: string): void {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

async function copyUrl(item: MediaItem): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(item.url)
    } else {
      fallbackCopy(item.url)
    }
    ui.notify('Image URL copied.')
  } catch {
    ui.notify('Failed to copy the URL.', 'error')
  }
}

onMounted(() => {
  void load(true)
})

watch(search, onSearchInput)
</script>

<template>
  <div class="pb-10">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="min-w-0">
        <h1 class="text-xl font-black tracking-tight sm:text-2xl text-neutral-900 dark:text-white">
          Media Library
        </h1>
        <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Semua gambar upload dikelompokkan per tahun dan bulan. Klik untuk menyalin URL.
        </p>
      </div>
      <p class="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
        {{ totalItems }} media
      </p>
    </div>

    <div class="mt-5 max-w-md">
      <label for="media-search" class="sr-only">Search media</label>
      <div class="relative">
        <Search
          class="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
          aria-hidden="true"
        />
        <input
          id="media-search"
          v-model="search"
          type="search"
          placeholder="Cari nama file…"
          class="w-full rounded-2xl border-neutral-300 bg-white py-2.5 pe-4 ps-9 text-sm text-neutral-900 focus:border-primary-400 focus:ring-primary-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900"
        />
      </div>
    </div>

    <div
      v-if="error"
      class="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
      role="alert"
    >
      {{ error }}
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <LoadingSpinner />
    </div>

    <EmptyState
      v-else-if="items.length === 0"
      class="mt-6"
      title="Belum ada media"
      :description="
        search ? `Tidak ada media yang cocok dengan “${search}”.` : 'Upload gambar dari editor atau halaman profil untuk mulai mengisi pustaka.'
      "
    />

    <div v-else class="mt-8 space-y-10">
      <section v-for="year in groups" :key="year.year" :aria-labelledby="`media-year-${year.year}`">
        <div class="flex items-baseline justify-between gap-4 border-b border-neutral-200 pb-2 dark:border-neutral-800">
          <h2
            :id="`media-year-${year.year}`"
            class="text-xl font-black tracking-tight sm:text-2xl text-neutral-900 dark:text-white"
          >
            {{ year.label }}
          </h2>
          <span class="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            {{ year.total }} file
          </span>
        </div>

        <div
          v-for="month in year.months"
          :key="month.key"
          class="mt-6"
          :aria-labelledby="`media-month-${month.key}`"
        >
          <div class="mb-3 flex items-center justify-between gap-4">
            <h3
              :id="`media-month-${month.key}`"
              class="text-sm font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300"
            >
              {{ month.label }}
            </h3>
            <span class="text-xs text-neutral-400">{{ month.items.length }} file</span>
          </div>

          <ul class="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
            <li
              v-for="item in month.items"
              :key="item.id"
              class="group overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div class="relative aspect-square overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                <img
                  :src="item.url"
                  :alt="mediaDisplayName(item.name)"
                  loading="lazy"
                  decoding="async"
                  class="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
                <div
                  class="absolute inset-0 flex items-center justify-center gap-2 bg-neutral-950/60 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100"
                >
                  <button
                    type="button"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-neutral-800 transition hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    :title="`Copy URL: ${item.name}`"
                    :aria-label="`Copy URL ${item.name}`"
                    @click="copyUrl(item)"
                  >
                    <Copy class="h-4 w-4" aria-hidden="true" />
                  </button>
                  <a
                    :href="item.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-neutral-800 transition hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    :title="`Open ${item.name}`"
                    :aria-label="`Open ${item.name} in a new tab`"
                  >
                    <ExternalLink class="h-4 w-4" aria-hidden="true" />
                  </a>
                </div>
              </div>
              <div class="flex items-start gap-2 px-3 py-2.5">
                <ImageIcon class="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
                <div class="min-w-0">
                  <p class="truncate text-xs font-semibold text-neutral-800 dark:text-neutral-100" :title="item.name">
                    {{ mediaDisplayName(item.name) }}
                  </p>
                  <p class="mt-0.5 text-[11px] text-neutral-400">
                    {{ formatMediaDate(item.createdAt) }}
                  </p>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <div v-if="page < totalPages" class="flex justify-center pt-2">
        <button
          type="button"
          class="inline-flex h-11 w-full items-center justify-center rounded-full border border-neutral-300 px-6 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 disabled:opacity-50 sm:w-auto dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800"
          :disabled="loadingMore"
          @click="load(false)"
        >
          {{ loadingMore ? 'Memuat…' : 'Muat lebih banyak' }}
        </button>
      </div>
    </div>
  </div>
</template>
