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
  paused = true

  ontimeupdate: (() => void) | null = null
  ondurationchange: (() => void) | null = null
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
  title: 'Track title',
  audioUrl: 'https://cdn.example.com/audio.mp3',
  coverUrl: 'https://cdn.example.com/cover.jpg',
  authorName: 'Author',
}

beforeEach(() => {
  vi.stubGlobal('Audio', MockAudio)
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
})
