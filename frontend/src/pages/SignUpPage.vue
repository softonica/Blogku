<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { UserPlus } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { firstError, signUpSchema } from '@/lib/validation'
import AuthShell from '@/components/layout/AuthShell.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const auth = useAuthStore()
const ui = useUiStore()
const router = useRouter()

const name = ref('')
const username = ref('')
const email = ref('')
const password = ref('')
const confirm = ref('')
const error = ref('')

async function submit(): Promise<void> {
  error.value = ''
  const parsed = signUpSchema.safeParse({
    name: name.value,
    username: username.value,
    email: email.value,
    password: password.value,
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
</script>

<template>
  <AuthShell
    title="Create your account"
    subtitle="Phase 1 accounts live only in this browser. Nothing is sent to a server."
  >
    <form class="space-y-4" novalidate @submit.prevent="submit">
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
            v-model="password"
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

    <template #footer>
      Already have an account?
      <RouterLink to="/login" class="font-semibold text-primary-600 dark:text-primary-300">
        Sign in
      </RouterLink>
    </template>
  </AuthShell>
</template>
