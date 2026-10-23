<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { PenSquare } from 'lucide-vue-next'
import { getDataSource } from '@/api'
import type { PageContent } from '@/api/types'
import { sanitizeHtml } from '@/lib/sanitize'
import { useAuthStore } from '@/stores/auth'
import { can } from '@/lib/permissions'
import BaseButton from '@/components/ui/BaseButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'

const props = defineProps<{ slug: string }>()

const auth = useAuthStore()
const page = ref<PageContent | null>(null)
const ready = ref(false)

const renderedBody = computed(() =>
  page.value ? sanitizeHtml(page.value.body) : '',
)

onMounted(async () => {
  page.value = await getDataSource().getPage(props.slug)
  ready.value = true
})
</script>

<template>
  <div class="page-shell">
    <div v-if="!ready" class="flex justify-center py-20">
      <LoadingSpinner />
    </div>

    <EmptyState
      v-else-if="!page"
      title="Page not found"
      description="This page does not exist."
    />

    <article v-else class="mx-auto max-w-3xl">
      <div class="flex items-start justify-between gap-4">
        <h1 class="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-white">
          {{ page.title }}
        </h1>
        <BaseButton
          v-if="can(auth.user?.role, 'manage_settings')"
          :to="{ name: 'admin-pages', query: { slug } }"
          variant="ghost"
          size="sm"
          class="shrink-0"
        >
          <PenSquare class="h-4 w-4" aria-hidden="true" />
          Edit
        </BaseButton>
      </div>
      <div
        class="prose prose-neutral mt-8 max-w-none dark:prose-invert"
        v-html="renderedBody"
      />
    </article>
  </div>
</template>
