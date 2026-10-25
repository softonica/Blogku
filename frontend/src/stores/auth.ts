import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getDataSource } from '@/api'
import type { User } from '@/api/types'
import { can } from '@/lib/permissions'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(getDataSource().currentUser())
  const loading = ref(false)
  const error = ref('')

  const isAuthenticated = computed(() => user.value !== null)
  const isAdmin = computed(() => can(user.value?.role, 'manage_settings'))
  const isAuthor = computed(() => can(user.value?.role, 'write_post'))
  const displayName = computed(() => user.value?.name ?? 'Guest')

  async function login(identifier: string, password: string): Promise<User> {
    loading.value = true
    error.value = ''
    try {
      const next = await getDataSource().login(identifier, password)
      user.value = next
      return next
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unable to sign in'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function register(input: {
    name: string
    username: string
    email: string
    password: string
  }): Promise<User> {
    loading.value = true
    error.value = ''
    try {
      const next = await getDataSource().register(input)
      user.value = next
      return next
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unable to create account'
      throw err
    } finally {
      loading.value = false
    }
  }

  function updateProfile(input: {
    name?: string
    bio?: string
    avatar?: string
  }): void {
    if (!user.value) return
    user.value = { ...user.value, ...input }
  }

  async function logout(): Promise<void> {
    await getDataSource().logout()
    user.value = null
  }

  function restore(): void {
    user.value = getDataSource().currentUser()
  }

  return {
    user,
    loading,
    error,
    isAuthenticated,
    isAdmin,
    isAuthor,
    displayName,
    login,
    register,
    updateProfile,
    logout,
    restore,
  }
})
