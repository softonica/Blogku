<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Image as ImageIcon, Plus, Save, ShieldCheck, X } from 'lucide-vue-next'
import { getDataSource } from '@/api'
import type { EditorSettings } from '@/api/types'
import { DEFAULT_EDITOR_SETTINGS } from '@/lib/editor-defaults'
import { DEFAULT_ALLOWED_IMAGE_DOMAINS, normalizeDomain } from '@/lib/image-domains'
import {
  ABSOLUTE_MAX_IMAGE_PIXELS,
  ABSOLUTE_MAX_IMAGE_SIDE,
  ABSOLUTE_MAX_UPLOAD_BYTES,
  IMAGE_VARIANT_WIDTHS,
} from '@/lib/imageMeta'
import { useUiStore } from '@/stores/ui'
import { useDocumentTitle } from '@/composables/useDocumentTitle'
import { useRateLimit } from '@/composables/useRateLimit'
import { resetImageSettingsCache } from '@/composables/useImageUpload'
import BaseButton from '@/components/ui/BaseButton.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'

const ui = useUiStore()
const { retryAfter, isLimited, start: startRateLimit } = useRateLimit()
const pageTitle = ref('Media Settings — Admin')
useDocumentTitle(pageTitle)

const loading = ref(true)
const saving = ref(false)
const saved = ref(false)
const settings = ref<EditorSettings>({ ...DEFAULT_EDITOR_SETTINGS })
const domains = ref<string[]>([...DEFAULT_ALLOWED_IMAGE_DOMAINS])
const newDomain = ref('')

const maxUploadMb = computed(() => {
  const bytes = Number(settings.value.maxImageUploadSize) || 0
  if (bytes <= 0) return 'Tanpa batas (maksimum absolut 25 MB)'
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
})

const absoluteLimits = computed(
  () =>
    `${ABSOLUTE_MAX_IMAGE_SIDE}px / ${ABSOLUTE_MAX_IMAGE_PIXELS / 1_000_000}MP / ${
      ABSOLUTE_MAX_UPLOAD_BYTES / 1024 / 1024
    }MB`,
)

onMounted(async () => {
  const [editorResult, siteResult] = await Promise.allSettled([
    getDataSource().getEditorSettings(),
    getDataSource().getSiteSettings(),
  ])

  if (editorResult.status === 'fulfilled') {
    settings.value = editorResult.value
  } else {
    ui.notify(
      editorResult.reason instanceof Error
        ? editorResult.reason.message
        : 'Failed to load media settings.',
      'error',
    )
  }

  if (siteResult.status === 'fulfilled') {
    const list = siteResult.value.allowedImageDomains
    domains.value = list && list.length ? [...list] : [...DEFAULT_ALLOWED_IMAGE_DOMAINS]
  } else {
    ui.notify(
      siteResult.reason instanceof Error
        ? siteResult.reason.message
        : 'Failed to load allowed image domains.',
      'error',
    )
  }

  loading.value = false
})

function addDomain(): void {
  const domain = normalizeDomain(newDomain.value)
  if (!domain) {
    ui.notify('Enter a valid domain, e.g. cdn.example.com', 'error')
    return
  }
  if (!domains.value.includes(domain)) {
    domains.value = [...domains.value, domain]
    ui.notify(`Domain "${domain}" added.`)
  }
  newDomain.value = ''
}

function removeDomain(domain: string): void {
  domains.value = domains.value.filter((item) => item !== domain)
  ui.notify(`Domain "${domain}" removed.`)
}

