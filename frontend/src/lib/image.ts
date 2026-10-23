const DEFAULT_WIDTHS = [400, 800, 1200, 1600]

export function imageUrl(src: string, width: number): string {
  if (!src) return ''
  if (/[?&]w=\d+/.test(src)) {
    return src.replace(/([?&])w=\d+/, `$1w=${width}`)
  }
  if (src.includes('images.pexels.com')) {
    return `${src}${src.includes('?') ? '&' : '?'}auto=compress&cs=tinysrgb&w=${width}`
  }
  return src
}

export function buildSrcSet(
  src: string,
  widths: number[] = DEFAULT_WIDTHS,
): string | undefined {
  if (!src) return undefined
  const canResize = /[?&]w=\d+/.test(src) || src.includes('images.pexels.com')
  if (!canResize) return undefined
  return widths.map((width) => `${imageUrl(src, width)} ${width}w`).join(', ')
}

export function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url)
}
