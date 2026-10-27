export type ImageFormat = 'jpeg' | 'png' | 'gif' | 'webp' | 'avif' | 'unknown'

export type ImageVariantKey = 'thumb' | 'medium' | 'full'

export interface SniffedImage {
  format: ImageFormat
  width: number
  height: number
  animated: boolean
}

export interface VariantPlanItem {
  key: ImageVariantKey
  width: number
  height: number
}

export const ALLOWED_IMAGE_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
] as const

export const IMAGE_VARIANT_WIDTHS: Record<Exclude<ImageVariantKey, 'full'>, number> = {
  thumb: 320,
  medium: 1024,
}

export const ABSOLUTE_MAX_IMAGE_SIDE = 10000
export const ABSOLUTE_MAX_IMAGE_PIXELS = 24_000_000
export const ABSOLUTE_MAX_UPLOAD_BYTES = 25 * 1024 * 1024
export const DEFAULT_IMAGE_MAX_DIMENSION = 2048
export const DEFAULT_IMAGE_QUALITY = 0.8

export function clampImageMaxDimension(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_IMAGE_MAX_DIMENSION
  return Math.min(4096, Math.max(256, Math.floor(n)))
}

export function clampImageQuality(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_IMAGE_QUALITY
  const clamped = Math.min(1, Math.max(0.1, n))
  return Math.round(clamped * 100) / 100
}

function u16be(view: DataView, offset: number): number {
  return view.getUint16(offset, false)
}

function u32be(view: DataView, offset: number): number {
  return view.getUint32(offset, false)
}

function u16le(view: DataView, offset: number): number {
  return view.getUint16(offset, true)
}

function ascii(view: DataView, offset: number, length: number): string {
  let out = ''
  for (let i = 0; i < length; i++) {
    if (offset + i >= view.byteLength) return out
    out += String.fromCharCode(view.getUint8(offset + i))
  }
  return out
}

function sniffPng(view: DataView): SniffedImage | null {
  if (view.byteLength < 24) return null
  if (
    view.getUint8(0) !== 0x89 ||
    view.getUint8(1) !== 0x50 ||
    view.getUint8(2) !== 0x4e ||
    view.getUint8(3) !== 0x47
  ) {
    return null
  }
  if (ascii(view, 12, 4) !== 'IHDR') return null
  return {
    format: 'png',
    width: u32be(view, 16),
    height: u32be(view, 20),
    animated: false,
  }
}

const JPEG_SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
])

function sniffJpeg(view: DataView): SniffedImage | null {
  if (view.byteLength < 4) return null
  if (view.getUint8(0) !== 0xff || view.getUint8(1) !== 0xd8) return null

  let offset = 2
  while (offset + 3 < view.byteLength) {
    if (view.getUint8(offset) !== 0xff) {
      offset += 1
      continue
    }
    const marker = view.getUint8(offset + 1)
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2
      continue
    }
    if (marker === 0xda || marker === 0xd9) break
    if (offset + 4 > view.byteLength) break
    const segmentLength = u16be(view, offset + 2)
    if (segmentLength < 2) break
    if (JPEG_SOF_MARKERS.has(marker) && offset + 9 <= view.byteLength) {
      return {
        format: 'jpeg',
        height: u16be(view, offset + 5),
        width: u16be(view, offset + 7),
        animated: false,
      }
    }
    offset += 2 + segmentLength
  }
  return null
}

function countGifFrames(view: DataView): number {
  if (view.byteLength < 13) return 0
  const packed = view.getUint8(10)
  let offset = 13
  if (packed & 0x80) {
    const tableSize = 3 * Math.pow(2, (packed & 0x07) + 1)
    offset += tableSize
  }

  let frames = 0
  while (offset < view.byteLength) {
    const block = view.getUint8(offset)
    if (block === 0x3b) break
    if (block === 0x2c) {
      frames += 1
      if (offset + 10 > view.byteLength) break
      const localPacked = view.getUint8(offset + 9)
      offset += 10
      if (localPacked & 0x80) {
        offset += 3 * Math.pow(2, (localPacked & 0x07) + 1)
      }
      if (offset >= view.byteLength) break
      offset += 1
      while (offset < view.byteLength) {
        const size = view.getUint8(offset)
        offset += 1
        if (size === 0) break
        offset += size
      }
      continue
    }
    if (block === 0x21) {
      offset += 2
      while (offset < view.byteLength) {
        const size = view.getUint8(offset)
        offset += 1
        if (size === 0) break
        offset += size
      }
      continue
    }
    break
  }
  return frames
}

function containsAscii(view: DataView, limit: number, needle: string): boolean {
  const end = Math.min(limit, view.byteLength) - needle.length
  for (let i = 0; i <= end; i++) {
    let matched = true
    for (let j = 0; j < needle.length; j++) {
      if (view.getUint8(i + j) !== needle.charCodeAt(j)) {
        matched = false
        break
      }
    }
    if (matched) return true
  }
  return false
}

