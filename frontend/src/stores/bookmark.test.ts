import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBookmarkStore } from './bookmark'

describe('bookmark store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('adds new bookmarks to the front', () => {
    const bookmarks = useBookmarkStore()

    bookmarks.toggle('post-1')
    bookmarks.toggle('post-2')

    expect(bookmarks.ids).toEqual(['post-2', 'post-1'])
    expect(bookmarks.count).toBe(2)
  })

  it('removes a single bookmark and keeps the rest', () => {
    const bookmarks = useBookmarkStore()
    bookmarks.toggle('post-1')
    bookmarks.toggle('post-2')

    bookmarks.remove('post-1')

    expect(bookmarks.ids).toEqual(['post-2'])
    expect(bookmarks.has('post-1')).toBe(false)
    expect(JSON.parse(localStorage.getItem('ncmaz.bookmarks.v1') ?? '[]')).toEqual(['post-2'])
  })

  it('ignores removal of an unknown bookmark', () => {
    const bookmarks = useBookmarkStore()
    bookmarks.toggle('post-1')

    bookmarks.remove('missing')

    expect(bookmarks.ids).toEqual(['post-1'])
  })
})
