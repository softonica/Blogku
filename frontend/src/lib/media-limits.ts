/**
 * Shared upload constraints for the media library.
 *
 * Centralized so both the mock and PocketBase data sources validate with the
 * same MIME lists and size caps.
 */

export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]

export const AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
]

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024 // 5 MB

export const AUDIO_MAX_BYTES = 20 * 1024 * 1024 // 20 MB
