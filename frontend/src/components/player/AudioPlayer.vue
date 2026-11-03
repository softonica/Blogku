<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ChevronUp, Pause, Play, X } from 'lucide-vue-next'
import { formatDuration } from '@/lib/format'
import { usePlayerStore } from '@/stores/player'
import { useUiStore } from '@/stores/ui'
import PlayerControls from './PlayerControls.vue'
import PlayerProgressBar from './PlayerProgressBar.vue'
import PlayerTrackInfo from './PlayerTrackInfo.vue'
import PlayerVolume from './PlayerVolume.vue'
import SaveButton from '@/components/post/SaveButton.vue'

const player = usePlayerStore()
const ui = useUiStore()
const expanded = ref(false)
const dockEl = ref<HTMLElement | null>(null)
let observer: ResizeObserver | null = null

const currentLabel = computed(() => formatDuration(player.currentTime))
const durationLabel = computed(() => formatDuration(player.duration))

function setDockHeight(height: number): void {
  if (typeof document === 'undefined') return
  document.documentElement.style.setProperty('--player-dock-height', `${Math.max(0, height)}px`)
}

function measureDock(): void {
  setDockHeight(dockEl.value?.getBoundingClientRect().height ?? 0)
}

onMounted(() => {
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(measureDock)
  }
  watch(
    dockEl,
    (element) => {
      observer?.disconnect()
      if (element) {
        observer?.observe(element)
      }
      measureDock()
    },
    { immediate: true, flush: 'post' },
  )
})

watch(
  () => player.track,
  (track) => {
    if (!track) {
      expanded.value = false
      setDockHeight(0)
      return
    }
    void nextTick(measureDock)
  },
)

watch(
  () => player.error,
  (message) => {
    if (message) ui.notify(message, 'error')
  },
)

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
  setDockHeight(0)
})
</script>

<template>
  <div
    v-if="player.track"
    ref="dockEl"
    class="fixed inset-x-0 bottom-0 z-30 flex"
    role="region"
    aria-label="Audio player"
  >
    <div
      class="relative z-0 flex w-full flex-col bg-white px-2 shadow-[0_6px_10px_rgba(0,0,0,0.14),0_1px_18px_rgba(0,0,0,0.12),0_3px_5px_-1px_rgba(0,0,0,0.2)] sm:px-3 dark:bg-neutral-800"
    >
      <button
        type="button"
        class="absolute -top-3 right-0 z-30 flex h-6 w-[26px] items-center justify-center rounded-full bg-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 lg:hidden dark:bg-neutral-800"
        :aria-label="expanded ? 'Collapse player' : 'Expand player'"
        @click="expanded = !expanded"
      >
        <ChevronUp
          class="h-4 w-4 text-neutral-600 transition-transform duration-200 dark:text-neutral-300"
          :class="{ 'rotate-180': expanded }"
          aria-hidden="true"
        />
      </button>

      <PlayerProgressBar
        :current-time="player.currentTime"
        :duration="player.duration"
        :buffered="player.buffered"
        @seek="player.seek"
      />

      <div class="flex h-16 w-full justify-between sm:h-20">
        <PlayerTrackInfo :track="player.track" :playing="player.playing" />

        <div class="hidden grow items-center justify-center px-5 lg:flex">
          <PlayerControls
            layout="desktop"
            :playing="player.playing"
            :rate="player.playbackRate"
            @toggle="player.toggle"
            @skip="player.skip"
            @cycle-rate="player.cycleRate"
          />
        </div>

        <div class="ms-2 flex shrink-0 items-center justify-end lg:grow lg:basis-52">
          <PlayerVolume
            :volume="player.volume"
            :muted="player.muted"
            @update:volume="player.setVolume"
            @toggle-mute="player.toggleMute"
          />
          <div
            class="me-3 ms-5 hidden shrink-0 items-center justify-center text-xs tracking-widest lg:flex"
          >
            <div class="min-w-[40px] shrink-0 truncate text-end tabular-nums">
              {{ currentLabel }}
            </div>
            /
            <div class="min-w-[40px] shrink-0 truncate tabular-nums">
              {{ durationLabel }}
            </div>
          </div>

          <button
            v-if="!expanded"
            type="button"
            class="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 lg:hidden dark:text-neutral-200 dark:hover:bg-black/10"
            :aria-label="player.playing ? 'Pause' : 'Play'"
            @click="player.toggle"
          >
            <Pause v-if="player.playing" class="h-6 w-6 fill-current" aria-hidden="true" />
            <Play v-else class="h-6 w-6 fill-current" aria-hidden="true" />
          </button>

          <button
            type="button"
            class="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 md:h-12 md:w-12 dark:text-neutral-200 dark:hover:bg-neutral-700/80"
            aria-label="Close player"
            @click="player.close"
          >
            <X class="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        v-if="expanded"
        class="flex h-16 justify-center border-t border-neutral-300 transition-all lg:hidden dark:border-neutral-700"
      >
        <div class="flex max-w-xs grow items-center justify-evenly text-neutral-500 sm:max-w-sm dark:text-neutral-300">
          <div class="flex w-12 justify-center">
            <SaveButton
              :post-id="player.track.postId"
              :post-title="player.track.title"
              variant="icon"
            />
          </div>
          <PlayerControls
            layout="mobile"
            :playing="player.playing"
            :rate="player.playbackRate"
            @toggle="player.toggle"
            @skip="player.skip"
            @cycle-rate="player.cycleRate"
          />
        </div>
      </div>
    </div>
  </div>
</template>
