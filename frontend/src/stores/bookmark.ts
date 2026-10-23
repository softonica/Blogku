import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

const STORAGE_KEY = 'ncmaz.bookmarks.v1'

function readIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === 'string')
      : []
  } catch {
    return []
  }
}

export const useBookmarkStore = defineStore('bookmark', () => {
  const ids = ref<string[]>(readIds())
  const count = computed(() => ids.value.length)

  function persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.value))
    } catch {
      /* ignore */
    }
  }

  function has(postId: string): boolean {
    return ids.value.includes(postId)
  }

  function toggle(postId: string): boolean {
    if (has(postId)) {
      ids.value = ids.value.filter((id) => id !== postId)
      persist()
      return false
    }
    ids.value = [postId, ...ids.value]
    persist()
    return true
  }

  function remove(postId: string): void {
    if (!has(postId)) return
    ids.value = ids.value.filter((id) => id !== postId)
    persist()
  }

  function clear(): void {
    ids.value = []
    persist()
  }

  return { ids, count, has, toggle, remove, clear }
})
