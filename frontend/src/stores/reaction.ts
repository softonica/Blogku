import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getDataSource } from '@/api'
import type { Post } from '@/api/types'

const STORAGE_KEY = 'ncmaz.likes.v1'

function readLikes(): string[] {
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

export const useReactionStore = defineStore('reaction', () => {
  const likedIds = ref<string[]>(readLikes())

  function persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(likedIds.value))
    } catch {
      /* ignore */
    }
  }

  function isLiked(postId: string): boolean {
    return likedIds.value.includes(postId)
  }

  function likeCount(post: Post): number {
    return post.likeCount + (isLiked(post.id) ? 1 : 0)
  }

  async function toggleLike(postId: string): Promise<boolean> {
    await getDataSource().toggleReaction({ postId, type: 'like' })
    if (isLiked(postId)) {
      likedIds.value = likedIds.value.filter((id) => id !== postId)
      persist()
      return false
    }
    likedIds.value = [postId, ...likedIds.value]
    persist()
    return true
  }

  return { likedIds, isLiked, likeCount, toggleLike }
})
