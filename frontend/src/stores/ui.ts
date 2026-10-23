import { ref } from 'vue'
import { defineStore } from 'pinia'

export type Theme = 'light' | 'dark'
export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  message: string
  type: ToastType
}

const THEME_KEY = 'ncmaz.theme'
const TOAST_DURATION = 3800

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'dark' || stored === 'light') return stored
  } catch {
    /* ignore */
  }
  return 'dark'
}

function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.style.colorScheme = theme
}

export const useUiStore = defineStore('ui', () => {
  const theme = ref<Theme>(readTheme())
  const searchOpen = ref(false)
  const mobileNavOpen = ref(false)
  const toasts = ref<Toast[]>([])
  let toastId = 0

  function initTheme(): void {
    applyTheme(theme.value)
  }

  function setTheme(next: Theme): void {
    theme.value = next
    applyTheme(next)
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {
      /* ignore */
    }
  }

  function toggleTheme(): void {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  function openSearch(): void {
    searchOpen.value = true
  }

  function closeSearch(): void {
    searchOpen.value = false
  }

  function toggleMobileNav(): void {
    mobileNavOpen.value = !mobileNavOpen.value
  }

  function closeMobileNav(): void {
    mobileNavOpen.value = false
  }

  function dismissToast(id: number): void {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  function notify(message: string, type: ToastType = 'success'): void {
    const id = ++toastId
    toasts.value = [...toasts.value, { id, message, type }]
    window.setTimeout(() => dismissToast(id), TOAST_DURATION)
  }

  return {
    theme,
    searchOpen,
    mobileNavOpen,
    toasts,
    initTheme,
    setTheme,
    toggleTheme,
    openSearch,
    closeSearch,
    toggleMobileNav,
    closeMobileNav,
    notify,
    dismissToast,
  }
})
