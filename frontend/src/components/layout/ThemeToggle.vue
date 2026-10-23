<script setup lang="ts">
import { Moon, Sun } from 'lucide-vue-next'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
</script>

<template>
  <button
    type="button"
    class="inline-flex h-10 w-10 items-center justify-center rounded-full text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
    :aria-label="ui.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
    @click="ui.toggleTheme()"
  >
    <Sun v-if="ui.theme === 'dark'" class="h-5 w-5" aria-hidden="true" />
    <Moon v-else class="h-5 w-5" aria-hidden="true" />
  </button>
</template>
