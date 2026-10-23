<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  Bookmark,
  CheckCircle2,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Save,
  ShieldCheck,
  Upload,
  User as UserIcon,
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useBookmarkStore } from '@/stores/bookmark'
import { useUiStore } from '@/stores/ui'
import { getDataSource } from '@/api'
import { can } from '@/lib/permissions'
import { sanitizePlainText, sanitizeUrl } from '@/lib/sanitize'
import {
  DEFAULT_ALLOWED_IMAGE_DOMAINS,
  extractDomain,
  isAllowedImageDomain,
} from '@/lib/image-domains'
import { useDocumentTitle } from '@/composables/useDocumentTitle'
import AppAvatar from '@/components/ui/AppAvatar.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const bookmarks = useBookmarkStore()
const ui = useUiStore()
const router = useRouter()

const pageTitle = ref('Your Profile')
useDocumentTitle(pageTitle)

const name = ref(auth.user?.name ?? '')
const bio = ref(auth.user?.bio ?? '')
const avatar = ref(auth.user?.avatar ?? '/avatars/1.jpg')
const saving = ref(false)
const saved = ref(false)
const uploadingAvatar = ref(false)
const allowedDomains = ref<string[]>([...DEFAULT_ALLOWED_IMAGE_DOMAINS])

onMounted(async () => {
  try {
    const s = await getDataSource().getSiteSettings()
    if (s.allowedImageDomains?.length) {
      allowedDomains.value = s.allowedImageDomains
    }
  } catch {
    // fallback
  }
})

async function onAvatarUpload(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploadingAvatar.value = true
  try {
    const result = await getDataSource().uploadFile(file)
    avatar.value = result.url
    ui.notify('Avatar uploaded successfully.')
  } catch (err) {
    ui.notify(err instanceof Error ? err.message : 'Failed to upload avatar.', 'error')
  } finally {
    uploadingAvatar.value = false
    input.value = ''
  }
}

watch(
  () => auth.user,
  (curr) => {
    if (curr) {
      name.value = curr.name
      bio.value = curr.bio
      avatar.value = curr.avatar
    }
  },
  { immediate: true },
)

const avatarOptions = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&h=256&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&h=256&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&h=256&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&h=256&q=80',
  'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=256&h=256&q=80',
]

const roleBadgeVariant = computed(() => {
  if (auth.user?.role === 'admin') return 'primary'
  if (auth.user?.role === 'penulis') return 'neutral'
  return 'neutral'
})

const roleDescription = computed(() => {
  switch (auth.user?.role) {
    case 'admin':
      return 'Administrator with full privileges over settings, users, and moderation.'
    case 'penulis':
      return 'Author privileges: write and manage your own stories, drafts, tags, and categories.'
    case 'subscriber':
    default:
      return 'Subscriber privileges: bookmark stories, participate in discussions, and react.'
  }
})

async function saveProfile(): Promise<void> {
  const cleanName = sanitizePlainText(name.value)
  if (!cleanName) {
    ui.notify('Name cannot be empty.', 'error')
    return
  }
  if (avatar.value && !isAllowedImageDomain(avatar.value, allowedDomains.value)) {
    const domain = extractDomain(avatar.value) || 'eksternal'
    ui.notify(
      `Domain gambar "${domain}" tidak diizinkan. Gunakan upload atau hubungi admin.`,
      'error',
    )
    return
  }
  saving.value = true
  try {
    const updated = await getDataSource().updateUserProfile({
      name: cleanName,
      bio: sanitizePlainText(bio.value),
      avatar: sanitizeUrl(avatar.value),
    })
    auth.updateProfile({
      name: updated.name,
      bio: updated.bio,
      avatar: updated.avatar,
    })
    saved.value = true
    ui.notify('Profile updated.')
    setTimeout(() => {
      saved.value = false
    }, 2500)
  } catch (err) {
    ui.notify(err instanceof Error ? err.message : 'Failed to update profile.', 'error')
  } finally {
    saving.value = false
  }
}

async function logout(): Promise<void> {
  await auth.logout()
  ui.notify('Signed out.')
  await router.push({ name: 'home' })
}
</script>

