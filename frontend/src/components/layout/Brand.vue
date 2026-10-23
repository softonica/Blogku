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
  <RouterLink to="/" class="inline-flex items-center">
    <img
      v-if="logo"
      :src="logo"
      :alt="siteName"
      width="180"
      height="36"
      class="h-9 w-auto max-w-[180px] object-contain"
    />
    <span
      v-else-if="!compact"
      class="text-xl font-black tracking-tight"
      :class="inverted ? 'text-white' : 'text-neutral-900 dark:text-white'"
    >
      {{ siteName }}<span class="text-primary-500">.</span>
    </span>
    <span v-else class="sr-only">{{ siteName }}</span>
  </RouterLink>
</template>
