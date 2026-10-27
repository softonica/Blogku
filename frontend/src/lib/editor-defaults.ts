import type { EditorSettings } from '@/api/types'

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  placeholder: 'Write your post here…',
  showHeadings: true,
  showFormatting: true,
  showLists: true,
  showBlockquote: true,
  showRule: true,
  showLink: true,
  showImageUpload: true,
  showImageUrl: true,
  showEmoji: true,
  showAlign: true,
  showTable: true,
  autolink: true,
  maxContentLength: 50000,
  maxImageUploadSize: 2 * 1024 * 1024,
  imageMaxDimension: 2048,
  imageQuality: 0.8,
}
