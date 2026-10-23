<script setup lang="ts">
import Brand from './Brand.vue'

defineProps<{
  title: string
  subtitle: string
}>()
</script>

<template>
  <div class="page-shell">
    <div
      class="mx-auto grid max-w-5xl overflow-hidden rounded-[2rem] border border-neutral-200 shadow-card lg:grid-cols-2 dark:border-neutral-800"
    >
      <aside
        class="relative hidden overflow-hidden bg-neutral-950 p-10 text-white lg:flex lg:flex-col lg:justify-between"
      >
        <div
          class="pointer-events-none absolute -end-20 -top-20 h-64 w-64 rounded-full bg-primary-500/25 blur-3xl"
        ></div>
        <div
          class="pointer-events-none absolute -bottom-24 -start-16 h-64 w-64 rounded-full bg-secondary-500/20 blur-3xl"
        ></div>
        <div class="relative">
          <Brand inverted />
          <p class="mt-10 text-3xl font-bold leading-tight">
            A calm place to read, write and keep what matters.
          </p>
          <p class="mt-4 max-w-sm text-sm leading-relaxed text-neutral-400">
            Ncmaz is being rewritten on a safer foundation: Vue 3 on the front,
            PocketBase on the way. Phase 1 runs entirely on local mock data.
          </p>
        </div>
        <div class="relative rounded-2xl border border-white/10 bg-white/5 p-5">
          <p class="text-sm leading-relaxed text-neutral-300">
            “The best interfaces are the ones that make the next step obvious
            without asking for attention.”
          </p>
          <p class="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
            Ncmaz editorial
          </p>
        </div>
      </aside>

      <div class="bg-white p-6 sm:p-10 dark:bg-neutral-900">
        <div class="lg:hidden">
          <Brand />
        </div>
        <div class="mt-8 lg:mt-2">
          <h1 class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            {{ title }}
          </h1>
          <p class="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            {{ subtitle }}
          </p>
        </div>
        <div class="mt-7">
          <slot />
        </div>
        <div v-if="$slots.footer" class="mt-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </div>
</template>
