import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Post } from '@/api/types'
import type { AudioTrack } from '@/lib/audio-engine'
import { getAudioEngine } from '@/lib/audio-engine'

export const usePlayerStore = defineStore('player', () => {
  const engine = getAudioEngine()

  const initial = engine.getState()
  const track = ref<AudioTrack | null>(initial.track)
  const playing = ref(initial.playing)
  const currentTime = ref(initial.currentTime)
  const duration = ref(initial.duration)
  const error = ref<string | null>(initial.error)

  engine.subscribe((state) => {
    track.value = state.track
    playing.value = state.playing
    currentTime.value = state.currentTime
    duration.value = state.duration
    error.value = state.error
  })

  function play(post: Post): void {
    if (track.value?.postId !== post.id) {
      engine.load({
        postId: post.id,
        title: post.title,
        audioUrl: post.audioUrl ?? '',
        coverUrl: post.cover,
        authorName: post.author.name,
      })
    }
    void engine.play()
  }

  function toggle(): void {
    if (playing.value) {
      engine.pause()
    } else {
      void engine.play()
    }
  }

  function pause(): void {
    engine.pause()
  }

  function seek(time: number): void {
    engine.seek(time)
  }

  function close(): void {
    engine.stop()
  }

  function isCurrentPost(postId: string): boolean {
    return track.value?.postId === postId
  }

  return {
    track,
    playing,
    currentTime,
    duration,
    error,
    play,
    toggle,
    pause,
    seek,
    close,
    isCurrentPost,
  }
})
