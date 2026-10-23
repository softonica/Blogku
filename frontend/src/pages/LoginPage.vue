<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Eye, EyeOff, LogIn, UserPlus } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { firstError, loginSchema, signUpSchema } from '@/lib/validation'
import { getErrorMessage } from '@/lib/format'
import { can } from '@/lib/permissions'
import AuthShell from '@/components/layout/AuthShell.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const auth = useAuthStore()
const ui = useUiStore()
const router = useRouter()
const route = useRoute()

const mode = ref<'login' | 'register'>(
  route.query.mode === 'register' ? 'register' : 'login',
)

const identifier = ref('demo')
const password = ref('demo')
const showPassword = ref(false)
const error = ref('')

const name = ref('')
const username = ref('')
const email = ref('')
const regPassword = ref('')
const confirm = ref('')

function setMode(next: 'login' | 'register'): void {
  mode.value = next
  error.value = ''
}

async function submitLogin(): Promise<void> {
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

async function submitRegister(): Promise<void> {
  error.value = ''
  const parsed = signUpSchema.safeParse({
    name: name.value,
    username: username.value,
    email: email.value,
    password: regPassword.value,
    confirm: confirm.value,
  })
  if (!parsed.success) {
    error.value = firstError(parsed.error)
    return
  }
  auth.register({
    name: parsed.data.name,
    username: parsed.data.username,
    email: parsed.data.email,
  })
  ui.notify('Account created locally. Welcome to the phase 1 mock.')
  await router.push({ name: 'dashboard' })
}

const inputClass =
  'h-11 w-full rounded-2xl border-neutral-300 bg-white text-sm text-neutral-900 focus:border-primary-400 focus:ring-primary-200 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900'
const labelClass =
  'mb-1.5 block text-sm font-semibold text-neutral-800 dark:text-neutral-200'
const tabClass =
  'flex-1 rounded-xl py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400'
</script>

<template>
  <AuthShell
    :title="mode === 'login' ? 'Welcome back' : 'Create your account'"
    :subtitle="
      mode === 'login'
        ? 'Sign in to comment, like posts and keep your bookmarks.'
        : 'Phase 1 accounts live only in this browser. Nothing is sent to a server.'
    "
  >
    <div
      class="mb-6 grid grid-cols-2 gap-1 rounded-2xl border border-neutral-200 bg-neutral-50 p-1 dark:border-neutral-800 dark:bg-neutral-950"
      role="tablist"
      aria-label="Authentication mode"
    >
      <button
        type="button"
        role="tab"
        :aria-selected="mode === 'login'"
        :class="[
          tabClass,
          mode === 'login'
            ? 'bg-white text-neutral-900 shadow-xs dark:bg-neutral-800 dark:text-white'
            : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200',
        ]"
        @click="setMode('login')"
      >
        Log in
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="mode === 'register'"
        :class="[
          tabClass,
          mode === 'register'
            ? 'bg-white text-neutral-900 shadow-xs dark:bg-neutral-800 dark:text-white'
            : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200',
        ]"
        @click="setMode('register')"
      >
        Sign up
      </button>
    </div>

    <form v-if="mode === 'login'" class="space-y-4" novalidate @submit.prevent="submitLogin">
      <div>
        <label for="login-identifier" :class="labelClass">Username or email</label>
        <input
          id="login-identifier"
          v-model="identifier"
          type="text"
          autocomplete="username"
          :class="inputClass"
        />
      </div>

      <div>
        <div class="mb-1.5 flex items-center justify-between">
          <label for="login-password" :class="labelClass">Password</label>
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
            :class="[inputClass, 'pe-11']"
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

    <form v-else class="space-y-4" novalidate @submit.prevent="submitRegister">
      <div>
        <label for="signup-name" :class="labelClass">Name</label>
        <input id="signup-name" v-model="name" type="text" autocomplete="name" :class="inputClass" />
      </div>
      <div>
        <label for="signup-username" :class="labelClass">Username</label>
        <input
          id="signup-username"
          v-model="username"
          type="text"
          autocomplete="username"
          placeholder="lowercase-with-dashes"
          :class="inputClass"
        />
      </div>
      <div>
        <label for="signup-email" :class="labelClass">Email</label>
        <input id="signup-email" v-model="email" type="email" autocomplete="email" :class="inputClass" />
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label for="signup-password" :class="labelClass">Password</label>
          <input
            id="signup-password"
            v-model="regPassword"
            type="password"
            autocomplete="new-password"
            :class="inputClass"
          />
        </div>
        <div>
          <label for="signup-confirm" :class="labelClass">Confirm</label>
          <input
            id="signup-confirm"
            v-model="confirm"
            type="password"
            autocomplete="new-password"
            :class="inputClass"
          />
        </div>
      </div>

      <p v-if="error" class="text-sm font-medium text-rose-500">{{ error }}</p>

      <BaseButton type="submit" block size="lg">
        <UserPlus class="h-4 w-4" aria-hidden="true" />
        Create account
      </BaseButton>
    </form>

    <div
      v-if="mode === 'login'"
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
  </AuthShell>
</template>
