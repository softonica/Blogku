<script setup lang="ts">
import { computed } from 'vue'
import { Pause, Play } from 'lucide-vue-next'
import SkipButton from './SkipButton.vue'

const props = defineProps<{
  layout: 'desktop' | 'mobile'
  playing: boolean
  rate: number
}>()

const emit = defineEmits<{
  toggle: []
  skip: [seconds: number]
  cycleRate: []
}>()

const rateLabel = computed(() => `${props.rate.toFixed(1)}x`)
</script>

<template>
  <div
    class="flex max-w-xs grow items-center justify-evenly text-neutral-500 dark:text-neutral-300"
    :class="layout === 'desktop' ? 'xl:max-w-md' : ''"
  >
    <div v-if="layout === 'desktop'" class="w-12" aria-hidden="true" />
    <SkipButton :seconds="10" direction="back" @skip="emit('skip', $event)" />
    <button
      type="button"
      class="flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full bg-neutral-100/70 text-neutral-700 transition-colors hover:bg-neutral-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 sm:h-16 sm:w-16 dark:bg-neutral-700/40 dark:text-neutral-200 dark:hover:bg-neutral-700/80"
      :aria-label="playing ? 'Pause' : 'Play'"
      @click="emit('toggle')"
    >
      <Pause v-if="playing" class="h-10 w-10 fill-current" aria-hidden="true" />
      <Play v-else class="ms-0.5 h-10 w-10 fill-current" aria-hidden="true" />
    </button>
    <SkipButton :seconds="15" direction="forward" @skip="emit('skip', $event)" />
    <div class="flex w-12 items-center justify-center">
      <button
        type="button"
        class="rounded-lg px-2 text-[11px] font-semibold leading-6 ring-1 ring-inset ring-neutral-500 transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        :aria-label="`Playback speed: ${rateLabel}`"
        @click="emit('cycleRate')"
      >
        {{ rateLabel }}
      </button>
    </div>
  </div>
</template>
