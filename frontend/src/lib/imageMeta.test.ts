import { describe, expect, it } from 'vitest'
import {
  ABSOLUTE_MAX_IMAGE_SIDE,
  clampImageMaxDimension,
  clampImageQuality,
  computeVariantPlan,
  isAnimatedImage,
  sniffImage,
} from './imageMeta'

function pngBuffer(width: number, height: number): ArrayBuffer {
  const buffer = new ArrayBuffer(33)
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)
  view.setUint32(8, 13)
  bytes.set([0x49, 0x48, 0x44, 0x52], 12)
  view.setUint32(16, width)
  view.setUint32(20, height)
  return buffer
}

function jpegBuffer(width: number, height: number): ArrayBuffer {
  const buffer = new ArrayBuffer(39)
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)
  bytes.set([0xff, 0xd8, 0xff, 0xe0], 0)
  view.setUint16(4, 16)
  bytes.set([0xff, 0xc0], 20)
  view.setUint16(22, 17)
  bytes[24] = 8
  view.setUint16(25, height)
  view.setUint16(27, width)
  return buffer
}

function gifBuffer(width: number, height: number, frames: number): ArrayBuffer {
  const parts: number[] = [
    0x47, 0x49, 0x46, 0x38, 0x39, 0x61,
    width & 0xff, (width >> 8) & 0xff,
    height & 0xff, (height >> 8) & 0xff,
    0x00, 0x00, 0x00,
  ]
  for (let i = 0; i < frames; i++) {
    parts.push(0x2c, 0, 0, 0, 0, 0x10, 0, 0x10, 0, 0x00, 0x02, 0x00)
  }
  parts.push(0x3b)
  return new Uint8Array(parts).buffer
}

function webpVp8xBuffer(width: number, height: number): ArrayBuffer {
  const buffer = new ArrayBuffer(30)
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)
  bytes.set([0x52, 0x49, 0x46, 0x46], 0)
  view.setUint32(4, 22, true)
  bytes.set([0x57, 0x45, 0x42, 0x50], 8)
  bytes.set([0x56, 0x50, 0x38, 0x58], 12)
  view.setUint32(16, 10, true)
  bytes[20] = 0
  const w = width - 1
  const h = height - 1
  bytes[24] = w & 0xff
  bytes[25] = (w >> 8) & 0xff
  bytes[26] = (w >> 16) & 0xff
  bytes[27] = h & 0xff
  bytes[28] = (h >> 8) & 0xff
  bytes[29] = (h >> 16) & 0xff
  return buffer
}

describe('sniffImage', () => {
  it('reads PNG dimensions', () => {
    expect(sniffImage(pngBuffer(1600, 900))).toMatchObject({
      format: 'png',
      width: 1600,
      height: 900,
    })
  })

  it('reads JPEG dimensions', () => {
    expect(sniffImage(jpegBuffer(800, 600))).toMatchObject({
      format: 'jpeg',
      width: 800,
      height: 600,
    })
  })

  it('reads GIF dimensions and detects animation', () => {
    const animated = sniffImage(gifBuffer(480, 270, 2))
    expect(animated).toMatchObject({ format: 'gif', width: 480, height: 270, animated: true })

    const still = sniffImage(gifBuffer(480, 270, 1))
    expect(still?.animated).toBe(false)
  })

  it('reads WebP (VP8X) dimensions', () => {
    expect(sniffImage(webpVp8xBuffer(2048, 1080))).toMatchObject({
      format: 'webp',
      width: 2048,
      height: 1080,
    })
  })

  it('returns null for non-image buffers', () => {
    const bytes = new Uint8Array(16)
    bytes.set([0x3c, 0x68, 0x74, 0x6d, 0x6c, 0x3e], 0)
    expect(sniffImage(bytes.buffer)).toBeNull()
  })
})

describe('isAnimatedImage', () => {
  it('only treats animated GIFs as passthrough candidates', () => {
    expect(
      isAnimatedImage({ format: 'gif', width: 10, height: 10, animated: true }),
    ).toBe(true)
    expect(
      isAnimatedImage({ format: 'gif', width: 10, height: 10, animated: false }),
    ).toBe(false)
    expect(
      isAnimatedImage({ format: 'webp', width: 10, height: 10, animated: true }),
    ).toBe(false)
  })
})

describe('computeVariantPlan', () => {
  it('caps the full variant at the configured max dimension', () => {
    const plan = computeVariantPlan(4000, 2000, 2048)
    expect(plan.map((item) => item.key)).toEqual(['thumb', 'medium', 'full'])
    expect(plan[0]).toMatchObject({ width: 320, height: 160 })
    expect(plan[1]).toMatchObject({ width: 1024, height: 512 })
    expect(plan[2]).toMatchObject({ width: 2048, height: 1024 })
  })

  it('never upscales small images', () => {
    const plan = computeVariantPlan(200, 100, 2048)
    expect(plan.every((item) => item.width === 200)).toBe(true)
    expect(plan.every((item) => item.height === 100)).toBe(true)
  })

  it('clamps absurd max dimensions', () => {
    const plan = computeVariantPlan(5000, 5000, 99999)
    expect(plan[2].width).toBe(4096)
    expect(plan[2].width).toBeLessThan(ABSOLUTE_MAX_IMAGE_SIDE)
  })
})

describe('settings clamps', () => {
  it('clamps image max dimension into a safe range', () => {
    expect(clampImageMaxDimension(100)).toBe(256)
    expect(clampImageMaxDimension(99999)).toBe(4096)
    expect(clampImageMaxDimension('1500')).toBe(1500)
    expect(clampImageMaxDimension(undefined)).toBe(2048)
  })

  it('clamps quality into a safe range', () => {
    expect(clampImageQuality(0)).toBe(0.8)
    expect(clampImageQuality(0.05)).toBe(0.1)
    expect(clampImageQuality(2)).toBe(1)
    expect(clampImageQuality(0.777)).toBe(0.78)
  })
})
