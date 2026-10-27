export interface ImageVariants {
  thumb?: string
  medium?: string
  fullWidth?: number
}

const HASH_PREFIX = 'imgv1'

/**
 * Variant URLs are embedded in the fragment of the stored image URL.
 * Fragments are never sent to the server, so PocketBase serves the original
 * file and the client can build a srcset without any schema change.
 */
export function encodeImageVariants(fullUrl: string, variants: ImageVariants): string {
  const base = fullUrl.split('#')[0]
  if (!base) return ''
  const params = new URLSearchParams()
  if (variants.thumb) params.set('t', variants.thumb)
  if (variants.medium) params.set('m', variants.medium)
  if (variants.fullWidth) params.set('w', String(Math.round(variants.fullWidth)))
  const query = params.toString()
  return query ? `${base}#${HASH_PREFIX}&${query}` : base
}

export function stripImageVariants(url: string): string {
  if (!url) return ''
  return url.split('#')[0]
}

function safeVariantUrl(value: string | null): string | undefined {
  if (!value) return undefined
  if (/[\s,]/.test(value)) return undefined
  if (value.startsWith('/') && !value.startsWith('//')) return value
  try {
    const parsed = new URL(value)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return value
  } catch {
    return undefined
  }
  return undefined
}

export function parseImageVariants(url: string): ImageVariants | null {
  if (!url) return null
  const index = url.indexOf('#')
  if (index === -1) return null

  const hash = url.slice(index + 1)
  if (!hash.startsWith(`${HASH_PREFIX}&`)) return null

  const params = new URLSearchParams(hash.slice(HASH_PREFIX.length + 1))
  const thumb = safeVariantUrl(params.get('t'))
  const medium = safeVariantUrl(params.get('m'))
  if (!thumb && !medium) return null

  const width = Number(params.get('w'))
  return {
    thumb,
    medium,
    fullWidth: Number.isFinite(width) && width >= 1 && width <= 8192 ? width : undefined,
  }
}
