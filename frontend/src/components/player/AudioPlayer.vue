<script setup lang="ts">
import { computed } from 'vue'
import { Pause, Play, X } from 'lucide-vue-next'
import { usePlayerStore } from '@/stores/player'

const player = usePlayerStore()

const currentLabel = computed(() => formatSeconds(player.currentTime))
const durationLabel = computed(() => formatSeconds(player.duration))

function formatSeconds(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '0:00'
  const m = Math.floor(totalSeconds / 60)
  const s = Math.floor(totalSeconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function onSeek(event: Event): void {
  const target = event.target as HTMLInputElement
  player.seek(Number(target.value))
}
</script>

<template>
  <div
    v-if="player.track"
    class="fixed bottom-4 left-4 z-40 w-[min(92vw,22rem)] rounded-2xl border border-neutral-200 bg-white/95 p-3 shadow-float backdrop-blur dark:border-neutral-700 dark:bg-neutral-900/95"
  >
    <div class="flex items-center gap-3">
      <img
        :src="player.track.coverUrl"
        :alt="`${player.track.title} cover art`"
        :class="player.playing ? 'animate-spin-slow' : ''"
        class="h-14 w-14 shrink-0 rounded-full border border-neutral-200 object-cover dark:border-neutral-700"
      />

      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium text-neutral-900 dark:text-white">
          {{ player.track.title }}
        </p>
        <p class="truncate text-xs text-neutral-500 dark:text-neutral-400">
          {{ player.track.authorName }}
        </p>

        <div class="mt-2 flex items-center gap-2">
          <span class="shrink-0 text-[10px] tabular-nums text-neutral-500 dark:text-neutral-400">
            {{ currentLabel }}
          </span>
          <input
            type="range"
            min="0"
            :max="player.duration || 0"
            :value="player.currentTime"
            class="h-1.5 flex-1 cursor-pointer accent-primary-600 dark:accent-primary-400"
            aria-label="Seek position"
            @input="onSeek"
          />
          <span class="shrink-0 text-[10px] tabular-nums text-neutral-500 dark:text-neutral-400">
            {{ durationLabel }}
          </span>
        </div>
      </div>

      <div class="flex shrink-0 flex-col items-center gap-2">
        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-white shadow-sm transition hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 dark:bg-primary-500 dark:text-neutral-950 dark:hover:bg-primary-400"
          :aria-label="player.playing ? 'Pause' : 'Play'"
          @click="player.toggle"
        >
          <Play v-if="!player.playing" class="h-5 w-5" aria-hidden="true" />
          <Pause v-else class="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="rounded-full p-1 text-neutral-400 transition hover:text-neutral-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 dark:text-neutral-500 dark:hover:text-neutral-200"
          aria-label="Close player"
          @click="player.close"
        >
          <X class="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>

    <p
      v-if="player.error"
      class="mt-2 text-xs text-rose-600 dark:text-rose-400"
      role="alert"
    >
      {{ player.error }}
    </p>
  </div>
</template>