async function save(): Promise<void> {
  saving.value = true
  saved.value = false
  try {
    const maxBytes = Math.max(
      0,
      Math.floor(Number(settings.value.maxImageUploadSize) || 0),
    )
    const maxDimension = Math.min(
      4096,
      Math.max(256, Math.floor(Number(settings.value.imageMaxDimension) || 2048)),
    )
    const quality = Math.min(
      1,
      Math.max(0.1, Math.round((Number(settings.value.imageQuality) || 0.8) * 100) / 100),
    )

    await getDataSource().updateEditorSettings({
      maxImageUploadSize: maxBytes,
      imageMaxDimension: maxDimension,
      imageQuality: quality,
    })
    await getDataSource().updateSiteSettings({ allowedImageDomains: domains.value })

    settings.value = {
      ...settings.value,
      maxImageUploadSize: maxBytes,
      imageMaxDimension: maxDimension,
      imageQuality: quality,
    }
    resetImageSettingsCache()
    saved.value = true
    ui.notify('Media settings saved.')
  } catch (err) {
    startRateLimit(err)
    ui.notify(err instanceof Error ? err.message : 'Failed to save media settings.', 'error')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="pb-10">
    <div v-if="loading" class="flex justify-center py-20">
      <LoadingSpinner />
    </div>

    <form v-else class="mx-auto max-w-3xl space-y-6" @submit.prevent="save">
      <div
        class="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-8 dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div class="flex items-start gap-3">
          <span
            class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300"
          >
            <ImageIcon class="h-5 w-5" aria-hidden="true" />
          </span>
          <div class="min-w-0">
            <h2 class="text-lg font-bold text-neutral-900 sm:text-xl dark:text-white">
              Media Settings
            </h2>
            <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Atur batas upload, kualitas gambar, dan domain gambar eksternal. Setiap
              gambar otomatis di-encode ke WebP dalam tiga varian.
            </p>
          </div>
        </div>

        <div class="mt-6 space-y-5">
          <div>
            <label
              for="media-max-upload"
              class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400"
            >
              Batas ukuran upload (bytes)
            </label>
            <input
              id="media-max-upload"
              v-model.number="settings.maxImageUploadSize"
              type="number"
              min="0"
              step="1024"
              inputmode="numeric"
              class="w-full rounded-2xl border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:border-primary-400 focus:ring-primary-200 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900"
            />
            <p class="mt-1 text-xs text-neutral-400">
              {{ maxUploadMb }} · 0 = tanpa batas (tetap dibatasi
              {{ ABSOLUTE_MAX_UPLOAD_BYTES / 1024 / 1024 }} MB absolut). cth: 2097152 =
              2MB
            </p>
          </div>

          <div class="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                for="media-max-dimension"
                class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400"
              >
                Maks dimensi gambar (px)
              </label>
              <input
                id="media-max-dimension"
                v-model.number="settings.imageMaxDimension"
                type="number"
                min="256"
                max="4096"
                step="1"
                inputmode="numeric"
                class="w-full rounded-2xl border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:border-primary-400 focus:ring-primary-200 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900"
              />
              <p class="mt-1 text-xs text-neutral-400">
                Sisi terpanjang varian full. Rentang 256–4096, default 2048.
              </p>
            </div>

            <div>
              <label
                for="media-quality"
                class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400"
              >
                Kualitas WebP
              </label>
              <div class="flex items-center gap-3">
                <input
                  id="media-quality"
                  v-model.number="settings.imageQuality"
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  class="h-2 min-w-0 flex-1 cursor-pointer accent-primary-600"
                />
                <span
                  class="shrink-0 rounded-lg bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-700 tabular-nums dark:bg-neutral-800 dark:text-neutral-200"
                >
                  {{ Math.round(settings.imageQuality * 100) }}%
                </span>
              </div>
              <p class="mt-1 text-xs text-neutral-400">
                Semakin tinggi kualitas, semakin besar file. Default 80%.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div
        class="rounded-3xl border border-neutral-200 bg-white p-5 sm:p-8 dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div class="flex items-start gap-3">
          <span
            class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-300"
          >
            <ShieldCheck class="h-5 w-5" aria-hidden="true" />
          </span>
          <div class="min-w-0">
            <h3 class="text-base font-bold text-neutral-900 dark:text-white">
              Allowed External Image Domains
            </h3>
            <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Hanya URL gambar dari domain terdaftar yang boleh dipakai sebagai cover,
              avatar, atau gambar artikel. Upload lokal dan hasil pipeline selalu
              diizinkan.
            </p>
          </div>
        </div>

        <ul v-if="domains.length" class="mt-4 flex flex-wrap gap-2" aria-label="Allowed image domains">
          <li
            v-for="domain in domains"
            :key="domain"
            class="inline-flex max-w-full items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-100 py-1 ps-3 pe-1 text-xs font-semibold text-neutral-800 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
          >
            <span class="truncate">{{ domain }}</span>
            <button
              type="button"
              :title="`Remove ${domain}`"
              :aria-label="`Remove ${domain}`"
              class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-300 hover:text-neutral-900 dark:hover:bg-neutral-700 dark:hover:text-white"
              @click="removeDomain(domain)"
            >
              <X class="h-3 w-3" aria-hidden="true" />
            </button>
          </li>
        </ul>
        <p v-else class="mt-4 text-xs text-neutral-400">
          Belum ada domain. Tambahkan domain agar gambar eksternal dapat dipakai.
        </p>

        <div class="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <label for="media-new-domain" class="sr-only">Add image domain</label>
          <input
            id="media-new-domain"
            v-model="newDomain"
            type="text"
            placeholder="e.g. cdn.example.com"
            autocomplete="off"
            autocapitalize="none"
            spellcheck="false"
            class="h-10 w-full min-w-0 rounded-xl border-neutral-300 bg-white px-3 text-sm text-neutral-900 focus:border-primary-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white sm:max-w-xs"
            @keydown.enter.prevent="addDomain"
          />
          <button
            type="button"
            class="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-neutral-900 px-4 text-xs font-semibold text-white transition hover:bg-neutral-800 sm:w-auto dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100"
            @click="addDomain"
          >
            <Plus class="h-3.5 w-3.5" aria-hidden="true" />
            Add Domain
          </button>
        </div>
      </div>

      <div
        class="rounded-3xl border border-neutral-200 bg-neutral-50 p-5 sm:p-8 dark:border-neutral-800 dark:bg-neutral-900/60"
      >
        <div class="flex items-start gap-3">
          <span
            class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
          >
            <ShieldCheck class="h-5 w-5" aria-hidden="true" />
          </span>
          <div class="min-w-0">
            <h3 class="text-base font-bold text-neutral-900 dark:text-white">
              Cara kerja pipeline gambar
            </h3>
            <ul class="mt-3 space-y-1.5 text-sm text-neutral-600 dark:text-neutral-300">
              <li>Format diterima: JPEG, PNG, WebP, GIF, AVIF. SVG ditolak.</li>
              <li>
                Varian otomatis: thumb {{ IMAGE_VARIANT_WIDTHS.thumb }}px · medium
                {{ IMAGE_VARIANT_WIDTHS.medium }}px · full ≤
                {{ settings.imageMaxDimension }}px (tanpa upscale).
              </li>
              <li>GIF animasi di-upload apa adanya (tanpa konversi WebP).</li>
              <li>
                File asli tidak disimpan: hanya hasil re-encode WebP, sehingga
                metadata/payload ikut terbuang.
              </li>
              <li>
                Batas absolut keamanan: {{ absoluteLimits }} (sisi / piksel / ukuran
                file).
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div
        class="flex flex-col gap-3 border-t border-neutral-200 pt-5 sm:flex-row sm:items-center dark:border-neutral-800"
      >
        <BaseButton
          type="submit"
          :disabled="saving || isLimited"
          class="w-full sm:w-auto"
        >
          <Save class="h-4 w-4" aria-hidden="true" />
          <span>
            {{
              saving
                ? 'Saving…'
                : saved
                  ? 'Saved'
                  : 'Save media settings'
            }}
          </span>
        </BaseButton>
        <span v-if="saved" class="text-sm font-medium text-emerald-600 dark:text-emerald-400">
          Saved.
        </span>
        <span v-if="isLimited" class="text-sm text-rose-600 dark:text-rose-400">
          Terlalu banyak percobaan. Coba lagi dalam {{ retryAfter }}s.
        </span>
      </div>
    </form>
  </div>
</template>
