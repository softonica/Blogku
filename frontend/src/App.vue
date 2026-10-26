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
import BackToTop from '@/components/layout/BackToTop.vue'

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
    <BgGlassmorphism v-if="!isAdminArea" />
    <AppHeader v-if="!isAdminArea" />
    <main :class="isAdminArea ? '' : 'flex-1'">
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
    <BackToTop />
  </div>
</template>
