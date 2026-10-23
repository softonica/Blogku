<script setup lang="ts">
import { ref } from 'vue'
import { Check, Send } from 'lucide-vue-next'
import { firstError, newsletterSchema } from '@/lib/validation'
import { useUiStore } from '@/stores/ui'

withDefaults(
  defineProps<{
    inverted?: boolean
    compact?: boolean
  }>(),
  { inverted: false, compact: false },
)

const ui = useUiStore()
const email = ref('')
const error = ref('')
const subscribed = ref(false)

function submit(): void {
  error.value = ''
  const parsed = newsletterSchema.safeParse({ email: email.value })
  if (!parsed.success) {
    error.value = firstError(parsed.error)
    return
  }
  subscribed.value = true
  email.value = ''
  ui.notify('You are on the list. (Mock — no email was sent.)')
}
</script>

<template>
  <form class="w-full" novalidate @submit.prevent="submit">
    <div
      class="flex flex-col gap-2 sm:flex-row"
      :class="compact ? '' : 'sm:gap-2'"
    >
      <label class="sr-only" :for="`newsletter-${compact ? 'compact' : 'full'}`">
        Email address
      </label>
      <input
        :id="`newsletter-${compact ? 'compact' : 'full'}`"
        v-model="email"
        type="email"
        autocomplete="email"
        placeholder="you@example.com"
        class="h-11 flex-1 rounded-full border px-4 text-sm outline-none transition focus:ring-2"
        :class="
          inverted
            ? 'border-white/20 bg-white/10 text-white placeholder:text-neutral-400 focus:border-white/40 focus:ring-white/20'
            : 'border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 focus:border-primary-400 focus:ring-primary-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:focus:border-primary-500 dark:focus:ring-primary-900'
        "
      />
      <button
        type="submit"
        class="inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition"
        :class="
          inverted
            ? 'bg-white text-neutral-900 hover:bg-neutral-100'
            : 'bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-600 dark:text-white dark:hover:bg-primary-500'
        "
      >
        <Check v-if="subscribed" class="h-4 w-4" aria-hidden="true" />
        <Send v-else class="h-4 w-4" aria-hidden="true" />
        {{ subscribed ? 'Subscribed' : 'Subscribe' }}
      </button>
    </div>
    <p v-if="error" class="mt-2 text-xs font-medium text-rose-500">
      {{ error }}
    </p>
    <p v-else-if="subscribed" class="mt-2 text-xs text-emerald-500">
      Thanks — this is a phase 1 mock.
    </p>
  </form>
</template>
