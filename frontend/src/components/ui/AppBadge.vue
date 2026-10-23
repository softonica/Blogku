<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'neutral' | 'dark' | 'white' | 'success'
  }>(),
  { variant: 'primary' },
)
</script>

<template>
  <span
    class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
    :class="{
      'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300':
        variant === 'primary',
      'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300':
        variant === 'neutral',
      'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900':
        variant === 'dark',
      'bg-white/90 text-neutral-800 backdrop-blur': variant === 'white',
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300':
        variant === 'success',
    }"
  >
    <slot />
  </span>
</template>
