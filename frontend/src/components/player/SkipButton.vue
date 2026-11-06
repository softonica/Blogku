<script setup lang="ts">
import { computed } from 'vue'
import { RotateCcw, RotateCw } from 'lucide-vue-next'

const props = defineProps<{
  seconds: number
  direction: 'back' | 'forward'
}>()

const emit = defineEmits<{ skip: [seconds: number] }>()

const label = computed(() =>
  props.direction === 'back'
    ? `Rewind ${props.seconds} seconds`
    : `Forward ${props.seconds} seconds`,
)
</script>

<template>
  <button
    type="button"
    class="relative flex h-12 w-12 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-neutral-300 dark:hover:bg-neutral-700/80"
    :aria-label="label"
    @click="emit('skip', direction === 'back' ? -seconds : seconds)"
  >
    <RotateCcw v-if="direction === 'back'" class="h-6 w-6" aria-hidden="true" />
    <RotateCw v-else class="h-6 w-6" aria-hidden="true" />
    <span
      class="pointer-events-none absolute inset-0 flex items-center justify-center pt-0.5 text-[8px] font-bold leading-none"
      aria-hidden="true"
    >
      {{ seconds }}
    </span>
  </button>
</template>
