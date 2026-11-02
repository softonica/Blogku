import { readonly, ref } from 'vue'
import { getDataSource } from '@/api'

const DEFAULT_SITE_NAME = 'Blogku'
const siteName = ref(DEFAULT_SITE_NAME)
let loadPromise: Promise<void> | null = null

/**
 * Loads the public site name once and shares it across the app. Falls back to
 * "Blogku" when settings are unavailable so titles stay branded offline.
 */
export function loadSiteName(): Promise<void> {
  if (!loadPromise) {
    loadPromise = getDataSource()
      .getSiteSettings()
      .then((settings) => {
        const name = settings.siteName?.trim()
        if (name) siteName.value = name
      })
      .catch(() => {
        // Keep the default brand; titles must never break because of settings.
      })
  }
  return loadPromise
}

export function getSiteName(): string {
  return siteName.value
}

export function useSiteName() {
  void loadSiteName()
  return readonly(siteName)
}
