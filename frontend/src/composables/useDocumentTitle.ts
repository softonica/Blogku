import { unref, watchEffect, type MaybeRef } from 'vue'

export function useDocumentTitle(title: MaybeRef<string>): void {
  watchEffect(() => {
    const value = unref(title)
    document.title = value ? `${value} — Ncmaz` : 'Ncmaz — Magazine & Blog'
  })
}
