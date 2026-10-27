import { parseImageVariants, stripImageVariants } from './imageVariants'

const DEFAULT_WIDTHS = [400, 800, 1200, 1600]

export function imageUrl(src: string, width: number): string {
  if (!src) return ''
  const base = stripImageVariants(src)
  if (/[?&]w=\d+/.test(base)) {
    return base.replace(/([?&])w=\d+/, `$1w=${width}`)
  }
  if (base.includes('images.pexels.com')) {
    return `${base}${base.includes('?') ? '&' : '?'}auto=compress&cs=tinysrgb&w=${width}`
  }
  return base
}

export function buildSrcSet(
  src: string,
  widths: number[] = DEFAULT_WIDTHS,
): string | undefined {
  if (!src) return undefined

  const variants = parseImageVariants(src)
  if (variants) {
    const base = stripImageVariants(src)
    const seen = new Set<string>()
    const entries: string[] = []
    const add = (url: string | undefined, width: number) => {
      if (!url || seen.has(url)) return
      seen.add(url)
      entries.push(`${url} ${width}w`)
    }
    add(variants.thumb, 320)
    add(variants.medium, 1024)
    add(base, variants.fullWidth ?? 2048)
    return entries.join(', ')
  }

  const base = stripImageVariants(src)
  const canResize = /[?&]w=\d+/.test(base) || base.includes('images.pexels.com')
  if (!canResize) return undefined
  return widths.map((width) => `${imageUrl(base, width)} ${width}w`).join(', ')
}

export function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url)
}
