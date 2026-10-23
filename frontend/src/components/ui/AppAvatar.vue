<script setup lang="ts">
import { computed, ref } from 'vue'
import { initials } from '@/lib/format'

const props = withDefaults(
  defineProps<{
    src?: string
    name: string
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  }>(),
  { src: '', size: 'md' },
)

const failed = ref(false)

const sizeClasses = computed(
  () =>
    ({
      xs: 'h-7 w-7 text-[10px]',
      sm: 'h-9 w-9 text-xs',
      md: 'h-11 w-11 text-sm',
      lg: 'h-16 w-16 text-lg',
      xl: 'h-24 w-24 text-2xl',
    })[props.size],
)

const dimension = computed(
  () =>
    ({
      xs: 28,
      sm: 36,
      md: 44,
      lg: 64,
      xl: 96,
    })[props.size],
)
</script>

<template>
  <span
    class="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-100 font-semibold text-primary-700 dark:bg-primary-900/50 dark:text-primary-200"
    :class="sizeClasses"
  >
    <img
      v-if="src && !failed"
      :src="src"
      :alt="name"
      :width="dimension"
      :height="dimension"
      loading="lazy"
      decoding="async"
      class="h-full w-full object-cover"
      @error="failed = true"
    />
    <span v-else>{{ initials(name) }}</span>
  </span>
</template>
