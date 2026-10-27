import type { ImageVariantKey, VariantPlanItem } from './imageMeta'

export interface EncodedVariant {
  key: ImageVariantKey
  width: number
  height: number
  bytes: ArrayBuffer
}

type AnyCanvas = OffscreenCanvas | HTMLCanvasElement
type AnyContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

interface CanvasBundle {
  canvas: AnyCanvas
  ctx: AnyContext
}

interface WebpCodecs {
  encode: (data: ImageData, options?: { quality?: number }) => Promise<ArrayBuffer>
  resize: (
    data: ImageData,
    options: {
      width: number
      height: number
      method?: string
      fitMethod?: 'stretch' | 'contain'
      premultiply?: boolean
      linearRGB?: boolean
    },
  ) => Promise<ImageData>
}

function createCanvas(width: number, height: number): CanvasBundle {
  const w = Math.max(1, width)
  const h = Math.max(1, height)

  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(w, h)
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (ctx) return { canvas, ctx }
  }

  if (typeof document === 'undefined') {
    throw new Error('Canvas is not available in this environment.')
  }
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas 2D is not available in this browser.')
  return { canvas, ctx }
}

async function canvasToWebp(canvas: AnyCanvas, quality: number): Promise<ArrayBuffer> {
  if ('convertToBlob' in canvas) {
    const blob = await canvas.convertToBlob({ type: 'image/webp', quality })
    return blob.arrayBuffer()
  }

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/webp', quality)
  })
  if (!blob) throw new Error('Failed to encode the image.')
  return blob.arrayBuffer()
}

async function loadCodecs(): Promise<WebpCodecs | null> {
  try {
    const [webp, resizeModule] = await Promise.all([
      import('@jsquash/webp'),
      import('@jsquash/resize'),
    ])
    if (typeof webp.encode !== 'function' || typeof resizeModule.default !== 'function') {
      return null
    }
    return {
      encode: webp.encode as WebpCodecs['encode'],
      resize: resizeModule.default as WebpCodecs['resize'],
    }
  } catch {
    // WASM codec unavailable — the canvas encoder below is the fallback.
    return null
  }
}

export async function encodeVariants(
  bitmap: ImageBitmap,
  plan: VariantPlanItem[],
  quality: number,
): Promise<EncodedVariant[]> {
  const codecs = await loadCodecs()

  const { ctx: sourceCtx } = createCanvas(bitmap.width, bitmap.height)
  sourceCtx.drawImage(bitmap, 0, 0)
  const source = sourceCtx.getImageData(0, 0, bitmap.width, bitmap.height)

  const results: EncodedVariant[] = []
  const encoded = new Map<string, ArrayBuffer>()

  for (const item of plan) {
    const cacheKey = `${item.width}x${item.height}`
    const cached = encoded.get(cacheKey)
    if (cached) {
      results.push({ ...item, bytes: cached })
      continue
    }

    if (codecs) {
      try {
        const sameSize = item.width === bitmap.width && item.height === bitmap.height
        const resized = sameSize
          ? source
          : await codecs.resize(source, {
              width: item.width,
              height: item.height,
              method: 'lanczos3',
              fitMethod: 'stretch',
              premultiply: true,
              linearRGB: true,
            })
        const bytes = await codecs.encode(resized, {
          quality: Math.round(quality * 100),
        })
        encoded.set(cacheKey, bytes)
        results.push({ ...item, bytes })
        continue
      } catch {
        // fall through to the canvas encoder for every remaining variant
      }
    }

    const { canvas, ctx } = createCanvas(item.width, item.height)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, 0, 0, item.width, item.height)
    const bytes = await canvasToWebp(canvas, quality)
    encoded.set(cacheKey, bytes)
    results.push({ ...item, bytes })
  }

  return results
}
