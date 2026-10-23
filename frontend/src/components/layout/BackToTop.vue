<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Rocket } from 'lucide-vue-next'

const visible = ref(false)

function onScroll(): void {
  visible.value = window.scrollY > 400
}

function scrollToTop(): void {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 scale-90"
    leave-active-class="transition duration-150 ease-in"
    leave-to-class="opacity-0 scale-90"
  >
    <button
      v-if="visible"
      type="button"
      class="fixed bottom-6 end-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg shadow-primary-600/30 transition hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 dark:bg-primary-500 dark:text-neutral-950 dark:hover:bg-primary-400"
      aria-label="Back to top"
      @click="scrollToTop"
    >
      <Rocket class="h-5 w-5" aria-hidden="true" />
    </button>
  </Transition>
</template>
