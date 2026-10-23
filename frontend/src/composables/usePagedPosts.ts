import { ref } from 'vue'
import { getDataSource } from '@/api'
import type { Post, PostFilter } from '@/api/types'
import { getErrorMessage } from '@/lib/format'

export function usePagedPosts(options: {
  perPage?: number
  sort?: string
  getFilter?: () => PostFilter | undefined
}) {
  const perPage = options.perPage ?? 9
  const items = ref<Post[]>([])
  const page = ref(1)
  const totalItems = ref(0)
  const totalPages = ref(1)
  const loading = ref(false)
  const error = ref('')

  async function load(nextPage = page.value): Promise<void> {
    loading.value = true
    error.value = ''
    try {
      const result = await getDataSource().listPosts({
        page: nextPage,
        perPage,
        sort: options.sort ?? '-createdAt',
        filter: options.getFilter?.(),
      })
      items.value = result.items
      page.value = result.page
      totalItems.value = result.totalItems
      totalPages.value = result.totalPages
    } catch (err) {
      error.value = getErrorMessage(err)
    } finally {
      loading.value = false
    }
  }

  async function goTo(nextPage: number): Promise<void> {
    const target = Math.min(Math.max(1, nextPage), totalPages.value)
    if (target === page.value) return
    await load(target)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  async function reset(): Promise<void> {
    page.value = 1
    await load(1)
  }

  return {
    items,
    page,
    totalItems,
    totalPages,
    loading,
    error,
    load,
    goTo,
    reset,
  }
}
