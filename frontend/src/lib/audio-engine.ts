export interface AudioTrack {
  postId: string
  title: string
  audioUrl: string
  coverUrl: string
  authorName: string
}

export interface AudioEngineState {
  track: AudioTrack | null
  playing: boolean
  currentTime: number
  duration: number
  volume: number
  error: string | null
}

export type AudioEngineListener = (state: AudioEngineState) => void

export interface AudioEngine {
  load(track: AudioTrack): void
  play(): Promise<void>
  pause(): void
  seek(time: number): void
  stop(): void
  getState(): AudioEngineState
  subscribe(listener: AudioEngineListener): () => void
}

let audioEl: HTMLAudioElement | null = null

const state: AudioEngineState = {
  track: null,
  playing: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  error: null,
}

const listeners = new Set<AudioEngineListener>()

function emit(): void {
  for (const listener of listeners) {
    listener(state)
  }
}

function ensureAudio(): HTMLAudioElement {
  if (audioEl) {
    return audioEl
  }

  const el = new Audio()
  el.preload = 'auto'

  el.ontimeupdate = () => {
    state.currentTime = el.currentTime
    emit()
  }

  el.ondurationchange = () => {
    state.duration = el.duration
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
    state.error = 'Audio playback error'
    emit()
  }

  state.volume = el.volume ?? 1
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
    el.currentTime = time
    state.currentTime = time
    emit()
  },

  stop(): void {
    const el = ensureAudio()
    state.track = null
    state.playing = false
    state.currentTime = 0
    state.duration = 0
    state.error = null
    el.pause()
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

export function getAudioEngine(): AudioEngine {
  return engine
}
