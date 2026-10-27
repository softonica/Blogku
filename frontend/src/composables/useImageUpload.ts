import { getDataSource } from '@/api'
import { DEFAULT_EDITOR_SETTINGS } from '@/lib/editor-defaults'
import {
  DEFAULT_IMAGE_MAX_DIMENSION,
  DEFAULT_IMAGE_QUALITY,
  isAnimatedImage,
} from '@/lib/imageMeta'
import { inspectImage, processImageFile } from '@/lib/imageProcessor'
import { encodeImageVariants } from '@/lib/imageVariants'

export interface ImageSettings {
  maxImageUploadSize: number
  imageMaxDimension: number
  imageQuality: number
}

export interface UploadedImage {
  full: string
  thumb?: string
  medium?: string
  passthrough?: boolean
}

const SETTINGS_TTL_MS = 30_000

let settingsCache: ImageSettings | null = null
let settingsCachedAt = 0
let settingsRequest: Promise<ImageSettings> | null = null

function fallbackSettings(): ImageSettings {
  return {
    maxImageUploadSize: DEFAULT_EDITOR_SETTINGS.maxImageUploadSize,
    imageMaxDimension: DEFAULT_IMAGE_MAX_DIMENSION,
    imageQuality: DEFAULT_IMAGE_QUALITY,
  }
}

export async function loadImageSettings(force = false): Promise<ImageSettings> {
  const fresh = settingsCache && Date.now() - settingsCachedAt < SETTINGS_TTL_MS
  if (!force && fresh) return settingsCache as ImageSettings
  if (!force && settingsRequest) return settingsRequest

  settingsRequest = (async () => {
    try {
      const settings = await getDataSource().getEditorSettings()
      const resolved: ImageSettings = {
        maxImageUploadSize:
          settings.maxImageUploadSize ?? DEFAULT_EDITOR_SETTINGS.maxImageUploadSize,
        imageMaxDimension: settings.imageMaxDimension || DEFAULT_IMAGE_MAX_DIMENSION,
        imageQuality: settings.imageQuality || DEFAULT_IMAGE_QUALITY,
      }
      settingsCache = resolved
      settingsCachedAt = Date.now()
      return resolved
    } catch {
      return fallbackSettings()
    } finally {
      settingsRequest = null
    }
  })()

  return settingsRequest
}

export function resetImageSettingsCache(): void {
  settingsCache = null
  settingsCachedAt = 0
  settingsRequest = null
}

export async function uploadProcessedImage(
  file: File,
  options: { maxBytes?: number } = {},
): Promise<UploadedImage> {
  const settings = await loadImageSettings()
  const maxBytes = options.maxBytes ?? settings.maxImageUploadSize
  const inspected = await inspectImage(file, { maxBytes })

  if (isAnimatedImage(inspected.info)) {
    const original = await getDataSource().uploadFile(file)
    return { full: original.url, passthrough: true }
  }

  const processed = await processImageFile(file, inspected, {
    maxDimension: settings.imageMaxDimension,
    quality: settings.imageQuality,
  })

  const source = getDataSource()
  const widthOf = (key: 'thumb' | 'medium' | 'full'): number =>
    processed.plan.find((item) => item.key === key)?.width ?? 0

  // Reuse a single upload when variants resolve to the same width (small
  // source images) so we never store byte-identical copies.
  const pending = new Map<number, Promise<string>>()
  const upload = (file: File, width: number): Promise<string> => {
    const existing = pending.get(width)
    if (existing) return existing
    const request = source.uploadFile(file).then((result) => result.url)
    pending.set(width, request)
    return request
  }

  const [thumb, medium, full] = await Promise.all([
    upload(processed.thumb, widthOf('thumb')),
    upload(processed.medium, widthOf('medium')),
    upload(processed.full, widthOf('full')),
  ])

  const fullWidth = widthOf('full')
  const encodedFull = full.startsWith('data:')
    ? full
    : encodeImageVariants(full, { thumb, medium, fullWidth })

  return {
    full: encodedFull,
    thumb,
    medium,
  }
}
