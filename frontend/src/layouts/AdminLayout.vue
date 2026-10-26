<script setup lang="ts">
import { ref } from 'vue'
import AdminSidebar from '@/components/admin/AdminSidebar.vue'
import AdminTopbar from '@/components/admin/AdminTopbar.vue'

const sidebarOpen = ref(false)
</script>

<template>
  <div class="min-h-screen bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
    <AdminSidebar :open="sidebarOpen" @close="sidebarOpen = false" />
    <div class="flex min-h-screen flex-col lg:pl-72">
      <AdminTopbar @toggle-sidebar="sidebarOpen = true" />
      <main class="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <RouterView />
      </main>
    </div>
  </div>
</template>
