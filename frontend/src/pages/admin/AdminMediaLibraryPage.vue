<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Copy, ExternalLink, Image as ImageIcon, Search, Trash2, X } from 'lucide-vue-next'
import { getDataSource } from '@/api'
import type { MediaItem, OrphanScanResult } from '@/api/types'
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

const orphans = ref<OrphanScanResult | null>(null)
const scanning = ref(false)
const cleaning = ref(false)
const orphanError = ref('')

const orphanTotal = computed(() => orphans.value?.total ?? 0)
const orphanVariantCount = computed(
  () => orphans.value?.items.filter((item) => item.variant).length ?? 0,
)

async function scanOrphans(): Promise<void> {
  orphanError.value = ''
  scanning.value = true
  try {
    orphans.value = await getDataSource().listOrphanMedia()
  } catch (err) {
    orphanError.value = err instanceof Error ? err.message : 'Failed to scan orphan media.'
    orphans.value = null
  } finally {
    scanning.value = false
  }
}

async function cleanupOrphans(): Promise<void> {
  if (!orphans.value || orphans.value.total === 0) return
  const confirmed = window.confirm(
    `Hapus ${orphans.value.total} media yang tidak terpakai? Tindakan ini tidak dapat dibatalkan.`,
  )
  if (!confirmed) return
  orphanError.value = ''
  cleaning.value = true
  try {
    const result = await getDataSource().cleanupOrphanMedia()
    ui.notify(`${result.deleted} media yatim dihapus.`)
    orphans.value = null
    await load(true)
  } catch (err) {
    orphanError.value = err instanceof Error ? err.message : 'Failed to clean up orphan media.'
  } finally {
    cleaning.value = false
  }
}

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

const selected = ref<MediaItem | null>(null)
const deleting = ref(false)
const detailError = ref('')

function onDetailKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') closeDetail()
}

function openDetail(item: MediaItem): void {
  selected.value = item
  detailError.value = ''
  document.addEventListener('keydown', onDetailKeydown)
}

function closeDetail(): void {
  selected.value = null
  deleting.value = false
  detailError.value = ''
  document.removeEventListener('keydown', onDetailKeydown)
}

