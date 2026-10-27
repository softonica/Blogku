import { encodeVariants } from '@/lib/imageEncoder'
import type { VariantPlanItem } from '@/lib/imageMeta'

export interface WorkerRequest {
  id: number
  bitmap: ImageBitmap
  plan: VariantPlanItem[]
  quality: number
}

export type WorkerResponse =
  | {
      id: number
      ok: true
      variants: Array<{
        key: VariantPlanItem['key']
        width: number
        height: number
        bytes: ArrayBuffer
      }>
    }
  | { id: number; ok: false; error: string }

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null
  postMessage: (message: WorkerResponse, transfer?: Transferable[]) => void
}

scope.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, bitmap, plan, quality } = event.data

  void (async () => {
    try {
      const variants = await encodeVariants(bitmap, plan, quality)
      const transfer = variants.map((variant) => variant.bytes)
      scope.postMessage({ id, ok: true, variants }, transfer)
    } catch (err) {
      scope.postMessage({
        id,
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to process the image.',
      })
    } finally {
      bitmap.close?.()
    }
  })()
}
