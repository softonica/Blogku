<script setup lang="ts">
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-vue-next'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
</script>

<template>
  <Teleport to="body">
    <div
      class="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-end gap-2 sm:inset-x-auto sm:end-6"
      role="status"
      aria-live="polite"
    >
      <TransitionGroup
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="translate-y-2 opacity-0"
        leave-active-class="transition duration-150 ease-in"
        leave-to-class="opacity-0"
      >
        <div
          v-for="toast in ui.toasts"
          :key="toast.id"
          class="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 shadow-float"
          :class="{
            'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100':
              toast.type === 'success',
            'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-100':
              toast.type === 'error',
            'border-neutral-200 bg-white text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100':
              toast.type === 'info',
          }"
        >
          <CheckCircle2
            v-if="toast.type === 'success'"
            class="mt-0.5 h-5 w-5 shrink-0"
            aria-hidden="true"
          />
          <AlertCircle
            v-else-if="toast.type === 'error'"
            class="mt-0.5 h-5 w-5 shrink-0"
            aria-hidden="true"
          />
          <Info v-else class="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p class="flex-1 text-sm font-medium">{{ toast.message }}</p>
          <button
            type="button"
            class="rounded-full p-0.5 opacity-60 hover:opacity-100"
            aria-label="Dismiss notification"
            @click="ui.dismissToast(toast.id)"
          >
            <X class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
