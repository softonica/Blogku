<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Save } from 'lucide-vue-next'
import { getDataSource } from '@/api'
import { useUiStore } from '@/stores/ui'
import { useDocumentTitle } from '@/composables/useDocumentTitle'
import AdminNav from '@/components/admin/AdminNav.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'

const ui = useUiStore()
const pageTitle = ref('Manage Pages — Admin')
useDocumentTitle(pageTitle)

const slugs = ['about', 'contact', 'privacy'] as const
type Slug = (typeof slugs)[number]

interface EditablePage {
  slug: Slug
  title: string
  body: string
}

const loading = ref(true)
const saving = ref<Slug | null>(null)
const items = ref<EditablePage[]>([])

onMounted(async () => {
  try {
    const source = getDataSource()
    for (const slug of slugs) {
      const page = await source.getPage(slug)
      if (page) {
        items.value.push({ slug, title: page.title, body: page.body })
      }
    }
  } catch (err) {
    ui.notify(err instanceof Error ? err.message : 'Failed to load pages.', 'error')
  } finally {
    loading.value = false
  }
})

async function save(item: EditablePage): Promise<void> {
  saving.value = item.slug
  try {
    await getDataSource().updatePage(item.slug, {
      title: item.title,
      body: item.body,
    })
    ui.notify('Page updated.')
  } catch (err) {
    ui.notify(err instanceof Error ? err.message : 'Failed to save page.', 'error')
  } finally {
    saving.value = null
  }
}

const inputClass =
  'w-full rounded-2xl border-neutral-300 bg-white text-sm text-neutral-900 focus:border-primary-400 focus:ring-primary-200 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900'
</script>

<template>
  <div class="page-shell">
    <AdminNav />

    <div v-if="loading" class="flex justify-center py-20">
      <LoadingSpinner />
    </div>

    <div v-else class="space-y-8">
      <div
        v-for="item in items"
        :key="item.slug"
        class="rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8 dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div class="mb-5 flex items-center justify-between gap-4">
          <h2 class="text-xl font-bold capitalize text-neutral-900 dark:text-white">
            {{ item.slug }}
          </h2>
          <BaseButton
            type="button"
            size="sm"
            :disabled="saving === item.slug"
            @click="save(item)"
          >
            <Save class="h-4 w-4" aria-hidden="true" />
            {{ saving === item.slug ? 'Saving…' : 'Save' }}
          </BaseButton>
        </div>

        <div class="space-y-4">
          <div>
            <label :for="`page-title-${item.slug}`" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Title
            </label>
            <input
              :id="`page-title-${item.slug}`"
              v-model="item.title"
              type="text"
              :class="inputClass"
            />
          </div>
          <div>
            <label :for="`page-body-${item.slug}`" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Body (HTML)
            </label>
            <textarea
              :id="`page-body-${item.slug}`"
              v-model="item.body"
              rows="10"
              :class="[inputClass, 'font-mono resize-y']"
            ></textarea>
            <p class="mt-2 text-xs text-neutral-400">
              Supports basic HTML; sanitized on save and when rendered.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
