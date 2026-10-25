<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { KeyRound, MailCheck, Send } from 'lucide-vue-next'
import { firstError, resetPasswordSchema } from '@/lib/validation'
import { getDataSource } from '@/api'
import { useRateLimit } from '@/composables/useRateLimit'
import AuthShell from '@/components/layout/AuthShell.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const route = useRoute()
const { retryAfter, isLimited, start: startRateLimit } = useRateLimit()
const token = computed(() =>
  typeof route.query.token === 'string' ? route.query.token : '',
)
const isConfirm = computed(() => Boolean(token.value))

const email = ref('')
const password = ref('')
const confirm = ref('')
const error = ref('')
const sent = ref(false)
const loading = ref(false)

async function requestReset(): Promise<void> {
  error.value = ''
  const parsed = resetPasswordSchema.safeParse({ email: email.value })
  if (!parsed.success) {
    error.value = firstError(parsed.error)
    return
  }
  loading.value = true
  try {
    await getDataSource().requestPasswordReset(parsed.data.email)
    sent.value = true
  } catch (err) {
    startRateLimit(err)
    error.value = err instanceof Error ? err.message : 'Failed to send reset link.'
  } finally {
    loading.value = false
  }
}

async function confirmReset(): Promise<void> {
  error.value = ''
  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters'
    return
  }
  if (password.value !== confirm.value) {
    error.value = 'Passwords do not match'
    return
  }
  loading.value = true
  try {
    await getDataSource().confirmPasswordReset(token.value, password.value)
    sent.value = true
  } catch (err) {
    startRateLimit(err)
    error.value = err instanceof Error ? err.message : 'Failed to reset password.'
  } finally {
    loading.value = false
  }
}

const subtitle = computed(() =>
  isConfirm.value
    ? 'Choose a new password for your account.'
    : 'Enter your email and we will send a reset link.',
)

const title = computed(() =>
  isConfirm.value ? 'Set a new password' : 'Reset your password',
)
</script>

<template>
  <AuthShell :title="title" :subtitle="subtitle">
    <div
      v-if="sent"
      class="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
    >
      <MailCheck v-if="!isConfirm" class="h-6 w-6" aria-hidden="true" />
      <KeyRound v-else class="h-6 w-6" aria-hidden="true" />
      <p class="mt-3 font-semibold">
        {{ isConfirm ? 'Password updated' : 'Check your inbox' }}
      </p>
      <p class="mt-1">
        <template v-if="isConfirm">
          Your password has been reset. You can now sign in with your new password.
        </template>
        <template v-else>
          If an account exists for {{ email }}, a reset link is on its way.
        </template>
      </p>
    </div>

    <form
      v-else
      class="space-y-4"
      novalidate
      @submit.prevent="isConfirm ? confirmReset() : requestReset()"
    >
      <template v-if="isConfirm">
        <div>
          <label for="reset-password" class="mb-1.5 block text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            New password
          </label>
          <input
            id="reset-password"
            v-model="password"
            type="password"
            autocomplete="new-password"
            class="h-11 w-full rounded-2xl border-neutral-300 bg-white text-sm text-neutral-900 focus:border-primary-400 focus:ring-primary-200 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900"
          />
        </div>
        <div>
          <label for="reset-confirm" class="mb-1.5 block text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            Confirm new password
          </label>
          <input
            id="reset-confirm"
            v-model="confirm"
            type="password"
            autocomplete="new-password"
            class="h-11 w-full rounded-2xl border-neutral-300 bg-white text-sm text-neutral-900 focus:border-primary-400 focus:ring-primary-200 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900"
          />
        </div>
      </template>

      <div v-else>
        <label for="reset-email" class="mb-1.5 block text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          Email address
        </label>
        <input
          id="reset-email"
          v-model="email"
          type="email"
          autocomplete="email"
          class="h-11 w-full rounded-2xl border-neutral-300 bg-white text-sm text-neutral-900 focus:border-primary-400 focus:ring-primary-200 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900"
        />
      </div>

      <p v-if="error" class="text-sm font-medium text-rose-500">{{ error }}</p>
      <BaseButton type="submit" block size="lg" :disabled="loading || isLimited">
        <Send class="h-4 w-4" aria-hidden="true" />
        {{
          isLimited
            ? `Try again in ${retryAfter}s`
            : isConfirm
              ? 'Reset password'
              : 'Send reset link'
        }}
      </BaseButton>
    </form>

    <template #footer>
      Remembered it?
      <RouterLink to="/login" class="font-semibold text-primary-600 dark:text-primary-300">
        Back to sign in
      </RouterLink>
    </template>
  </AuthShell>
</template>