async function deleteSelected(): Promise<void> {
  const item = selected.value
  if (!item || deleting.value) return
  const refs = item.refCount ?? 0
  const message =
    refs > 0
      ? `Gambar ini dipakai di ${refs} tempat. Menghapusnya akan memutus referensi tersebut. Yakin hapus?`
      : 'Hapus gambar ini? Tindakan ini tidak dapat dibatalkan.'
  if (!window.confirm(message)) return

  deleting.value = true
  detailError.value = ''
  try {
    await getDataSource().deleteMedia(item.id)
    ui.notify('Gambar dihapus.')
    closeDetail()
    await load(true)
  } catch (err) {
    detailError.value = err instanceof Error ? err.message : 'Failed to delete media.'
  } finally {
    deleting.value = false
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
          Semua gambar upload dikelompokkan per tahun dan bulan. Klik gambar untuk melihat detail dan opsi hapus.
        </p>
      </div>
      <p class="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
        {{ totalItems }} media
      </p>
    </div>

    <div class="mt-5 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-sm font-bold text-neutral-900 dark:text-white">Media tidak terpakai</h2>
          <p class="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            Gambar yang tidak direferensikan oleh post, profil, halaman, kategori, atau pengaturan situs. Menghapusnya membebaskan penyimpanan.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            v-if="orphans === null"
            type="button"
            class="inline-flex h-9 items-center justify-center rounded-full border border-neutral-300 px-4 text-xs font-semibold text-neutral-800 transition hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800"
            :disabled="scanning"
            @click="scanOrphans"
          >
            {{ scanning ? 'Memeriksa…' : 'Periksa' }}
          </button>
          <template v-else>
            <span class="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
              {{ orphanTotal }} file yatim{{ orphanVariantCount > 0 ? ` (termasuk ${orphanVariantCount} varian)` : '' }}
            </span>
            <button
              type="button"
              class="inline-flex h-9 items-center justify-center rounded-full bg-rose-600 px-4 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
              :disabled="cleaning || orphanTotal === 0"
              @click="cleanupOrphans"
            >
              {{ cleaning ? 'Menghapus…' : 'Hapus semua' }}
            </button>
            <button
              type="button"
              class="inline-flex h-9 items-center justify-center rounded-full border border-neutral-300 px-3 text-xs font-semibold text-neutral-500 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
              @click="orphans = null"
            >
              Batal
            </button>
          </template>
        </div>
      </div>

      <div v-if="orphans && orphanTotal > 0" class="mt-3 flex flex-wrap gap-1.5">
        <span
          v-for="item in orphans.items.slice(0, 8)"
          :key="item.id"
          class="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
        >
          {{ mediaDisplayName(item.name) }}
        </span>
        <span v-if="orphanTotal > 8" class="text-[11px] text-neutral-400">
          + {{ orphanTotal - 8 }} lainnya
        </span>
      </div>
      <p
        v-if="orphans && orphanTotal === 0"
        class="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400"
      >
        Tidak ada media yatim. Semua gambar masih dipakai.
      </p>
      <p v-if="orphanError" class="mt-2 text-xs text-rose-600 dark:text-rose-400" role="alert">
        {{ orphanError }}
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
              <div
                class="relative aspect-square cursor-pointer overflow-hidden bg-neutral-100 dark:bg-neutral-800"
                role="button"
                tabindex="0"
                :aria-label="`Lihat detail ${mediaDisplayName(item.name)}`"
                @click="openDetail(item)"
                @keydown.enter="openDetail(item)"
                @keydown.space.prevent="openDetail(item)"
              >
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
                    @click.stop="copyUrl(item)"
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
                    @click.stop
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

  <div
    v-if="selected"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
    role="dialog"
    aria-modal="true"
    :aria-label="`Detail ${mediaDisplayName(selected.name)}`"
    @click.self="closeDetail"
  >
    <div
      class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div class="flex items-center justify-between border-b border-neutral-100 px-6 py-4 dark:border-neutral-800">
        <h2 class="text-lg font-bold text-neutral-900 dark:text-neutral-100">Detail Gambar</h2>
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          aria-label="Tutup detail"
          @click="closeDetail"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <div class="space-y-4 px-6 py-5">
        <div class="overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800">
          <img
            :src="selected.url"
            :alt="mediaDisplayName(selected.name)"
            class="max-h-72 w-full object-contain"
          />
        </div>

        <dl class="space-y-2 text-sm">
          <div class="flex items-start justify-between gap-4">
            <dt class="shrink-0 text-neutral-500 dark:text-neutral-400">Nama file</dt>
            <dd class="truncate font-mono text-xs text-neutral-900 dark:text-neutral-100" :title="selected.name">
              {{ selected.name }}
            </dd>
          </div>
          <div class="flex items-start justify-between gap-4">
            <dt class="shrink-0 text-neutral-500 dark:text-neutral-400">Diunggah</dt>
            <dd class="text-neutral-900 dark:text-neutral-100">{{ formatMediaDate(selected.createdAt) }}</dd>
          </div>
          <div class="flex items-start justify-between gap-4">
            <dt class="shrink-0 text-neutral-500 dark:text-neutral-400">Referensi</dt>
            <dd>
              <span
                class="rounded-full px-2 py-0.5 text-xs font-semibold"
                :class="(selected.refCount ?? 0) > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'"
              >
                {{ selected.refCount ?? 0 }} dipakai
              </span>
            </dd>
          </div>
          <div v-if="selected.ownerId" class="flex items-start justify-between gap-4">
            <dt class="shrink-0 text-neutral-500 dark:text-neutral-400">Pemilik</dt>
            <dd class="truncate font-mono text-xs text-neutral-900 dark:text-neutral-100">{{ selected.ownerId }}</dd>
          </div>
        </dl>

        <p
          v-if="(selected.refCount ?? 0) > 0"
          class="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
        >
          Gambar ini masih dipakai di {{ selected.refCount }} tempat. Menghapusnya akan membuat referensi tersebut rusak.
        </p>
        <p
          v-if="detailError"
          class="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
          role="alert"
        >
          {{ detailError }}
        </p>

        <div class="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            class="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-neutral-300 px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800"
            @click="copyUrl(selected)"
          >
            <Copy class="h-4 w-4" aria-hidden="true" />
            Salin URL
          </button>
          <a
            :href="selected.url"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-neutral-300 px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800"
          >
            <ExternalLink class="h-4 w-4" aria-hidden="true" />
            Buka
          </a>
          <button
            type="button"
            class="ms-auto inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
            :disabled="deleting"
            @click="deleteSelected"
          >
            <Trash2 class="h-4 w-4" aria-hidden="true" />
            {{ deleting ? 'Menghapus…' : 'Hapus' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
