import { unref, watchEffect, type MaybeRef } from 'vue'
import { useSiteName } from './useSiteName'

export function useDocumentTitle(title: MaybeRef<string>): void {
  const siteName = useSiteName()

  watchEffect(() => {
    const value = unref(title)
    document.title = value
      ? `${value} — ${siteName.value}`
      : `${siteName.value} — Magazine & Blog`
  })
}
