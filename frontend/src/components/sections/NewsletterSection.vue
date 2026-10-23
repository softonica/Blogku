<script setup lang="ts">
import { Check } from 'lucide-vue-next'
import NewsletterForm from '@/components/widgets/NewsletterForm.vue'
</script>

<template>
  <section
    class="relative overflow-hidden rounded-[32px] sm:rounded-[40px] bg-neutral-100 dark:bg-neutral-800/60 p-8 sm:p-12 lg:p-16 text-neutral-900 dark:text-white"
  >
    <div
      class="pointer-events-none absolute -end-24 -top-24 h-72 w-72 rounded-full bg-primary-500/10 blur-3xl dark:bg-primary-500/20"
    ></div>
    <div
      class="pointer-events-none absolute -bottom-24 -start-24 h-72 w-72 rounded-full bg-secondary-500/10 blur-3xl dark:bg-secondary-500/20"
    ></div>

    <div class="relative grid items-center gap-10 lg:grid-cols-2">
      <div>
        <h2 class="text-3xl font-bold tracking-tight sm:text-4xl">
          Join our newsletter 🎉
        </h2>
        <p class="mt-4 max-w-lg text-sm sm:text-base leading-relaxed text-neutral-500 dark:text-neutral-300">
          Read and share new perspectives on just about any topic. Everyone's welcome.
        </p>

        <ul class="mt-6 space-y-3">
          <li class="flex items-center gap-3 text-sm font-medium">
            <span class="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300">
              <Check class="h-3.5 w-3.5" />
            </span>
            <span><strong class="font-semibold text-neutral-800 dark:text-neutral-200">01</strong> Get weekly editorial curations</span>
          </li>
          <li class="flex items-center gap-3 text-sm font-medium">
            <span class="flex h-6 w-6 items-center justify-center rounded-full bg-secondary-100 text-secondary-700 dark:bg-secondary-950 dark:text-secondary-300">
              <Check class="h-3.5 w-3.5" />
            </span>
            <span><strong class="font-semibold text-neutral-800 dark:text-neutral-200">02</strong> Access premium multimedia & podcasts</span>
          </li>
        </ul>

        <div class="mt-8 max-w-md">
          <NewsletterForm />
        </div>
      </div>

      <!-- Right illustration / Mockup graphic -->
      <div class="relative flex justify-center lg:justify-end">
        <div class="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/80">
          <div class="aspect-[16/10] overflow-hidden rounded-2xl bg-neutral-900 mb-4">
            <img
              src="https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80"
              alt="Blogku magazine"
              width="600"
              height="375"
              loading="lazy"
              decoding="async"
              class="h-full w-full object-cover"
            />
          </div>
          <span class="inline-flex rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 dark:bg-primary-950 dark:text-primary-300">
            Blogku Weekly Edition
          </span>
          <h3 class="mt-2 text-base font-bold text-neutral-900 dark:text-neutral-100">
            Delivered straight to your inbox
          </h3>
          <p class="mt-1 text-xs text-neutral-400">
            Over 15,000 readers every Sunday morning
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
