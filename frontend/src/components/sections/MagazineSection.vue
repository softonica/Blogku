<script setup lang="ts">
import type { Post } from '@/api/types'
import PostCard from '@/components/post/PostCard.vue'

defineProps<{ posts: Post[] }>()
</script>

<template>
  <div v-if="posts.length" class="grid gap-6 lg:grid-cols-3">
    <PostCard
      :post="posts[0]"
      layout="overlay"
      aspect="aspect-[16/10] lg:aspect-[16/13]"
      sizes="(max-width: 1024px) 100vw, 66vw"
      class="lg:col-span-2"
    />
    <div
      class="flex h-full flex-col gap-5 rounded-3xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <template v-for="(post, index) in posts.slice(1, 4)" :key="post.id">
        <PostCard :post="post" layout="horizontal" />
        <hr
          v-if="index < Math.min(posts.length - 1, 3) - 1"
          class="border-neutral-100 dark:border-neutral-800"
        />
      </template>
    </div>
  </div>
</template>
