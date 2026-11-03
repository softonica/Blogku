<script setup lang="ts">
import { computed } from 'vue'
import { formatDuration } from '@/lib/format'

const props = defineProps<{
  currentTime: number
  duration: number
  buffered: number
}>()

const emit = defineEmits<{ seek: [seconds: number] }>()

const safeDuration = computed(() => (props.duration > 0 ? props.duration : 0))
const playedPercent = computed(() => {
  if (!safeDuration.value) return 0
  return Math.min(100, Math.max(0, (props.currentTime / safeDuration.value) * 100))
})
const bufferedPercent = computed(() => {
  if (!safeDuration.value) return 0
  return Math.min(100, Math.max(0, (props.buffered / safeDuration.value) * 100))
})
const valueText = computed(
  () => `${formatDuration(props.currentTime)} / ${formatDuration(safeDuration.value)}`,
)

function onInput(event: Event): void {
  emit('seek', Number((event.target as HTMLInputElement).value))
}
</script>

<template>
  <div class="absolute inset-x-0 bottom-full h-3 w-full">
    <input
      class="absolute inset-0 z-20 h-full w-full cursor-pointer opacity-0"
      type="range"
      min="0"
      :max="safeDuration"
      step="any"
      :value="currentTime"
      aria-label="Seek audio"
      :aria-valuetext="valueText"
      @input="onInput"
    />
    <div
      class="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-visible rounded-full bg-primary-500/30"
    >
      <div
        class="absolute inset-y-0 start-0 rounded-full bg-primary-500/40"
        :style="{ width: `${bufferedPercent}%` }"
      />
      <div
        class="absolute inset-y-0 start-0 rounded-full bg-primary-500"
        :style="{ width: `${playedPercent}%` }"
      >
        <span
          v-if="safeDuration"
          class="absolute end-0 top-1/2 h-3 w-3 -translate-y-1/2 translate-x-1/2 rounded-full bg-primary-500"
          aria-hidden="true"
        />
      </div>
    </div>
  </div>
</template>
