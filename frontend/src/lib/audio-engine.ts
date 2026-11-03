export interface AudioTrack {
  postId: string
  slug: string
  title: string
  audioUrl: string
  coverUrl: string
  authorName: string
  categoryName: string
  likeCount: number
}

export interface AudioEngineState {
  track: AudioTrack | null
  playing: boolean
  currentTime: number
  duration: number
  buffered: number
  volume: number
  muted: boolean
  playbackRate: number
  error: string | null
}

export type AudioEngineListener = (state: AudioEngineState) => void

export interface AudioEngine {
  load(track: AudioTrack): void
  play(): Promise<void>
  pause(): void
  seek(time: number): void
  skip(seconds: number): void
  setVolume(volume: number): void
  setMuted(muted: boolean): void
  setPlaybackRate(rate: number): void
  stop(): void
  getState(): AudioEngineState
  subscribe(listener: AudioEngineListener): () => void
}

const DEFAULT_VOLUME = 0.8

let audioEl: HTMLAudioElement | null = null
let lastVolume = DEFAULT_VOLUME

const state: AudioEngineState = {
  track: null,
  playing: false,
  currentTime: 0,
  duration: 0,
  buffered: 0,
  volume: DEFAULT_VOLUME,
  muted: false,
  playbackRate: 1,
  error: null,
}

const listeners = new Set<AudioEngineListener>()

function emit(): void {
  const snapshot = { ...state }
  for (const listener of listeners) {
    listener(snapshot)
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function ensureAudio(): HTMLAudioElement {
  if (audioEl) {
    return audioEl
  }

  const el = new Audio()
  el.preload = 'auto'
  el.volume = DEFAULT_VOLUME

  el.ontimeupdate = () => {
    state.currentTime = el.currentTime
    emit()
  }

  el.ondurationchange = () => {
    state.duration = el.duration
    emit()
  }

  el.onprogress = () => {
    const ranges = el.buffered
    state.buffered =
      ranges && ranges.length > 0 ? ranges.end(ranges.length - 1) : 0
    emit()
  }

  el.onplay = () => {
    state.playing = true
    state.error = null
    emit()
  }

  el.onpause = () => {
    state.playing = false
    emit()
  }

  el.onended = () => {
    state.playing = false
    emit()
  }

  el.onerror = () => {
    if (!state.track) return
    state.error = 'Audio playback error'
    emit()
  }

  state.volume = el.volume
  state.muted = el.muted
  state.playbackRate = el.playbackRate
  audioEl = el
  return el
}

const engine: AudioEngine = {
  load(track: AudioTrack): void {
    const el = ensureAudio()
    state.track = track
    state.playing = false
    state.currentTime = 0
    state.duration = 0
    state.buffered = 0
    state.error = null
    el.src = track.audioUrl
    emit()
  },

  async play(): Promise<void> {
    const el = ensureAudio()
    try {
      await el.play()
    } catch (err) {
      state.error = err instanceof Error ? err.message : String(err)
      emit()
    }
  },

  pause(): void {
    ensureAudio().pause()
  },

  seek(time: number): void {
    const el = ensureAudio()
    const next = Number.isFinite(time) ? time : 0
    const target = state.duration > 0 ? clamp(next, 0, state.duration) : Math.max(0, next)
    el.currentTime = target
    state.currentTime = target
    emit()
  },

  skip(seconds: number): void {
    engine.seek(state.currentTime + seconds)
  },

  setVolume(volume: number): void {
    const el = ensureAudio()
    const next = clamp(Number.isFinite(volume) ? volume : 0, 0, 1)
    el.volume = next
    state.volume = next
    if (next > 0) {
      lastVolume = next
      el.muted = false
      state.muted = false
    } else {
      el.muted = true
      state.muted = true
    }
    emit()
  },

  setMuted(muted: boolean): void {
    const el = ensureAudio()
    if (muted) {
      if (state.volume > 0) lastVolume = state.volume
      el.muted = true
      state.muted = true
    } else {
      if (state.volume === 0) {
        el.volume = lastVolume
        state.volume = lastVolume
      }
      el.muted = false
      state.muted = false
    }
    emit()
  },

  setPlaybackRate(rate: number): void {
    const el = ensureAudio()
    const next = Number.isFinite(rate) && rate > 0 ? rate : 1
    el.playbackRate = next
    state.playbackRate = next
    emit()
  },

  stop(): void {
    const el = ensureAudio()
    state.track = null
    state.playing = false
    state.currentTime = 0
    state.duration = 0
    state.buffered = 0
    state.error = null
    el.pause()
    el.removeAttribute('src')
    el.load()
    el.currentTime = 0
    emit()
  },

  getState(): AudioEngineState {
    return { ...state }
  },

  subscribe(listener: AudioEngineListener): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

export function getAudioEngine(): AudioEngine {
  return engine
}
