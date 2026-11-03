import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getAudioEngine,
  type AudioEngineState,
  type AudioTrack,
} from './audio-engine'

class MockAudio {
  static instances: MockAudio[] = []

  src = ''
  preload = ''
  currentTime = 0
  duration = NaN
  volume = 1
  muted = false
  playbackRate = 1
  paused = true
  buffered: { length: number; end: (index: number) => number } = {
    length: 0,
    end: () => 0,
  }

  ontimeupdate: (() => void) | null = null
  ondurationchange: (() => void) | null = null
  onprogress: (() => void) | null = null
  onplay: (() => void) | null = null
  onpause: (() => void) | null = null
  onended: (() => void) | null = null
  onerror: (() => void) | null = null

  play = vi.fn(async () => {})
  pause = vi.fn(() => {})
  load = vi.fn(() => {})

  constructor() {
    MockAudio.instances.push(this)
  }
}

const sampleTrack: AudioTrack = {
  postId: 'post-1',
  slug: 'track-title',
  title: 'Track title',
  audioUrl: 'https://cdn.example.com/audio.mp3',
  coverUrl: 'https://cdn.example.com/cover.jpg',
  authorName: 'Author',
  categoryName: 'Podcast',
  likeCount: 5,
}

beforeEach(() => {
  vi.stubGlobal('Audio', MockAudio)
  const engine = getAudioEngine()
  engine.stop()
  engine.setVolume(0.8)
  engine.setMuted(false)
  engine.setPlaybackRate(1)
  for (const audio of MockAudio.instances) {
    audio.play.mockClear()
    audio.pause.mockClear()
  }
})

