<template>
  <span class="flex h-7 items-center justify-center gap-1" aria-hidden="true">
    <span
      v-for="(delay, index) in delays"
      :key="index"
      class="eq-bar w-1.5 rounded-full bg-current"
      :style="{ animationDelay: delay }"
    />
  </span>
</template>

<script setup lang="ts">
const delays = ['-0.45s', '-0.15s', '-0.3s', '-0.05s']
</script>

<style scoped>
.eq-bar {
  height: 1.25rem;
  animation: eq-bounce 0.9s ease-in-out infinite;
  transform-origin: center;
}

@keyframes eq-bounce {
  0%,
  100% {
    transform: scaleY(0.45);
  }
  50% {
    transform: scaleY(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .eq-bar {
    animation: none;
    transform: scaleY(0.7);
  }
}
</style>
