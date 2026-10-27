import { getDataSource } from '@/api'

const VIEWED_KEY = 'ncmaz.viewed.v1'

function viewedIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(VIEWED_KEY)
    const arr = raw ? (JSON.parse(raw) as string[]) : []
    return new Set(arr)
  } catch {
    return new Set()
  }
}

export async function trackViewIfNew(postId: string): Promise<void> {
  if (!postId) return
  const viewed = viewedIds()
  if (viewed.has(postId)) return
  viewed.add(postId)
  try {
    sessionStorage.setItem(VIEWED_KEY, JSON.stringify([...viewed]))
  } catch {
    /* ignore */
  }
  await getDataSource().trackView(postId)
}