<template>
  <div class="page-shell pb-20">
    <div class="mx-auto max-w-3xl">
      <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-4">
          <AppAvatar :src="avatar" :name="name || 'User'" size="lg" />
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl dark:text-white">
                {{ auth.user?.name }}
              </h1>
              <AppBadge :variant="roleBadgeVariant" class="capitalize">
                {{ auth.user?.role }}
              </AppBadge>
            </div>
            <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              @{{ auth.user?.username }} · {{ auth.user?.email }}
            </p>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <BaseButton
            v-if="can(auth.user?.role, 'write_post')"
            to="/dashboard"
            variant="outline"
            size="sm"
          >
            <LayoutDashboard class="h-4 w-4" aria-hidden="true" />
            Dashboard
          </BaseButton>
          <BaseButton
            v-if="can(auth.user?.role, 'manage_settings')"
            to="/admin/settings"
            variant="outline"
            size="sm"
          >
            <ShieldCheck class="h-4 w-4" aria-hidden="true" />
            Admin
          </BaseButton>
        </div>
      </header>

      <!-- Role summary card -->
      <div class="mt-8 rounded-3xl border border-neutral-200 bg-neutral-50/60 p-5 dark:border-neutral-800 dark:bg-neutral-900/60">
        <div class="flex items-start gap-3">
          <div class="rounded-xl bg-primary-100 p-2 text-primary-700 dark:bg-primary-950 dark:text-primary-300">
            <UserIcon class="h-5 w-5" aria-hidden="true" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between">
              <p class="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Your Role: <span class="capitalize text-neutral-900 dark:text-white">{{ auth.user?.role }}</span>
              </p>
              <span class="text-xs text-neutral-400">
                {{ bookmarks.count }} Bookmarks
              </span>
            </div>
            <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
              {{ roleDescription }}
            </p>
          </div>
        </div>
      </div>

      <!-- Edit profile form -->
      <form class="mt-8 space-y-6 rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8 dark:border-neutral-800 dark:bg-neutral-900" @submit.prevent="saveProfile">
        <h2 class="text-lg font-bold text-neutral-900 dark:text-white">
          Edit Profile Information
        </h2>

        <div>
          <label class="mb-2 block text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            Profile Avatar
          </label>

          <!-- Upload and custom URL -->
          <div class="mb-4 flex flex-wrap items-center gap-3">
            <label
              class="inline-flex h-10 cursor-pointer items-center gap-2 rounded-2xl bg-neutral-100 px-4 text-xs font-semibold text-neutral-800 transition hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
            >
              <Upload class="h-4 w-4" aria-hidden="true" />
              <span>{{ uploadingAvatar ? 'Uploading…' : 'Upload Photo' }}</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                class="sr-only"
                :disabled="uploadingAvatar"
                @change="onAvatarUpload"
              />
            </label>

            <div class="flex-1 min-w-[220px]">
              <input
                v-model="avatar"
                type="url"
                placeholder="Or enter image URL (https://…)"
                class="h-10 w-full rounded-2xl border-neutral-300 bg-white px-3 text-xs text-neutral-900 focus:border-primary-400 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
              />
            </div>
          </div>

          <p class="mb-2 text-xs text-neutral-400">
            Or pick from default preset avatars:
          </p>
          <div class="flex flex-wrap items-center gap-3">
            <button
              v-for="img in avatarOptions"
              :key="img"
              type="button"
              class="relative rounded-full transition ring-offset-2 hover:opacity-80 focus:outline-none dark:ring-offset-neutral-950"
              :class="avatar === img ? 'ring-2 ring-primary-500' : 'opacity-70'"
              @click="avatar = img"
            >
              <AppAvatar :src="img" name="Avatar" size="md" />
            </button>
          </div>
        </div>

        <div>
          <label for="profile-name" class="mb-1.5 block text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            Display Name
          </label>
          <input
            id="profile-name"
            v-model="name"
            type="text"
            required
            maxlength="80"
            class="h-11 w-full rounded-2xl border-neutral-300 bg-white px-4 text-sm text-neutral-900 focus:border-primary-400 focus:ring-primary-200 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900"
          />
        </div>

        <div>
          <label for="profile-bio" class="mb-1.5 block text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            Biography
          </label>
          <textarea
            id="profile-bio"
            v-model="bio"
            rows="3"
            maxlength="300"
            placeholder="Tell us a little bit about yourself."
            class="w-full rounded-2xl border-neutral-300 bg-white p-4 text-sm text-neutral-900 focus:border-primary-400 focus:ring-primary-200 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900"
          ></textarea>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-4 border-t border-neutral-100 pt-5 dark:border-neutral-800">
          <div class="flex items-center gap-3">
            <BaseButton type="submit" size="md" :disabled="saving">
              <CheckCircle2 v-if="saved" class="h-4 w-4" aria-hidden="true" />
              <Save v-else class="h-4 w-4" aria-hidden="true" />
              {{ saving ? 'Saving…' : saved ? 'Saved' : 'Save Changes' }}
            </BaseButton>

            <BaseButton to="/bookmarks" variant="outline" size="md">
              <Bookmark class="h-4 w-4" aria-hidden="true" />
              My Bookmarks
            </BaseButton>
          </div>

          <button
            type="button"
            class="inline-flex items-center gap-2 text-sm font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
            @click="logout"
          >
            <LogOut class="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </form>

      <!-- View public profile link -->
      <div class="mt-6 flex justify-end">
        <RouterLink
          v-if="auth.user?.username"
          :to="`/author/${auth.user.username}`"
          class="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400"
        >
          View public author profile
          <ExternalLink class="h-3.5 w-3.5" aria-hidden="true" />
        </RouterLink>
      </div>
    </div>
  </div>
</template>
