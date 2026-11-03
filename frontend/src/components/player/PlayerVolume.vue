<script setup lang="ts">
import { computed } from 'vue'
import { Volume2, VolumeX } from 'lucide-vue-next'

const props = defineProps<{
  volume: number
  muted: boolean
}>()

const emit = defineEmits<{
  'update:volume': [volume: number]
  toggleMute: []
}>()

const percent = computed(() => Math.round(props.volume * 100))

function onInput(event: Event): void {
  emit('update:volume', Number((event.target as HTMLInputElement).value))
}
</script>

<template>
  <div class="hidden items-center justify-end text-neutral-500 lg:flex dark:text-neutral-300">
    <button
      type="button"
      class="rounded-full p-1 transition hover:text-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:hover:text-white"
      :aria-label="muted ? 'Unmute audio' : 'Mute audio'"
      :aria-pressed="muted"
      @click="emit('toggleMute')"
    >
      <VolumeX v-if="muted" class="h-5 w-5 shrink-0" aria-hidden="true" />
      <Volume2 v-else class="h-5 w-5 shrink-0" aria-hidden="true" />
    </button>
    <div class="relative ms-3.5 w-24 shrink-0">
      <input
        class="absolute inset-0 z-20 h-4 w-full -translate-y-1/2 cursor-pointer opacity-0"
        type="range"
        min="0"
        max="1"
        step="0.01"
        :value="volume"
        aria-label="Volume"
        :aria-valuetext="`${percent}%`"
        @input="onInput"
      />
      <div
        class="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-neutral-300 dark:bg-neutral-500"
      >
        <div
          class="absolute inset-y-0 start-0 rounded-full bg-primary-500"
          :style="{ width: `${percent}%` }"
        >
          <span
            class="absolute end-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 translate-x-1/2 rounded-full bg-primary-500"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  </div>
</template>