function sniffGif(view: DataView): SniffedImage | null {
  if (view.byteLength < 13) return null
  const signature = ascii(view, 0, 6)
  if (signature !== 'GIF87a' && signature !== 'GIF89a') return null
  return {
    format: 'gif',
    width: u16le(view, 6),
    height: u16le(view, 8),
    animated: countGifFrames(view) > 1 || containsAscii(view, 4096, 'NETSCAPE2.0'),
  }
}

function sniffWebp(view: DataView): SniffedImage | null {
  if (view.byteLength < 30) return null
  if (ascii(view, 0, 4) !== 'RIFF' || ascii(view, 8, 4) !== 'WEBP') return null
  const chunk = ascii(view, 12, 4)

  if (chunk === 'VP8 ') {
    const width = u16le(view, 26) & 0x3fff
    const height = u16le(view, 28) & 0x3fff
    return { format: 'webp', width, height, animated: false }
  }

  if (chunk === 'VP8L') {
    const bits = view.getUint32(21, true)
    return {
      format: 'webp',
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
      animated: false,
    }
  }

  if (chunk === 'VP8X') {
    const flags = view.getUint8(20)
    const width =
      1 + (view.getUint8(24) | (view.getUint8(25) << 8) | (view.getUint8(26) << 16))
    const height =
      1 + (view.getUint8(27) | (view.getUint8(28) << 8) | (view.getUint8(29) << 16))
    return { format: 'webp', width, height, animated: (flags & 0x02) !== 0 }
  }

  return { format: 'webp', width: 0, height: 0, animated: false }
}

function sniffAvif(view: DataView): SniffedImage | null {
  if (view.byteLength < 12) return null
  if (ascii(view, 4, 4) !== 'ftyp') return null
  const brand = ascii(view, 8, 4)
  if (brand !== 'avif' && brand !== 'avis') return null

  for (let i = 0; i + 16 <= view.byteLength; i++) {
    if (ascii(view, i, 4) !== 'ispe') continue
    return {
      format: 'avif',
      width: u32be(view, i + 8),
      height: u32be(view, i + 12),
      animated: brand === 'avis',
    }
  }
  return { format: 'avif', width: 0, height: 0, animated: brand === 'avis' }
}

export function sniffImage(buffer: ArrayBuffer): SniffedImage | null {
  if (buffer.byteLength < 12) return null
  const view = new DataView(buffer)
  return sniffPng(view) ?? sniffJpeg(view) ?? sniffGif(view) ?? sniffWebp(view) ?? sniffAvif(view)
}

export function isAnimatedImage(info: SniffedImage): boolean {
  return info.format === 'gif' && info.animated
}

export class ImageValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImageValidationError'
  }
}

export interface ImageInspection {
  buffer: ArrayBuffer
  info: SniffedImage
}

export async function inspectImageFile(
  file: File,
  options: { maxBytes?: number } = {},
): Promise<ImageInspection> {
  const configured = options.maxBytes && options.maxBytes > 0 ? options.maxBytes : Infinity
  const maxBytes = Math.min(configured, ABSOLUTE_MAX_UPLOAD_BYTES)
  if (file.size > maxBytes) {
    throw new ImageValidationError(
      `File size exceeds the limit of ${Math.max(1, Math.round(maxBytes / 1024 / 1024))} MB.`,
    )
  }

  if (file.type && file.type === 'image/svg+xml') {
    throw new ImageValidationError('SVG images are not allowed.')
  }

  const buffer = await file.arrayBuffer()
  const info = sniffImage(buffer)
  if (!info) {
    throw new ImageValidationError(
      'Only image files (JPEG, PNG, WebP, GIF, AVIF) are allowed.',
    )
  }

  const dimensionsKnown = info.width > 0 && info.height > 0
  if (dimensionsKnown) {
    if (
      info.width > ABSOLUTE_MAX_IMAGE_SIDE ||
      info.height > ABSOLUTE_MAX_IMAGE_SIDE ||
      info.width * info.height > ABSOLUTE_MAX_IMAGE_PIXELS
    ) {
      throw new ImageValidationError(
        'Image dimensions are too large. Please upload a smaller image.',
      )
    }
  }

  return { buffer, info }
}

export function computeVariantPlan(
  width: number,
  height: number,
  maxDimension: number,
): VariantPlanItem[] {
  const safeWidth = Math.max(1, Math.floor(width) || 1)
  const safeHeight = Math.max(1, Math.floor(height) || 1)
  const maxSide = clampImageMaxDimension(maxDimension)
  const ratio = safeWidth > 0 ? safeHeight / safeWidth : 1

  const scale = (targetWidth: number) => {
    const w = Math.max(1, Math.min(safeWidth, Math.floor(targetWidth)))
    return { width: w, height: Math.max(1, Math.round(w * ratio)) }
  }

  const fullWidth = Math.min(safeWidth, maxSide)
  return [
    { key: 'thumb', ...scale(IMAGE_VARIANT_WIDTHS.thumb) },
    { key: 'medium', ...scale(IMAGE_VARIANT_WIDTHS.medium) },
    { key: 'full', ...scale(fullWidth) },
  ]
}
