<script setup lang="ts">
import { ref } from 'vue'
import AdminSidebar from '@/components/admin/AdminSidebar.vue'
import AdminTopbar from '@/components/admin/AdminTopbar.vue'

const sidebarOpen = ref(false)
</script>

<template>
  <div class="min-h-screen bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
    <a
      href="#admin-main"
      class="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 dark:focus:ring-offset-neutral-900"
    >
      Skip to admin content
    </a>
    <AdminSidebar :open="sidebarOpen" @close="sidebarOpen = false" />
    <div class="flex min-h-screen flex-col lg:ps-72">
      <AdminTopbar @toggle-sidebar="sidebarOpen = true" />
      <main id="admin-main" tabindex="-1" class="flex-1 px-4 py-4 outline-none sm:py-6 sm:px-6 lg:px-8">
        <RouterView />
      </main>
    </div>
  </div>
</template>
