import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getDataSource } from '@/api'
import type { EditorSettings } from '@/api/types'
import { DEFAULT_EDITOR_SETTINGS } from '@/lib/editor-defaults'

export const useEditorSettingsStore = defineStore('editor-settings', () => {
  const settings = ref<EditorSettings>({ ...DEFAULT_EDITOR_SETTINGS })
  const loaded = ref(false)

  async function load(): Promise<void> {
    try {
      settings.value = await getDataSource().getEditorSettings()
    } catch {
      // keep defaults
    } finally {
      loaded.value = true
    }
  }

  return { settings, loaded, load }
})
