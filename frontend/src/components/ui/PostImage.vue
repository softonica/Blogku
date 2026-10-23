<script setup lang="ts">
import { computed } from 'vue'
import { buildSrcSet } from '@/lib/image'

const props = withDefaults(
  defineProps<{
    src: string
    alt: string
    sizes?: string
    aspect?: string
    priority?: boolean
    width?: number | string
    height?: number | string
  }>(),
  {
    sizes: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
    aspect: 'aspect-[4/3]',
    priority: false,
    width: undefined,
    height: undefined,
  },
)

const srcset = computed(() => buildSrcSet(props.src))

const computedWidth = computed(() => {
  if (props.width) return props.width
  return 600
})

const computedHeight = computed(() => {
  if (props.height) return props.height
  if (props.aspect.includes('aspect-square') || props.aspect.includes('aspect-[1/1]')) return 600
  if (props.aspect.includes('aspect-[16/9]')) return 338
  if (props.aspect.includes('aspect-[3/2]')) return 400
  if (props.aspect.includes('aspect-[4/3]')) return 450
  return 450
})
</script>

<template>
  <div
    class="relative overflow-hidden bg-neutral-100 dark:bg-neutral-800"
    :class="aspect"
  >
    <img
      :src="src"
      :srcset="srcset"
      :sizes="sizes"
      :alt="alt"
      :width="computedWidth"
      :height="computedHeight"
      :loading="priority ? 'eager' : 'lazy'"
      :decoding="priority ? 'sync' : 'async'"
      :fetchpriority="priority ? 'high' : 'auto'"
      class="h-full w-full object-cover transition duration-500 will-change-transform group-hover:scale-[1.03]"
    />
  </div>
</template>
