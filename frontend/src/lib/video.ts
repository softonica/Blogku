/**
 * Extract YouTube or Vimeo embed URL from various URL formats.
 */
export function getEmbedUrl(url?: string): string | null {
  if (!url) return null
  const trimmed = url.trim()

  // YouTube standard: https://www.youtube.com/watch?v=VIDEO_ID or https://youtu.be/VIDEO_ID or embed
  const ytMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i,
  )
  if (ytMatch?.[1]) {
    return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`
  }

  // Vimeo: https://vimeo.com/VIDEO_ID
  const vimeoMatch = trimmed.match(
    /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^/]*)\/videos\/|album\/(?:\d+)\/video\/|)(\d+)/i,
  )
  if (vimeoMatch?.[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`
  }

  return null
}
