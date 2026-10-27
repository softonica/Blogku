<script setup lang="ts">
import { computed } from 'vue'
import { Coffee, Facebook, Github, Youtube } from 'lucide-vue-next'
import type { UserSocials } from '@/api/types'

const props = defineProps<{
  socials?: UserSocials
  size?: 'sm' | 'md'
}>()

const sizeCls = computed(() =>
  props.size === 'md' ? 'h-11 w-11' : 'h-9 w-9',
)
const iconCls = computed(() =>
  props.size === 'md' ? 'h-5 w-5' : 'h-4 w-4',
)

const links = computed(() => {
  const s = props.socials ?? {}
  const arr: { label: string; href?: string; icon: 'facebook' | 'youtube' | 'tiktok' | 'github' | 'coffee' }[] = [
    { label: 'Facebook', href: s.facebook, icon: 'facebook' },
    { label: 'Youtube', href: s.youtube, icon: 'youtube' },
    { label: 'Tiktok', href: s.tiktok, icon: 'tiktok' },
    { label: 'Github', href: s.github, icon: 'github' },
    { label: 'By me a coffee', href: s.buymeacoffee, icon: 'coffee' },
  ]
  return arr.filter((l) => !!l.href)
})

const tiktokPath =
  'M18.33 6.42a4.85 4.85 0 0 1-3.03-2.05 4.8 4.8 0 0 1-.67-2.37h-3.03v12.1a2.64 2.64 0 1 1-2.64-2.64c.29 0 .57.05.83.13V8.53a5.58 5.58 0 0 0-.83-.06 5.85 5.85 0 1 0 5.85 5.85V7.08a7.8 7.8 0 0 0 3.56.88V4.93c-.29 0-.57-.04-.83-.13z'
</script>

<template>
  <div class="flex flex-wrap items-center gap-2.5" role="list">
    <a
      v-for="link in links"
      :key="link.icon"
      :href="link.href"
      :aria-label="link.label"
      target="_blank"
      rel="noopener noreferrer"
      role="listitem"
      class="inline-flex items-center justify-center rounded-full bg-white text-neutral-600 ring-1 ring-neutral-200 transition hover:text-primary-600 hover:ring-primary-300 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-700 dark:hover:text-primary-300 dark:hover:ring-primary-600"
      :class="sizeCls"
    >
      <Facebook v-if="link.icon === 'facebook'" :class="iconCls" aria-hidden="true" />
      <Youtube v-else-if="link.icon === 'youtube'" :class="iconCls" aria-hidden="true" />
      <svg
        v-else-if="link.icon === 'tiktok'"
        :class="iconCls"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path :d="tiktokPath" />
      </svg>
      <Github v-else-if="link.icon === 'github'" :class="iconCls" aria-hidden="true" />
      <Coffee v-else :class="iconCls" aria-hidden="true" />
    </a>
  </div>
</template>
