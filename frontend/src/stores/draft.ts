import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { PostType } from '@/api/types'

export interface Draft {
  id: string
  title: string
  excerpt: string
  content: string
  postType?: PostType
  categoryIds?: string[]
  tagIds?: string[]
  cover?: string
  videoUrl?: string
  audioUrl?: string
  updatedAt: string
}

const STORAGE_KEY = 'ncmaz.drafts.v1'

function readDrafts(): Draft[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (draft): draft is Draft =>
        typeof draft?.id === 'string' &&
        typeof draft?.title === 'string' &&
        typeof draft?.content === 'string',
    )
  } catch {
    return []
  }
}

export const useDraftStore = defineStore('draft', () => {
  const drafts = ref<Draft[]>(readDrafts())
  const count = computed(() => drafts.value.length)

  function persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts.value))
    } catch {
      /* ignore */
    }
  }

  function save(input: {
    id?: string
    title: string
    excerpt: string
    content: string
    postType?: PostType
    categoryIds?: string[]
    tagIds?: string[]
    cover?: string
    videoUrl?: string
    audioUrl?: string
  }): Draft {
    const draft: Draft = {
      id: input.id ?? `draft_${Date.now()}`,
      title: input.title,
      excerpt: input.excerpt,
      content: input.content,
      postType: input.postType ?? 'standard',
      categoryIds: input.categoryIds ?? [],
      tagIds: input.tagIds ?? [],
      cover: input.cover,
      videoUrl: input.videoUrl,
      audioUrl: input.audioUrl,
      updatedAt: new Date().toISOString(),
    }
    const index = drafts.value.findIndex((item) => item.id === draft.id)
    drafts.value =
      index >= 0
        ? drafts.value.map((item) => (item.id === draft.id ? draft : item))
        : [draft, ...drafts.value]
    persist()
    return draft
  }

  function remove(id: string): void {
    drafts.value = drafts.value.filter((item) => item.id !== id)
    persist()
  }

  return { drafts, count, save, remove }
})
