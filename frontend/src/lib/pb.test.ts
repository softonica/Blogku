import { describe, it, expect, afterEach } from 'vitest'

describe('createPb base URL', () => {
  afterEach(() => {
    delete (import.meta.env as Record<string, unknown>).VITE_PB_URL
  })

  it('defaults to window.location.origin (same-origin) when VITE_PB_URL unset', async () => {
    delete (import.meta.env as Record<string, unknown>).VITE_PB_URL
    const { createPb } = await import('./pb')
    const pb = createPb()
    expect((pb as unknown as { baseURL: string }).baseURL).toBe(window.location.origin)
  })

  it('uses VITE_PB_URL when provided', async () => {
    ;(import.meta.env as Record<string, unknown>).VITE_PB_URL = 'http://127.0.0.1:8090'
    const { createPb } = await import('./pb')
    const pb = createPb()
    expect((pb as unknown as { baseURL: string }).baseURL).toBe('http://127.0.0.1:8090')
  })
})
