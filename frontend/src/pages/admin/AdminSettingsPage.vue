<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  CheckCircle2,
  FolderTree,
  HardDrive,
  Image as ImageIcon,
  Plus,
  Save,
  Shield,
  Upload,
  X,
} from 'lucide-vue-next'
import { getDataSource } from '@/api'
import type { SiteSettings } from '@/api/types'
import { useUiStore } from '@/stores/ui'
import { useDocumentTitle } from '@/composables/useDocumentTitle'
import AdminNav from '@/components/admin/AdminNav.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import { DEFAULT_ALLOWED_IMAGE_DOMAINS } from '@/lib/image-domains'

const ui = useUiStore()
const pageTitle = ref('Site Settings — Admin')
useDocumentTitle(pageTitle)

const loading = ref(true)
const saving = ref(false)
const saved = ref(false)
const uploadingLogo = ref(false)
const uploadingFavicon = ref(false)
const newDomain = ref('')

const settings = ref<SiteSettings>({
  siteName: '',
  siteDescription: '',
  contactEmail: '',
  allowRegistration: true,
  footerText: '',
  logo: '',
  logoDark: '',
  favicon: '/favicon.ico',
  allowedImageDomains: [...DEFAULT_ALLOWED_IMAGE_DOMAINS],
})

onMounted(async () => {
  try {
    const data = await getDataSource().getSiteSettings()
    settings.value = {
      ...data,
      allowedImageDomains:
        data.allowedImageDomains && data.allowedImageDomains.length
          ? [...data.allowedImageDomains]
          : [...DEFAULT_ALLOWED_IMAGE_DOMAINS],
    }
  } catch (err) {
    ui.notify(err instanceof Error ? err.message : 'Failed to load settings.', 'error')
  } finally {
    loading.value = false
  }
})

function addDomain(): void {
  const dom = newDomain.value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
  if (!dom) return
  if (!settings.value.allowedImageDomains) {
    settings.value.allowedImageDomains = []
  }
  if (!settings.value.allowedImageDomains.includes(dom)) {
    settings.value.allowedImageDomains.push(dom)
    ui.notify(`Domain "${dom}" added to allowed external image sources.`)
  }
  newDomain.value = ''
}

function removeDomain(dom: string): void {
  if (!settings.value.allowedImageDomains) return
  settings.value.allowedImageDomains = settings.value.allowedImageDomains.filter(
    (d) => d !== dom,
  )
  ui.notify(`Domain "${dom}" removed.`)
}

async function onLogoUpload(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploadingLogo.value = true
  try {
    const result = await getDataSource().uploadFile(file)
    settings.value.logo = result.url
    ui.notify('Logo uploaded successfully.')
  } catch (err) {
    ui.notify(err instanceof Error ? err.message : 'Failed to upload logo.', 'error')
  } finally {
    uploadingLogo.value = false
    input.value = ''
  }
}

async function onFaviconUpload(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploadingFavicon.value = true
  try {
    const result = await getDataSource().uploadFile(file)
    settings.value.favicon = result.url
    ui.notify('Favicon uploaded successfully.')
  } catch (err) {
    ui.notify(err instanceof Error ? err.message : 'Failed to upload favicon.', 'error')
  } finally {
    uploadingFavicon.value = false
    input.value = ''
  }
}

