<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import BgGlassmorphism from '@/components/layout/BgGlassmorphism.vue'
import SearchDialog from '@/components/layout/SearchDialog.vue'
import ToastHost from '@/components/layout/ToastHost.vue'
import AudioPlayer from '@/components/player/AudioPlayer.vue'

const route = useRoute()
const ui = useUiStore()
const auth = useAuthStore()

const isAdminArea = computed(
  () => route.path === '/admin' || route.path.startsWith('/admin/'),
)

onMounted(() => {
  ui.initTheme()
  auth.restore()
})

watch(
  () => ui.mobileNavOpen || ui.searchOpen,
  (locked) => {
    document.body.classList.toggle('overflow-hidden', locked)
  },
)
</script>

<template>
  <div class="relative flex min-h-screen flex-col bg-white dark:bg-neutral-950">
    <a
      v-if="!isAdminArea"
      href="#main-content"
      class="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 dark:focus:ring-offset-neutral-900"
    >
      Skip to main content
    </a>
    <BgGlassmorphism v-if="!isAdminArea" />
    <AppHeader v-if="!isAdminArea" />
    <main
      id="main-content"
      tabindex="-1"
      :class="isAdminArea ? '' : 'flex-1'"
      class="outline-none"
    >
      <RouterView v-slot="{ Component, route: currentRoute }">
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 translate-y-1"
          leave-active-class="transition duration-150 ease-in"
          leave-to-class="opacity-0"
          mode="out-in"
        >
          <component :is="Component" :key="currentRoute.fullPath" />
        </Transition>
      </RouterView>
    </main>
    <AppFooter v-if="!isAdminArea" />
    <SearchDialog />
    <ToastHost />
    <AudioPlayer />
  </div>
</template>