describe('getAudioEngine', () => {
  it('is a singleton: returns the same engine and one underlying audio element', () => {
    const a = getAudioEngine()
    a.load(sampleTrack) // force creation of the underlying audio element
    const b = getAudioEngine()
    expect(a).toBe(b)
    expect(MockAudio.instances).toHaveLength(1)
  })

  it('load() sets the src and the track in state', () => {
    const engine = getAudioEngine()
    engine.load(sampleTrack)
    expect(MockAudio.instances[0].src).toBe(sampleTrack.audioUrl)
    expect(engine.getState().track).toBe(sampleTrack)
  })

  it('play() and pause() call through to the audio element', async () => {
    const engine = getAudioEngine()
    const audio = MockAudio.instances[0]
    await engine.play()
    expect(audio.play).toHaveBeenCalledTimes(1)
    engine.pause()
    expect(audio.pause).toHaveBeenCalledTimes(1)
  })

  it('reflects timeupdate and durationchange events', () => {
    const engine = getAudioEngine()
    const audio = MockAudio.instances[0]
    audio.currentTime = 13.5
    audio.ontimeupdate!()
    expect(engine.getState().currentTime).toBe(13.5)

    audio.duration = 180
    audio.ondurationchange!()
    expect(engine.getState().duration).toBe(180)
  })

  it('marks playing=true on play event and false on ended event', () => {
    const engine = getAudioEngine()
    const audio = MockAudio.instances[0]
    audio.onplay!()
    expect(engine.getState().playing).toBe(true)

    audio.onended!()
    expect(engine.getState().playing).toBe(false)
  })

  it('stores an error on the error event', () => {
    const engine = getAudioEngine()
    MockAudio.instances[0].onerror!()
    expect(engine.getState().error).toBeTruthy()
  })

  it('seek() sets the audio currentTime', () => {
    const engine = getAudioEngine()
    engine.seek(30)
    expect(MockAudio.instances[0].currentTime).toBe(30)
  })

  it('stop() clears the track and stops playing', () => {
    const engine = getAudioEngine()
    engine.load(sampleTrack)
    MockAudio.instances[0].onplay!()
    expect(engine.getState().playing).toBe(true)

    engine.stop()
    const state = engine.getState()
    expect(state.track).toBeNull()
    expect(state.playing).toBe(false)
  })

  it('subscribe() notifies listeners and returns an unsubscriber', () => {
    const engine = getAudioEngine()
    const seen: AudioEngineState[] = []
    const unsubscribe = engine.subscribe((state) => seen.push(state))

    engine.seek(5)
    expect(seen.length).toBeGreaterThan(0)

    unsubscribe()
    const count = seen.length
    engine.seek(10)
    expect(seen.length).toBe(count)
  })

  it('defaults to 80% volume, unmuted, 1x', () => {
    const state = getAudioEngine().getState()
    expect(state.volume).toBe(0.8)
    expect(state.muted).toBe(false)
    expect(state.playbackRate).toBe(1)
  })

  it('clamps volume, mutes at zero, and restores the last volume', () => {
    const engine = getAudioEngine()
    const audio = MockAudio.instances[0]

    engine.setVolume(1.5)
    expect(engine.getState().volume).toBe(1)

    engine.setVolume(0.4)
    expect(engine.getState().volume).toBe(0.4)
    expect(audio.volume).toBe(0.4)

    engine.setVolume(0)
    expect(engine.getState().volume).toBe(0)
    expect(engine.getState().muted).toBe(true)
    expect(audio.muted).toBe(true)

    engine.setMuted(false)
    expect(engine.getState().muted).toBe(false)
    expect(engine.getState().volume).toBe(0.4)
    expect(audio.volume).toBe(0.4)
  })

  it('setMuted remembers the current volume', () => {
    const engine = getAudioEngine()
    engine.setVolume(0.6)
    engine.setMuted(true)
    expect(engine.getState().muted).toBe(true)
    engine.setMuted(false)
    expect(engine.getState().volume).toBe(0.6)
  })

  it('setPlaybackRate updates the element and state', () => {
    const engine = getAudioEngine()
    engine.setPlaybackRate(1.5)
    expect(engine.getState().playbackRate).toBe(1.5)
    expect(MockAudio.instances[0].playbackRate).toBe(1.5)
  })

  it('skip() clamps to the track duration', () => {
    const engine = getAudioEngine()
    const audio = MockAudio.instances[0]
    audio.duration = 100
    audio.ondurationchange!()

    audio.currentTime = 95
    audio.ontimeupdate!()
    engine.skip(15)
    expect(audio.currentTime).toBe(100)

    audio.currentTime = 3
    audio.ontimeupdate!()
    engine.skip(-10)
    expect(audio.currentTime).toBe(0)
  })

  it('tracks buffered range on progress', () => {
    const engine = getAudioEngine()
    const audio = MockAudio.instances[0]
    audio.buffered = { length: 1, end: () => 42 }
    audio.onprogress!()
    expect(engine.getState().buffered).toBe(42)
  })

  it('load() resets time/buffer but keeps volume and rate preferences', () => {
    const engine = getAudioEngine()
    const audio = MockAudio.instances[0]
    audio.currentTime = 20
    audio.ontimeupdate!()
    audio.buffered = { length: 1, end: () => 40 }
    audio.onprogress!()
    engine.setVolume(0.5)
    engine.setPlaybackRate(2)

    engine.load(sampleTrack)

    const state = engine.getState()
    expect(state.currentTime).toBe(0)
    expect(state.buffered).toBe(0)
    expect(state.volume).toBe(0.5)
    expect(state.playbackRate).toBe(2)
  })

  it('stop() resets playback but keeps volume and rate preferences', () => {
    const engine = getAudioEngine()
    engine.setVolume(0.5)
    engine.setPlaybackRate(2)
    engine.load(sampleTrack)
    engine.stop()

    const state = engine.getState()
    expect(state.track).toBeNull()
    expect(state.currentTime).toBe(0)
    expect(state.buffered).toBe(0)
    expect(state.volume).toBe(0.5)
    expect(state.playbackRate).toBe(2)
  })
})
