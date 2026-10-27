import { encodeVariants } from './imageEncoder'
import {
  computeVariantPlan,
  inspectImageFile,
  type ImageInspection,
  type VariantPlanItem,
} from './imageMeta'

export interface ProcessedImageFiles {
  thumb: File
  medium: File
  full: File
  plan: VariantPlanItem[]
}

export interface ProcessImageOptions {
  maxDimension: number
  quality: number
}

type WorkerRequest = {
  id: number
  bitmap: ImageBitmap
  plan: VariantPlanItem[]
  quality: number
}

interface EncodedVariantPayload {
  key: VariantPlanItem['key']
  width: number
  height: number
  bytes: ArrayBuffer
}

type WorkerResponse =
  | { id: number; ok: true; variants: EncodedVariantPayload[] }
  | { id: number; ok: false; error: string }

let workerRef: Worker | null = null
let requestId = 0
let processingQueue: Promise<unknown> = Promise.resolve()

function getWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null
  if (!workerRef) {
    workerRef = new Worker(new URL('../workers/imageProcessor.worker.ts', import.meta.url), {
      type: 'module',
    })
  }
  return workerRef
}

export function disposeImageWorker(): void {
  if (!workerRef) return
  workerRef.terminate()
  workerRef = null
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', disposeImageWorker)
}

function runInWorker(
  bitmap: ImageBitmap,
  plan: VariantPlanItem[],
  quality: number,
): Promise<EncodedVariantPayload[]> {
  const worker = getWorker()
  if (!worker) {
    return Promise.reject(new Error('Web Worker is not available in this browser.'))
  }

  const id = ++requestId
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      worker.removeEventListener('message', onMessage)
      worker.removeEventListener('error', onError)
    }
    const onMessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.id !== id) return
      cleanup()
      if (event.data.ok) resolve(event.data.variants)
      else reject(new Error(event.data.error))
    }
    const onError = () => {
      cleanup()
      reject(new Error('Image processing worker failed.'))
    }

    worker.addEventListener('message', onMessage)
    worker.addEventListener('error', onError)
    worker.postMessage({ id, bitmap, plan, quality } satisfies WorkerRequest, [bitmap])
  })
}

export async function inspectImage(
  file: File,
  options: { maxBytes?: number } = {},
): Promise<ImageInspection> {
  return inspectImageFile(file, options)
}

function baseName(name: string): string {
  const withoutExt = name.replace(/\.[^.]+$/, '')
  const safe = withoutExt.replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return safe || 'image'
}

function toFile(bytes: ArrayBuffer, name: string): File {
  return new File([bytes], name, { type: 'image/webp', lastModified: Date.now() })
}

export function processImageFile(
  file: File,
  inspected: ImageInspection,
  options: ProcessImageOptions,
): Promise<ProcessedImageFiles> {
  // One image at a time: the worker is terminated between tasks to free the
  // WASM heap, so concurrent calls must not share it.
  const task = processingQueue.then(
    () => processImageInternal(file, inspected, options),
    () => processImageInternal(file, inspected, options),
  )
  processingQueue = task.catch(() => undefined)
  return task
}

async function processImageInternal(
  file: File,
  inspected: ImageInspection,
  options: ProcessImageOptions,
): Promise<ProcessedImageFiles> {
  const { info } = inspected

  if (typeof createImageBitmap !== 'function') {
    throw new Error('This browser cannot decode the selected image.')
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('The selected file is not a valid image.')
  }

  const width = info.width > 0 ? info.width : bitmap.width
  const height = info.height > 0 ? info.height : bitmap.height
  const plan = computeVariantPlan(width, height, options.maxDimension)

  let variants: EncodedVariantPayload[]

  try {
    variants = await runInWorker(bitmap, plan, options.quality)
  } catch {
    bitmap = await createImageBitmap(file)
    variants = await encodeVariants(bitmap, plan, options.quality)
  } finally {
    bitmap.close?.()
  }

  const name = baseName(file.name)
  const byKey = new Map(variants.map((variant) => [variant.key, variant]))

  const thumb = byKey.get('thumb')
  const medium = byKey.get('medium')
  const full = byKey.get('full')
  if (!thumb || !medium || !full) {
    throw new Error('Image processing did not produce all variants.')
  }

  return {
    thumb: toFile(thumb.bytes, `ncmaz-thumb-${name}.webp`),
    medium: toFile(medium.bytes, `ncmaz-medium-${name}.webp`),
    full: toFile(full.bytes, `${name}.webp`),
    plan,
  }
}
