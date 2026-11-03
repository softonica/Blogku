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
  const buffered = ref(initial.buffered)
  const volume = ref(initial.volume)
  const muted = ref(initial.muted)
  const playbackRate = ref(initial.playbackRate)
  const error = ref<string | null>(initial.error)

  engine.subscribe((state) => {
    track.value = state.track
    playing.value = state.playing
    currentTime.value = state.currentTime
    duration.value = state.duration
    buffered.value = state.buffered
    volume.value = state.volume
    muted.value = state.muted
    playbackRate.value = state.playbackRate
    error.value = state.error
  })

  function play(post: Post): void {
    if (!post.audioUrl) return
    if (track.value?.postId !== post.id) {
      engine.load({
        postId: post.id,
        slug: post.slug,
        title: post.title,
        audioUrl: post.audioUrl,
        coverUrl: post.cover,
        authorName: post.author.name,
        categoryName: post.categories[0]?.name ?? post.author.name,
        likeCount: post.likeCount,
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

  function skip(seconds: number): void {
    engine.skip(seconds)
  }

  function setVolume(next: number): void {
    engine.setVolume(next)
  }

  function toggleMute(): void {
    engine.setMuted(!muted.value)
  }

  function cycleRate(): void {
    const current = playbackRate.value
    const next = current === 1 ? 1.5 : current === 1.5 ? 2 : 1
    engine.setPlaybackRate(next)
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
    buffered,
    volume,
    muted,
    playbackRate,
    error,
    play,
    toggle,
    pause,
    seek,
    skip,
    setVolume,
    toggleMute,
    cycleRate,
    close,
    isCurrentPost,
  }
})
