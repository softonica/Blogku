<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getDataSource } from '@/api'

withDefaults(
  defineProps<{
    inverted?: boolean
    compact?: boolean
  }>(),
  { inverted: false, compact: false },
)

const logo = ref('')
const siteName = ref('Blogku')

onMounted(async () => {
  try {
    const s = await getDataSource().getSiteSettings()
    if (s.logo) logo.value = s.logo
    if (s.siteName) siteName.value = s.siteName
  } catch {
    // fallback
  }
})
</script>

<template>
  <RouterLink to="/" class="inline-flex items-center gap-2.5">
    <template v-if="logo">
      <img
        :src="logo"
        :alt="siteName"
        width="180"
        height="36"
        class="h-9 w-auto max-w-[180px] object-contain"
      />
    </template>
    <template v-else>
      <span
        aria-hidden="true"
        class="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-600 text-lg font-black text-white dark:bg-primary-500 dark:text-neutral-950"
      >
        {{ siteName.charAt(0).toUpperCase() }}
      </span>
      <span
        v-if="!compact"
        class="text-xl font-black tracking-tight"
        :class="inverted ? 'text-white' : 'text-neutral-900 dark:text-white'"
      >
        {{ siteName }}<span class="text-primary-500">.</span>
      </span>
      <span v-else class="sr-only">{{ siteName }}</span>
    </template>
  </RouterLink>
</template>
