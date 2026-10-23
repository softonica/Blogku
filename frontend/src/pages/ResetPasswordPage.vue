<script setup lang="ts">
import { ref } from 'vue'
import { MailCheck, Send } from 'lucide-vue-next'
import { firstError, resetPasswordSchema } from '@/lib/validation'
import AuthShell from '@/components/layout/AuthShell.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const email = ref('')
const error = ref('')
const sent = ref(false)

function submit(): void {
  error.value = ''
  const parsed = resetPasswordSchema.safeParse({ email: email.value })
  if (!parsed.success) {
    error.value = firstError(parsed.error)
    return
  }
  sent.value = true
}
</script>

<template>
  <AuthShell
    title="Reset your password"
    subtitle="Enter your email and we will send a reset link. In phase 1 this is simulated."
  >
    <div
      v-if="sent"
      class="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
    >
      <MailCheck class="h-6 w-6" aria-hidden="true" />
      <p class="mt-3 font-semibold">Check your inbox</p>
      <p class="mt-1">
        If an account exists for {{ email }}, a reset link would be on its way.
        No email was sent in this mock.
      </p>
    </div>

    <form v-else class="space-y-4" novalidate @submit.prevent="submit">
      <div>
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
      <BaseButton type="submit" block size="lg">
        <Send class="h-4 w-4" aria-hidden="true" />
        Send reset link
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
