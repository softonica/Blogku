<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Save } from 'lucide-vue-next'
import { getDataSource } from '@/api'
import type { EditorSettings } from '@/api/types'
import { DEFAULT_EDITOR_SETTINGS } from '@/lib/editor-defaults'
import { useUiStore } from '@/stores/ui'
import { useDocumentTitle } from '@/composables/useDocumentTitle'
import AdminNav from '@/components/admin/AdminNav.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'

const ui = useUiStore()
const pageTitle = ref('Text Editor Settings — Admin')
useDocumentTitle(pageTitle)

const loading = ref(true)
const saving = ref(false)
const settings = ref<EditorSettings>({ ...DEFAULT_EDITOR_SETTINGS })

onMounted(async () => {
  try {
    settings.value = await getDataSource().getEditorSettings()
  } catch (err) {
    ui.notify(err instanceof Error ? err.message : 'Failed to load editor settings.', 'error')
  } finally {
    loading.value = false
  }
})

async function save(): Promise<void> {
  saving.value = true
  try {
    await getDataSource().updateEditorSettings({
      ...settings.value,
      maxContentLength: Math.max(0, Math.floor(Number(settings.value.maxContentLength) || 0)),
      maxImageUploadSize: Math.max(
        0,
        Math.floor(Number(settings.value.maxImageUploadSize) || 0),
      ),
    })
    ui.notify('Editor settings saved.')
  } catch (err) {
    ui.notify(err instanceof Error ? err.message : 'Failed to save settings.', 'error')
  } finally {
    saving.value = false
  }
}

const toggleItems: Array<{ key: Exclude<keyof EditorSettings, 'placeholder' | 'maxContentLength' | 'maxImageUploadSize'>; label: string; hint: string }> = [
  { key: 'showHeadings', label: 'Heading', hint: 'Heading 2 & 3' },
  { key: 'showFormatting', label: 'Formatting', hint: 'Bold, Italic, Strikethrough, Inline Code' },
  { key: 'showLists', label: 'List', hint: 'Bullet & numbered list' },
  { key: 'showBlockquote', label: 'Blockquote', hint: 'Kutipan blok' },
  { key: 'showRule', label: 'Horizontal Rule', hint: 'Garis pemisah' },
  { key: 'showLink', label: 'Link', hint: 'Tambah / hapus link' },
  { key: 'showImageUpload', label: 'Upload Gambar', hint: 'Upload file gambar' },
  { key: 'showImageUrl', label: 'Insert Gambar via URL', hint: 'Masukkan gambar dari URL' },
  { key: 'showEmoji', label: 'Emoji', hint: 'Pemilih emoji' },
  { key: 'showAlign', label: 'Text Align', hint: 'Rata kiri / tengah / kanan' },
  { key: 'showTable', label: 'Table', hint: 'Insert & hapus tabel' },
  { key: 'autolink', label: 'Autolink', hint: 'URL otomatis jadi link' },
]
</script>

<template>
  <div class="page-shell">
    <AdminNav />

    <div v-if="loading" class="flex justify-center py-20">
      <LoadingSpinner />
    </div>

    <div v-else class="mx-auto max-w-3xl space-y-6">
      <div class="rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 class="text-xl font-bold text-neutral-900 dark:text-white">Text Editor Settings</h2>
        <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Atur perilaku editor rich text dan toolbar-nya.
        </p>

        <div class="mt-6 space-y-5">
          <div>
            <label for="editor-placeholder" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Placeholder default
            </label>
            <input
              id="editor-placeholder"
              v-model="settings.placeholder"
              type="text"
              class="w-full rounded-2xl border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:border-primary-400 focus:ring-primary-200 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900"
            />
          </div>

          <div class="grid gap-5 sm:grid-cols-2">
            <div>
              <label for="editor-max-length" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Batas panjang konten (chars)
              </label>
              <input
                id="editor-max-length"
                v-model.number="settings.maxContentLength"
                type="number"
                min="0"
                class="w-full rounded-2xl border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:border-primary-400 focus:ring-primary-200 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900"
              />
              <p class="mt-1 text-xs text-neutral-400">0 = tanpa batas</p>
            </div>
            <div>
              <label for="editor-max-upload" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Batas ukuran upload (bytes)
              </label>
              <input
                id="editor-max-upload"
                v-model.number="settings.maxImageUploadSize"
                type="number"
                min="0"
                class="w-full rounded-2xl border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:border-primary-400 focus:ring-primary-200 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900"
              />
              <p class="mt-1 text-xs text-neutral-400">cth: 2097152 = 2MB</p>
            </div>
          </div>

          <div class="space-y-3 border-t border-neutral-100 pt-5 dark:border-neutral-800">
            <label
              v-for="item in toggleItems"
              :key="item.key"
              class="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-neutral-200 px-4 py-3 transition hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700"
            >
              <span>
                <span class="block text-sm font-semibold text-neutral-800 dark:text-neutral-100">{{ item.label }}</span>
                <span class="block text-xs text-neutral-500 dark:text-neutral-400">{{ item.hint }}</span>
              </span>
              <input
                v-model="settings[item.key]"
                type="checkbox"
                class="h-5 w-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-400 dark:border-neutral-700"
              />
            </label>
          </div>
        </div>

        <div class="mt-6 flex justify-end">
          <BaseButton type="button" :disabled="saving" @click="save">
            <Save class="h-4 w-4" aria-hidden="true" />
            {{ saving ? 'Saving…' : 'Save changes' }}
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>
