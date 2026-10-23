import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getDataSource } from '@/api'
import type { Role, User } from '@/api/types'
import { can } from '@/lib/permissions'

const LOCAL_USER_KEY = 'ncmaz.mock.local-user.v1'

function normalizeRole(role: unknown): Role {
  if (role === 'admin' || role === 'penulis' || role === 'subscriber') {
    return role
  }
  if (role === 'author') return 'penulis'
  return 'subscriber'
}

function readLocalUser(): User | null {
  try {
    const raw = localStorage.getItem(LOCAL_USER_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as User
    return { ...parsed, role: normalizeRole(parsed.role) }
  } catch {
    return null
  }
}

function currentUserWithOverrides(): User | null {
  const sourceUser = getDataSource().currentUser()
  const localUser = readLocalUser()
  if (!sourceUser) return localUser
  if (localUser && localUser.id === sourceUser.id) {
    return { ...sourceUser, ...localUser, role: sourceUser.role }
  }
  return sourceUser
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(currentUserWithOverrides())
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

  function register(input: {
    name: string
    username: string
    email: string
  }): User {
    const next: User = {
      id: `local_${Date.now()}`,
      username: input.username,
      name: input.name,
      email: input.email,
      avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=256&h=256&q=80',
      bio: 'New member. This account exists only in the phase 1 mock.',
      role: 'subscriber',
    }
    user.value = next
    try {
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(next))
    } catch {
      /* ignore storage errors */
    }
    return next
  }

  function updateProfile(input: {
    name?: string
    bio?: string
    avatar?: string
  }): void {
    if (!user.value) return
    user.value = { ...user.value, ...input }
    try {
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user.value))
    } catch {
      /* ignore storage errors */
    }
  }

  async function logout(): Promise<void> {
    await getDataSource().logout()
    user.value = null
    try {
      localStorage.removeItem(LOCAL_USER_KEY)
    } catch {
      /* ignore storage errors */
    }
  }

  function restore(): void {
    user.value = currentUserWithOverrides()
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