async function save(): Promise<void> {
  saving.value = true
  try {
    const updated = await getDataSource().updateSiteSettings(settings.value)
    settings.value = { ...updated }
    saved.value = true
    ui.notify('Site settings saved successfully.')
    setTimeout(() => {
      saved.value = false
    }, 2500)
  } catch (err) {
    ui.notify(err instanceof Error ? err.message : 'Failed to save settings.', 'error')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="page-shell pb-20">
    <div class="mx-auto max-w-4xl space-y-8">
      <AdminNav />

      <!-- Quick Link Banner to Taxonomies -->
      <div
        class="flex flex-col gap-3 rounded-2xl border border-neutral-200/80 bg-neutral-50/70 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800 dark:bg-neutral-900/60"
      >
        <div class="flex items-center gap-3">
          <FolderTree class="h-5 w-5 text-primary-600 dark:text-primary-400 shrink-0" />
          <div>
            <h2 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Manage Editorial Categories & Tags
            </h2>
            <p class="text-xs text-neutral-500 dark:text-neutral-400">
              Create, edit, or delete categories and tag taxonomies in the dedicated portal.
            </p>
          </div>
        </div>
        <RouterLink
          to="/admin/taxonomies"
          class="inline-flex shrink-0 items-center justify-center gap-1 rounded-xl bg-primary-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-primary-500 dark:bg-primary-500 dark:text-neutral-950 dark:hover:bg-primary-400"
        >
          Manage Taxonomies →
        </RouterLink>
      </div>

      <header class="mb-8">
        <h1 class="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl dark:text-white">
          Site Settings
        </h1>
        <p class="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Global site parameters, branding, media rules, and storage targets.
        </p>
      </header>

      <div v-if="loading" class="flex justify-center py-20">
        <LoadingSpinner />
      </div>

      <form
        v-else
        class="space-y-8 rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8 dark:border-neutral-800 dark:bg-neutral-900"
        @submit.prevent="save"
      >
        <!-- Section 1: General Info -->
        <div>
          <h2 class="text-base font-bold text-neutral-900 dark:text-white">
            General Information
          </h2>
          <div class="mt-4 space-y-5">
            <div>
              <label
                for="settings-name"
                class="mb-1.5 block text-sm font-semibold text-neutral-800 dark:text-neutral-200"
              >
                Site Name
              </label>
              <input
                id="settings-name"
                v-model="settings.siteName"
                type="text"
                required
                class="h-11 w-full rounded-2xl border-neutral-300 bg-white px-4 text-sm text-neutral-900 focus:border-primary-400 focus:ring-primary-200 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900"
              />
            </div>

            <div>
              <label
                for="settings-desc"
                class="mb-1.5 block text-sm font-semibold text-neutral-800 dark:text-neutral-200"
              >
                Site Tagline / Description
              </label>
              <textarea
                id="settings-desc"
                v-model="settings.siteDescription"
                rows="3"
                class="w-full rounded-2xl border-neutral-300 bg-white p-4 text-sm text-neutral-900 focus:border-primary-400 focus:ring-primary-200 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900"
              ></textarea>
            </div>

            <div class="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  for="settings-email"
                  class="mb-1.5 block text-sm font-semibold text-neutral-800 dark:text-neutral-200"
                >
                  Admin / Contact Email
                </label>
                <input
                  id="settings-email"
                  v-model="settings.contactEmail"
                  type="email"
                  required
                  class="h-11 w-full rounded-2xl border-neutral-300 bg-white px-4 text-sm text-neutral-900 focus:border-primary-400 focus:ring-primary-200 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900"
                />
              </div>

              <div>
                <label
                  for="settings-footer"
                  class="mb-1.5 block text-sm font-semibold text-neutral-800 dark:text-neutral-200"
                >
                  Footer Copyright Text
                </label>
                <input
                  id="settings-footer"
                  v-model="settings.footerText"
                  type="text"
                  class="h-11 w-full rounded-2xl border-neutral-300 bg-white px-4 text-sm text-neutral-900 focus:border-primary-400 focus:ring-primary-200 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900"
                />
              </div>
            </div>

            <div class="flex items-center gap-3 pt-1">
              <input
                id="settings-registration"
                v-model="settings.allowRegistration"
                type="checkbox"
                class="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 dark:border-neutral-700 dark:bg-neutral-950"
              />
              <label
                for="settings-registration"
                class="text-sm font-medium text-neutral-700 dark:text-neutral-300"
              >
                Allow new reader registrations (defaults to subscriber role)
              </label>
            </div>
          </div>
        </div>

        <!-- Section 2: Logo & Favicon Branding -->
        <div class="border-t border-neutral-100 pt-6 dark:border-neutral-800">
          <h2 class="text-base font-bold text-neutral-900 dark:text-white">
            Brand Assets (Logo & Favicon)
          </h2>
          <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Customize header logo and browser tab favicon.
          </p>

          <div class="mt-5 grid gap-6 sm:grid-cols-2">
            <!-- Logo Setting -->
            <div
              class="rounded-2xl border border-neutral-200 bg-neutral-50/60 p-5 dark:border-neutral-800 dark:bg-neutral-950/40"
            >
              <div class="flex items-center justify-between">
                <label
                  for="settings-logo-url"
                  class="block text-sm font-semibold text-neutral-800 dark:text-neutral-200"
                >
                  Site Logo
                </label>
                <span
                  class="rounded-md bg-neutral-200/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                >
                  Header
                </span>
              </div>

              <!-- Recommendation notice -->
              <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                <strong class="font-medium text-neutral-700 dark:text-neutral-300">Rekomendasi:</strong>
                Ukuran <strong>240 × 60 px</strong> (rasio 4:1), format PNG transparan atau SVG, file &lt; 1 MB.
              </p>

              <!-- Logo Preview -->
              <div
                class="mt-3 flex h-20 w-full items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white p-2 dark:border-neutral-700 dark:bg-neutral-900"
              >
                <img
                  v-if="settings.logo"
                  :src="settings.logo"
                  alt="Site Logo Preview"
                  class="h-12 w-auto max-w-[200px] object-contain"
                />
                <div v-else class="flex items-center gap-2 text-xs text-neutral-400">
                  <ImageIcon class="h-4 w-4" aria-hidden="true" />
                  <span>Using default text logo ("Blogku.")</span>
                </div>
              </div>

              <!-- Actions -->
              <div class="mt-3 flex items-center gap-2">
                <label
                  class="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl bg-neutral-200/80 px-3 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                >
                  <Upload class="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{{ uploadingLogo ? 'Uploading…' : 'Upload Logo' }}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    class="sr-only"
                    :disabled="uploadingLogo"
                    @change="onLogoUpload"
                  />
                </label>
                <input
                  id="settings-logo-url"
                  v-model="settings.logo"
                  type="url"
                  placeholder="Or enter logo URL (https://…)"
                  class="h-9 flex-1 rounded-xl border-neutral-300 bg-white px-3 text-xs text-neutral-900 focus:border-primary-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
                />
              </div>
            </div>

            <!-- Favicon Setting -->
            <div
              class="rounded-2xl border border-neutral-200 bg-neutral-50/60 p-5 dark:border-neutral-800 dark:bg-neutral-950/40"
            >
              <div class="flex items-center justify-between">
                <label
                  for="settings-favicon-url"
                  class="block text-sm font-semibold text-neutral-800 dark:text-neutral-200"
                >
                  Site Favicon
                </label>
                <span
                  class="rounded-md bg-neutral-200/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                >
                  Browser Tab
                </span>
              </div>

              <!-- Recommendation notice -->
              <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                <strong class="font-medium text-neutral-700 dark:text-neutral-300">Rekomendasi:</strong>
                Ukuran <strong>64 × 64 px</strong> atau <strong>32 × 32 px</strong> (rasio 1:1), format PNG / ICO, file &lt; 200 KB.
              </p>

              <!-- Favicon Preview -->
              <div
                class="mt-3 flex h-20 w-full items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white p-2 dark:border-neutral-700 dark:bg-neutral-900"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 p-1 dark:border-neutral-800 dark:bg-neutral-800"
                  >
                    <img
                      v-if="settings.favicon"
                      :src="settings.favicon"
                      alt="Favicon Preview"
                      class="h-8 w-8 object-contain"
                    />
                    <ImageIcon v-else class="h-4 w-4 text-neutral-400" aria-hidden="true" />
                  </div>
                  <span class="text-xs text-neutral-400">
                    Tab Preview Icon
                  </span>
                </div>
              </div>

              <!-- Actions -->
              <div class="mt-3 flex items-center gap-2">
                <label
                  class="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl bg-neutral-200/80 px-3 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                >
                  <Upload class="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{{ uploadingFavicon ? 'Uploading…' : 'Upload Icon' }}</span>
                  <input
                    type="file"
                    accept="image/png,image/x-icon,image/svg+xml"
                    class="sr-only"
                    :disabled="uploadingFavicon"
                    @change="onFaviconUpload"
                  />
                </label>
                <input
                  id="settings-favicon-url"
                  v-model="settings.favicon"
                  type="url"
                  placeholder="Or enter favicon URL (https://…)"
                  class="h-9 flex-1 rounded-xl border-neutral-300 bg-white px-3 text-xs text-neutral-900 focus:border-primary-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Section 3: Allowed External Image Domains -->
        <div class="border-t border-neutral-100 pt-6 dark:border-neutral-800">
          <div class="flex items-center gap-2">
            <Shield class="h-5 w-5 text-primary-600 dark:text-primary-400" aria-hidden="true" />
            <h2 class="text-base font-bold text-neutral-900 dark:text-white">
              Allowed External Image Domains (Security Whitelist)
            </h2>
          </div>
          <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Hanya URL gambar dari domain yang terdaftar di bawah ini yang diizinkan untuk digunakan sebagai cover, avatar, atau gambar artikel guna mencegah hotlinking berbahaya dan serangan pelacakan.
          </p>

          <div class="mt-4 flex flex-wrap gap-2">
            <span
              v-for="domain in settings.allowedImageDomains"
              :key="domain"
              class="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-800 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
            >
              {{ domain }}
              <button
                type="button"
                :title="`Remove ${domain}`"
                :aria-label="`Remove ${domain}`"
                class="flex h-4 w-4 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-300 hover:text-neutral-900 dark:hover:bg-neutral-700 dark:hover:text-white"
                @click="removeDomain(domain)"
              >
                <X class="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          </div>

          <!-- Add new domain input -->
          <div class="mt-4 flex max-w-md items-center gap-2">
            <input
              v-model="newDomain"
              type="text"
              placeholder="e.g. cdn.example.com"
              class="h-10 flex-1 rounded-xl border-neutral-300 bg-white px-3 text-xs text-neutral-900 focus:border-primary-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
              @keydown.enter.prevent="addDomain"
            />
            <button
              type="button"
              class="inline-flex h-10 items-center gap-1.5 rounded-xl bg-neutral-900 px-4 text-xs font-semibold text-white transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-100"
              @click="addDomain"
            >
              <Plus class="h-3.5 w-3.5" aria-hidden="true" />
              Add Domain
            </button>
          </div>
        </div>

        <!-- Section 4: Backend Storage Target Architecture Callout -->
        <div class="rounded-2xl border border-primary-100 bg-primary-50/50 p-5 dark:border-primary-950 dark:bg-primary-950/20">
          <div class="flex items-center gap-2">
            <HardDrive class="h-5 w-5 text-primary-600 dark:text-primary-400" aria-hidden="true" />
            <h3 class="text-sm font-bold text-neutral-900 dark:text-white">
              Target Sistem Storage Backend (Spesifikasi Fase 2)
            </h3>
          </div>
          <p class="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
            Di Fase 2 (PocketBase), sistem storage dapat dikonfigurasi melalui dua pilihan:
          </p>
          <div class="mt-3 grid gap-3 sm:grid-cols-2 text-xs">
            <div class="rounded-xl border border-white/60 bg-white/80 p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80">
              <p class="font-bold text-neutral-900 dark:text-white">1. Local Filesystem Storage</p>
              <p class="mt-1 text-neutral-500 dark:text-neutral-400">
                Disimpan di direktori lokal <code>pb_data/storage</code>. Ringan, cepat, cocok untuk server tunggal (VPS).
              </p>
            </div>
            <div class="rounded-xl border border-white/60 bg-white/80 p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80">
              <p class="font-bold text-neutral-900 dark:text-white">2. S3-Compatible Object Storage</p>
              <p class="mt-1 text-neutral-500 dark:text-neutral-400">
                Mendukung Cloudflare R2, MinIO, AWS S3, Wasabi. Skalabel, bebas beban disk server lokal, dan CDN siap pakai.
              </p>
            </div>
          </div>
        </div>

        <!-- Save Button -->
        <div class="flex items-center gap-4 border-t border-neutral-100 pt-6 dark:border-neutral-800">
          <BaseButton type="submit" size="md" :disabled="saving">
            <CheckCircle2 v-if="saved" class="h-4 w-4" aria-hidden="true" />
            <Save v-else class="h-4 w-4" aria-hidden="true" />
            {{ saving ? 'Saving…' : saved ? 'Saved' : 'Save Settings' }}
          </BaseButton>
        </div>
      </form>
    </div>
  </div>
</template>
