<script setup lang="ts">
import NewsletterForm from './NewsletterForm.vue'
</script>

<template>
  <div class="rounded-3xl bg-neutral-900 p-6 text-white dark:bg-neutral-900">
    <p class="text-xs font-semibold uppercase tracking-[0.2em] text-primary-300">
      Newsletter
    </p>
    <h3 class="mt-2 text-lg font-bold">One good read, every Sunday.</h3>
    <p class="mt-2 text-sm text-neutral-400">
      No noise, no growth hacks. Just the stories worth your morning coffee.
    </p>
    <div class="mt-4">
      <NewsletterForm inverted compact />
    </div>
  </div>
</template>
