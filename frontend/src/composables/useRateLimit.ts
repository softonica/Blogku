import { computed, onUnmounted, ref } from 'vue'
import { RateLimitError } from '@/api/errors'

/**
 * Tracks a `429` cooldown so forms can disable submit buttons until the
 * server-provided `Retry-After` window has elapsed. No automatic retry.
 */
export function useRateLimit() {
  const retryAfter = ref(0)
  let timer: ReturnType<typeof setInterval> | undefined

  function stopTimer(): void {
    if (timer !== undefined) {
      clearInterval(timer)
      timer = undefined
    }
  }

  function reset(): void {
    stopTimer()
    retryAfter.value = 0
  }

  function start(error: unknown): boolean {
    if (!(error instanceof RateLimitError)) return false
    stopTimer()
    retryAfter.value = Math.max(1, Math.ceil(error.retryAfter))
    timer = setInterval(() => {
      if (retryAfter.value <= 1) {
        retryAfter.value = 0
        stopTimer()
        return
      }
      retryAfter.value -= 1
    }, 1000)
    return true
  }

  const isLimited = computed(() => retryAfter.value > 0)
  const message = computed(
    () =>
      `Too many requests. Please try again in ${retryAfter.value} seconds.`,
  )

  onUnmounted(stopTimer)

  return { retryAfter, isLimited, message, start, reset }
}
