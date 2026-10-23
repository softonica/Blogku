import { computed, ref } from 'vue'
import { getDataSource } from '@/api'
import type { Post, PostFilter } from '@/api/types'
import { getErrorMessage } from '@/lib/format'

export function useInfinitePosts(options: {
  perPage?: number
  sort?: string
  getFilter?: () => PostFilter | undefined
  initialItems?: Post[]
  initialTotalItems?: number
}) {
  const perPage = options.perPage ?? 9
  const items = ref<Post[]>(options.initialItems ? [...options.initialItems] : [])
  const page = ref(options.initialItems?.length ? 1 : 0)
  const totalItems = ref(options.initialTotalItems ?? options.initialItems?.length ?? 0)
  const loading = ref(false)
  const error = ref('')

  const hasMore = computed(() => items.value.length < totalItems.value)

  async function fetchPage(nextPage: number): Promise<void> {
    if (loading.value) return
    loading.value = true
    error.value = ''
    try {
      const result = await getDataSource().listPosts({
        page: nextPage,
        perPage,
        sort: options.sort ?? '-createdAt',
        filter: options.getFilter?.(),
      })
      items.value =
        nextPage === 1 ? result.items : [...items.value, ...result.items]
      page.value = result.page
      totalItems.value = result.totalItems
    } catch (err) {
      error.value = getErrorMessage(err)
    } finally {
      loading.value = false
    }
  }

  async function reload(): Promise<void> {
    page.value = 0
    totalItems.value = 0
    await fetchPage(1)
  }

  async function loadMore(): Promise<void> {
    if (loading.value || !hasMore.value) return
    await fetchPage(page.value + 1)
  }

  return {
    items,
    page,
    totalItems,
    loading,
    error,
    hasMore,
    reload,
    loadMore,
  }
}
