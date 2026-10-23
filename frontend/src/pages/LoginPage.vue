<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Eye, EyeOff, LogIn } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { firstError, loginSchema } from '@/lib/validation'
import { getErrorMessage } from '@/lib/format'
import { can } from '@/lib/permissions'
import AuthShell from '@/components/layout/AuthShell.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const auth = useAuthStore()
const ui = useUiStore()
const router = useRouter()
const route = useRoute()

const identifier = ref('demo')
const password = ref('demo')
const showPassword = ref(false)
const error = ref('')

async function submit(): Promise<void> {
  error.value = ''
  const parsed = loginSchema.safeParse({
    identifier: identifier.value,
    password: password.value,
  })
  if (!parsed.success) {
    error.value = firstError(parsed.error)
    return
  }
  try {
    await auth.login(parsed.data.identifier, parsed.data.password)
    ui.notify('Welcome back.')
    const redirect = route.query.redirect
    const defaultTarget = can(auth.user?.role, 'write_post')
      ? { name: 'dashboard' }
      : { name: 'profile' }
    await router.push(
      typeof redirect === 'string' && redirect.startsWith('/')
        ? redirect
        : defaultTarget,
    )
  } catch (err) {
    error.value = getErrorMessage(err)
  }
}
</script>

<template>
  <AuthShell
    title="Welcome back"
    subtitle="Sign in to comment, like stories and keep your bookmarks."
  >
    <form class="space-y-4" novalidate @submit.prevent="submit">
      <div>
        <label for="login-identifier" class="mb-1.5 block text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          Username or email
        </label>
        <input
          id="login-identifier"
          v-model="identifier"
          type="text"
          autocomplete="username"
          class="h-11 w-full rounded-2xl border-neutral-300 bg-white text-sm text-neutral-900 focus:border-primary-400 focus:ring-primary-200 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900"
        />
      </div>

      <div>
        <div class="mb-1.5 flex items-center justify-between">
          <label for="login-password" class="block text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            Password
          </label>
          <RouterLink
            to="/reset-password"
            class="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-300"
          >
            Forgot?
          </RouterLink>
        </div>
        <div class="relative">
          <input
            id="login-password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="current-password"
            class="h-11 w-full rounded-2xl border-neutral-300 bg-white pe-11 text-sm text-neutral-900 focus:border-primary-400 focus:ring-primary-200 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900"
          />
          <button
            type="button"
            class="absolute inset-y-0 end-0 flex w-11 items-center justify-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            :aria-label="showPassword ? 'Hide password' : 'Show password'"
            @click="showPassword = !showPassword"
          >
            <EyeOff v-if="showPassword" class="h-4 w-4" aria-hidden="true" />
            <Eye v-else class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <p v-if="error" class="text-sm font-medium text-rose-500">{{ error }}</p>

      <BaseButton type="submit" block size="lg" :disabled="auth.loading">
        <LogIn class="h-4 w-4" aria-hidden="true" />
        {{ auth.loading ? 'Signing in…' : 'Sign in' }}
      </BaseButton>
    </form>

    <div
      class="mt-5 rounded-2xl border border-primary-100 bg-primary-50 p-4 text-xs leading-relaxed text-primary-800 dark:border-primary-900 dark:bg-primary-950 dark:text-primary-200"
    >
      <p class="font-semibold">Demo account: Try sign in with <code class="font-mono">demo / demo</code></p>
      <div class="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-xl bg-white px-2.5 py-1 text-xs font-semibold shadow-xs hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
          @click="identifier = 'demo'; password = 'demo'"
        >
          demo <span class="text-neutral-400 font-normal">(Penulis demo/demo)</span>
        </button>
        <button
          type="button"
          class="rounded-xl bg-white px-2.5 py-1 text-xs font-semibold shadow-xs hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
          @click="identifier = 'admin'; password = 'password'"
        >
          admin <span class="text-neutral-400 font-normal">(Admin)</span>
        </button>
        <button
          type="button"
          class="rounded-xl bg-white px-2.5 py-1 text-xs font-semibold shadow-xs hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
          @click="identifier = 'subscriber'; password = 'password'"
        >
          subscriber <span class="text-neutral-400 font-normal">(Reader)</span>
        </button>
      </div>
    </div>

    <template #footer>
      New to Ncmaz?
      <RouterLink to="/sign-up" class="font-semibold text-primary-600 dark:text-primary-300">
        Create an account
      </RouterLink>
    </template>
  </AuthShell>
</template>
