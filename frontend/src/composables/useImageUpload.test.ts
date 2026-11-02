import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetImageSettingsCache, uploadProcessedImage } from './useImageUpload'

const mocks = vi.hoisted(() => ({
  getEditorSettings: vi.fn(),
  uploadFile: vi.fn(),
  processImageFile: vi.fn(),
  encodeImageVariants: vi.fn(
    (fullUrl: string) => `${fullUrl}#imgv1&t=https%3A%2F%2Fcdn.test%2Fthumb.webp&m=https%3A%2F%2Fcdn.test%2Fmedium.webp&w=800`,
  ),
}))

vi.mock('@/api', () => ({
  getDataSource: () => ({
    getEditorSettings: mocks.getEditorSettings,
    uploadFile: mocks.uploadFile,
  }),
}))

vi.mock('@/lib/imageProcessor', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/imageProcessor')>()
  return { ...actual, processImageFile: mocks.processImageFile }
})

vi.mock('@/lib/imageVariants', () => ({
  encodeImageVariants: mocks.encodeImageVariants,
}))

const MB = 1024 * 1024

function jpegHeader(): Uint8Array {
  const buffer = new Uint8Array(39)
  const view = new DataView(buffer.buffer)
  buffer.set([0xff, 0xd8, 0xff, 0xe0], 0)
  view.setUint16(4, 16)
  buffer.set([0xff, 0xc0], 20)
  view.setUint16(22, 17)
  buffer[24] = 8
  view.setUint16(25, 600)
  view.setUint16(27, 800)
  return buffer
}

function withArrayBuffer(file: File, bytes: Uint8Array): File {
  Object.defineProperty(file, 'arrayBuffer', { value: async () => bytes.buffer })
  return file
}

function jpegFile(sizeBytes: number, name = 'photo.jpg'): File {
  const buffer = new Uint8Array(sizeBytes)
  buffer.set(jpegHeader(), 0)
  return withArrayBuffer(new File([buffer], name, { type: 'image/jpeg' }), buffer)
}

function animatedGifFile(sizeBytes: number, name = 'animated.gif'): File {
  const parts: number[] = [
    0x47, 0x49, 0x46, 0x38, 0x39, 0x61,
    0x20, 0x00,
    0x20, 0x00,
    0x00, 0x00, 0x00,
  ]
  for (let i = 0; i < 2; i++) {
    parts.push(0x2c, 0, 0, 0, 0, 0x10, 0, 0x10, 0, 0x00, 0x02, 0x00)
  }
  parts.push(0x3b)
  const buffer = new Uint8Array(sizeBytes)
  buffer.set(parts, 0)
  return withArrayBuffer(new File([buffer], name, { type: 'image/gif' }), buffer)
}

function processed(fullSize = 256 * 1024) {
  const plan = [
    { key: 'thumb', width: 320, height: 240 },
    { key: 'medium', width: 800, height: 600 },
    { key: 'full', width: 1200, height: 900 },
  ]
  return {
    thumb: new File([new Uint8Array(64 * 1024)], 'ncmaz-thumb-photo.webp', { type: 'image/webp' }),
    medium: new File([new Uint8Array(128 * 1024)], 'ncmaz-medium-photo.webp', {
      type: 'image/webp',
    }),
    full: new File([new Uint8Array(fullSize)], 'photo.webp', { type: 'image/webp' }),
    plan,
  }
}

beforeEach(() => {
  resetImageSettingsCache()
  vi.clearAllMocks()
  mocks.getEditorSettings.mockResolvedValue({
    maxImageUploadSize: 2 * MB,
    imageMaxDimension: 2048,
    imageQuality: 0.8,
  })
  mocks.uploadFile.mockImplementation(async (file: File) => ({
    url: `https://cdn.test/${file.name}`,
    name: file.name,
  }))
})

describe('uploadProcessedImage', () => {
  it('compresses source photos larger than the upload limit instead of rejecting them', async () => {
    const file = jpegFile(6 * MB)
    mocks.processImageFile.mockResolvedValue(processed())

    const result = await uploadProcessedImage(file)

    expect(mocks.processImageFile).toHaveBeenCalledTimes(1)
    expect(mocks.uploadFile).toHaveBeenCalledTimes(3)
    expect(result.thumb).toBe('https://cdn.test/ncmaz-thumb-photo.webp')
    expect(result.full).toContain('#imgv1')
  })

  it('still enforces the limit for animated GIFs that bypass processing', async () => {
    const file = animatedGifFile(3 * MB)

    await expect(uploadProcessedImage(file)).rejects.toThrow(
      /File size exceeds the limit of 2 MB/,
    )
    expect(mocks.processImageFile).not.toHaveBeenCalled()
    expect(mocks.uploadFile).not.toHaveBeenCalled()
  })

  it('rejects when a processed variant still exceeds the upload limit', async () => {
    const file = jpegFile(6 * MB)
    mocks.processImageFile.mockResolvedValue(processed(3 * MB))

    await expect(uploadProcessedImage(file)).rejects.toThrow(/exceeds the .*MB upload limit/i)
    expect(mocks.uploadFile).not.toHaveBeenCalled()
  })
})


