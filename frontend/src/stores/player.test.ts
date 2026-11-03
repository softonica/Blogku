import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Post } from '@/api/types'
import type { AudioEngine, AudioEngineListener, AudioEngineState, AudioTrack } from '@/lib/audio-engine'
import { usePlayerStore } from './player'

const h = vi.hoisted(() => {
  const listeners = new Set<AudioEngineListener>()

  const calls = {
    load: [] as AudioTrack[],
    play: 0,
    pause: 0,
    seek: [] as number[],
    stop: 0,
  }

  const state: AudioEngineState = {
    track: null,
    playing: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    error: null,
  }

  function emit(): void {
    for (const listener of listeners) {
      listener(state)
    }
  }

  const engine: AudioEngine = {
    load(track: AudioTrack): void {
      calls.load.push(track)
      state.track = track
      state.playing = false
      state.currentTime = 0
      state.duration = 0
      state.error = null
      emit()
    },
    async play(): Promise<void> {
      calls.play += 1
      state.playing = true
      state.error = null
      emit()
    },
    pause(): void {
      calls.pause += 1
      state.playing = false
      emit()
    },
    seek(time: number): void {
      calls.seek.push(time)
      state.currentTime = time
      emit()
    },
    stop(): void {
      calls.stop += 1
      state.track = null
      state.playing = false
      state.currentTime = 0
      state.duration = 0
      state.error = null
      emit()
    },
    getState(): AudioEngineState {
      return state
    },
    subscribe(listener: AudioEngineListener): () => void {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }

  function reset(): void {
    calls.load.length = 0
    calls.play = 0
    calls.pause = 0
    calls.seek.length = 0
    calls.stop = 0
    Object.assign(state, {
      track: null,
      playing: false,
      currentTime: 0,
      duration: 0,
      volume: 1,
      error: null,
    })
    listeners.clear()
  }

  return { engine, calls, state, emit, reset }
})

vi.mock('@/lib/audio-engine', () => ({
  getAudioEngine: () => h.engine,
}))

function makePost(id: string): Post {
  return {
    id,
    slug: id,
    title: `Title ${id}`,
    excerpt: 'excerpt',
    content: 'content',
    cover: `https://cover/${id}.jpg`,
    status: 'published',
    postType: 'audio',
    audioUrl: `https://audio/${id}.mp3`,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    author: {
      id: 'u1',
      username: 'alice',
      name: 'Alice',
      email: 'alice@example.com',
      avatar: '',
      bio: '',
      role: 'penulis',
    },
    categories: [],
    tags: [],
    likeCount: 0,
    viewCount: 0,
    commentCount: 0,
    readingTime: 1,
    featured: false,
  }
}

describe('player store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    h.reset()
  })

  it('loads and plays a new track', () => {
    const store = usePlayerStore()
    const post = makePost('p1')

    store.play(post)

    expect(h.calls.load).toEqual([
      {
        postId: 'p1',
        title: 'Title p1',
        audioUrl: 'https://audio/p1.mp3',
        coverUrl: 'https://cover/p1.jpg',
        authorName: 'Alice',
      },
    ])
    expect(h.calls.play).toBe(1)
    expect(store.track?.postId).toBe('p1')
    expect(store.playing).toBe(true)
  })

  it('resumes the same track without reloading', () => {
    const store = usePlayerStore()
    const post = makePost('p1')

    store.play(post)
    store.play(post)

    expect(h.calls.load).toHaveLength(1)
    expect(h.calls.play).toBe(2)
  })

  it('no-ops play when the post has no audioUrl', () => {
    const store = usePlayerStore()
    const post = makePost('p1')
    delete post.audioUrl

    store.play(post)

    expect(h.calls.load).toEqual([])
    expect(h.calls.play).toBe(0)
    expect(store.track).toBeNull()
    expect(store.playing).toBe(false)
  })

  it('toggles between playing and paused', () => {
    const store = usePlayerStore()
    store.play(makePost('p1'))

    store.toggle()
    expect(h.calls.pause).toBe(1)
    expect(store.playing).toBe(false)

    store.toggle()
    expect(h.calls.play).toBe(2)
    expect(store.playing).toBe(true)
  })

  it('pauses the current track', () => {
    const store = usePlayerStore()
    store.play(makePost('p1'))

    store.pause()

    expect(h.calls.pause).toBe(1)
    expect(store.playing).toBe(false)
  })

  it('forwards seek calls to the engine', () => {
    const store = usePlayerStore()

    store.seek(30)

    expect(h.calls.seek).toEqual([30])
    expect(store.currentTime).toBe(30)
  })

  it('syncs store state from engine events', () => {
    const store = usePlayerStore()

    h.state.currentTime = 42
    h.state.duration = 100
    h.emit()

    expect(store.currentTime).toBe(42)
    expect(store.duration).toBe(100)
  })

  it('closes and clears the current track', () => {
    const store = usePlayerStore()
    store.play(makePost('p1'))

    store.close()

    expect(h.calls.stop).toBe(1)
    expect(store.track).toBeNull()
    expect(store.playing).toBe(false)
  })

  it('reports whether a post is the current one', () => {
    const store = usePlayerStore()
    expect(store.isCurrentPost('p1')).toBe(false)

    store.play(makePost('p1'))
    expect(store.isCurrentPost('p1')).toBe(true)
    expect(store.isCurrentPost('p2')).toBe(false)
  })
})
