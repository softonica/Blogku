<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Search } from 'lucide-vue-next'
import { getDataSource } from '@/api'
import type { Role, User } from '@/api/types'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { useDocumentTitle } from '@/composables/useDocumentTitle'
import AdminNav from '@/components/admin/AdminNav.vue'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

const ui = useUiStore()
const auth = useAuthStore()
const pageTitle = ref('User Management — Admin')
useDocumentTitle(pageTitle)

const users = ref<User[]>([])
const loading = ref(true)
const searchQuery = ref('')
const updatingId = ref<string | null>(null)

const roles: Role[] = ['subscriber', 'penulis', 'admin']

async function load(): Promise<void> {
  loading.value = true
  try {
    users.value = await getDataSource().listUsers()
  } catch (err) {
    ui.notify(err instanceof Error ? err.message : 'Failed to load users.', 'error')
  } finally {
    loading.value = false
  }
}

onMounted(load)

const filteredUsers = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return users.value
  return users.value.filter(
    (u) =>
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q),
  )
})

async function onRoleChange(user: User, newRole: Role): Promise<void> {
  if (user.role === newRole) return
  if (user.id === auth.user?.id && newRole !== 'admin') {
    ui.notify('You cannot demote your own administrator account.', 'error')
    return
  }
  updatingId.value = user.id
  try {
    const updated = await getDataSource().updateUserRole(user.id, newRole)
    users.value = users.value.map((u) => (u.id === user.id ? updated : u))
    ui.notify(`Updated ${user.name}'s role to ${newRole}.`)
  } catch (err) {
    ui.notify(err instanceof Error ? err.message : 'Failed to update role.', 'error')
    await load()
  } finally {
    updatingId.value = null
  }
}
</script>

<template>
  <div class="page-shell pb-20">
    <div class="mx-auto max-w-5xl">
      <AdminNav />

      <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl dark:text-white">
            User & Role Management
          </h1>
          <p class="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Control user access privileges and RBAC roles (admin, penulis, subscriber).
          </p>
        </div>

        <div class="relative w-full sm:w-64">
          <label for="search-users" class="sr-only">Search users</label>
          <Search class="absolute start-3 top-3 h-4 w-4 text-neutral-400" aria-hidden="true" />
          <input
            id="search-users"
            v-model="searchQuery"
            type="text"
            placeholder="Search users…"
            class="h-10 w-full rounded-2xl border-neutral-300 bg-white ps-9 pe-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-400 focus:ring-primary-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900"
          />
        </div>
      </header>

      <div v-if="loading" class="flex justify-center py-20">
        <LoadingSpinner />
      </div>

      <EmptyState
        v-else-if="!filteredUsers.length"
        class="mt-8"
        title="No users found"
        description="Try adjusting your search query."
      />

      <div
        v-else
        class="mt-8 overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div class="overflow-x-auto">
          <table class="w-full text-start text-sm">
            <thead class="border-b border-neutral-200 bg-neutral-50 text-xs font-bold uppercase tracking-wider text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-400">
              <tr>
                <th scope="col" class="px-6 py-4">User</th>
                <th scope="col" class="px-6 py-4">Email</th>
                <th scope="col" class="px-6 py-4 text-center">Stories</th>
                <th scope="col" class="px-6 py-4">Current Role</th>
                <th scope="col" class="px-6 py-4 text-end">Change Role</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
              <tr
                v-for="user in filteredUsers"
                :key="user.id"
                class="transition hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40"
              >
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <AppAvatar :src="user.avatar" :name="user.name" size="sm" />
                    <div>
                      <p class="font-semibold text-neutral-900 dark:text-white">
                        {{ user.name }}
                      </p>
                      <p class="text-xs text-neutral-400">
                        @{{ user.username }}
                      </p>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 text-neutral-600 dark:text-neutral-300">
                  {{ user.email }}
                </td>
                <td class="px-6 py-4 text-center text-neutral-600 dark:text-neutral-300">
                  {{ user.postCount ?? 0 }}
                </td>
                <td class="px-6 py-4">
                  <AppBadge
                    :variant="user.role === 'admin' ? 'primary' : 'neutral'"
                    class="capitalize"
                  >
                    {{ user.role }}
                  </AppBadge>
                </td>
                <td class="px-6 py-4 text-end">
                  <select
                    :value="user.role"
                    :disabled="updatingId === user.id"
                    aria-label="Select role"
                    class="h-9 rounded-xl border-neutral-300 bg-white px-3 text-xs font-semibold text-neutral-800 focus:border-primary-400 focus:ring-primary-200 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200 dark:focus:border-primary-500 dark:focus:ring-primary-900"
                    @change="onRoleChange(user, ($event.target as HTMLSelectElement).value as Role)"
                  >
                    <option v-for="r in roles" :key="r" :value="r">
                      {{ r }}
                    </option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
