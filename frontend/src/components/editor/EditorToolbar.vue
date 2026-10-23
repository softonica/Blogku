<script setup lang="ts">
import { ref } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Image,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
  Unlink,
  Upload,
} from 'lucide-vue-next'
import { getDataSource } from '@/api'
import {
  DEFAULT_ALLOWED_IMAGE_DOMAINS,
  extractDomain,
  isAllowedImageDomain,
} from '@/lib/image-domains'

const props = defineProps<{
  editor: Editor | undefined
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)

function toggleLink(): void {
  if (!props.editor) return
  if (props.editor.isActive('link')) {
    props.editor.chain().focus().unsetLink().run()
    return
  }
  const previousUrl = props.editor.getAttributes('link').href as string | undefined
  const url = window.prompt('Enter link URL (e.g. https://...):', previousUrl || 'https://')
  if (url === null) return
  if (url.trim() === '') {
    props.editor.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }
  props.editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
}

async function insertImageUrl(): Promise<void> {
  if (!props.editor) return
  const url = window.prompt('Enter image URL (e.g. https://images.unsplash.com/...):')
  if (!url || !url.trim()) return

  // Check allowed image domain
  let allowed = DEFAULT_ALLOWED_IMAGE_DOMAINS
  try {
    const s = await getDataSource().getSiteSettings()
    if (s.allowedImageDomains?.length) allowed = s.allowedImageDomains
  } catch {
    // fallback
  }

  if (!isAllowedImageDomain(url, allowed)) {
    const domain = extractDomain(url) || 'unknown'
    window.alert(
      `Domain gambar "${domain}" tidak diizinkan. Silakan gunakan tombol upload gambar atau gunakan gambar dari domain yang diizinkan (misal Unsplash/Pexels).`,
    )
    return
  }

  props.editor.chain().focus().setImage({ src: url.trim() }).run()
}

function triggerFileUpload(): void {
  fileInput.value?.click()
}

async function onFileSelected(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !props.editor) return

  uploading.value = true
  try {
    const result = await getDataSource().uploadFile(file)
    props.editor.chain().focus().setImage({ src: result.url }).run()
  } catch (err) {
    window.alert(err instanceof Error ? err.message : 'Failed to upload image')
  } finally {
    uploading.value = false
    input.value = ''
  }
}
</script>

<template>
  <div
    v-if="editor"
    class="sticky top-0 z-10 flex flex-wrap items-center gap-1 rounded-t-2xl border-b border-neutral-200 bg-neutral-50/95 p-2 backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-900/95"
  >
    <!-- Hidden file input for direct editor image uploads -->
    <input
      ref="fileInput"
      type="file"
      accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
      class="sr-only"
      :disabled="uploading"
      @change="onFileSelected"
    />

    <!-- History Group -->
    <button
      type="button"
      title="Undo"
      aria-label="Undo"
      :disabled="!editor.can().undo()"
      class="toolbar-btn"
      @click="editor.chain().focus().undo().run()"
    >
      <Undo2 class="h-4 w-4" aria-hidden="true" />
    </button>
    <button
      type="button"
      title="Redo"
      aria-label="Redo"
      :disabled="!editor.can().redo()"
      class="toolbar-btn"
      @click="editor.chain().focus().redo().run()"
    >
      <Redo2 class="h-4 w-4" aria-hidden="true" />
    </button>

    <span class="toolbar-divider" />

    <!-- Headings -->
    <button
      type="button"
      title="Heading 2"
      aria-label="Heading 2"
      class="toolbar-btn"
      :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }"
      @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
    >
      <Heading2 class="h-4 w-4" aria-hidden="true" />
    </button>
    <button
      type="button"
      title="Heading 3"
      aria-label="Heading 3"
      class="toolbar-btn"
      :class="{ 'is-active': editor.isActive('heading', { level: 3 }) }"
      @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
    >
      <Heading3 class="h-4 w-4" aria-hidden="true" />
    </button>

    <span class="toolbar-divider" />

    <!-- Text Formatting -->
    <button
      type="button"
      title="Bold"
      aria-label="Bold"
      class="toolbar-btn"
      :class="{ 'is-active': editor.isActive('bold') }"
      @click="editor.chain().focus().toggleBold().run()"
    >
      <Bold class="h-4 w-4" aria-hidden="true" />
    </button>
    <button
      type="button"
      title="Italic"
      aria-label="Italic"
      class="toolbar-btn"
      :class="{ 'is-active': editor.isActive('italic') }"
      @click="editor.chain().focus().toggleItalic().run()"
    >
      <Italic class="h-4 w-4" aria-hidden="true" />
    </button>
    <button
      type="button"
      title="Strikethrough"
      aria-label="Strikethrough"
      class="toolbar-btn"
      :class="{ 'is-active': editor.isActive('strike') }"
      @click="editor.chain().focus().toggleStrike().run()"
    >
      <Strikethrough class="h-4 w-4" aria-hidden="true" />
    </button>
    <button
      type="button"
      title="Inline Code"
      aria-label="Inline Code"
      class="toolbar-btn"
      :class="{ 'is-active': editor.isActive('code') }"
      @click="editor.chain().focus().toggleCode().run()"
    >
      <Code class="h-4 w-4" aria-hidden="true" />
    </button>

    <span class="toolbar-divider" />

    <!-- Lists & Blocks -->
    <button
      type="button"
      title="Bullet List"
      aria-label="Bullet List"
      class="toolbar-btn"
      :class="{ 'is-active': editor.isActive('bulletList') }"
      @click="editor.chain().focus().toggleBulletList().run()"
    >
      <List class="h-4 w-4" aria-hidden="true" />
    </button>
    <button
      type="button"
      title="Numbered List"
      aria-label="Numbered List"
      class="toolbar-btn"
      :class="{ 'is-active': editor.isActive('orderedList') }"
      @click="editor.chain().focus().toggleOrderedList().run()"
    >
      <ListOrdered class="h-4 w-4" aria-hidden="true" />
    </button>
    <button
      type="button"
      title="Blockquote"
      aria-label="Blockquote"
      class="toolbar-btn"
      :class="{ 'is-active': editor.isActive('blockquote') }"
      @click="editor.chain().focus().toggleBlockquote().run()"
    >
      <Quote class="h-4 w-4" aria-hidden="true" />
    </button>
    <button
      type="button"
      title="Horizontal Divider"
      aria-label="Horizontal Divider"
      class="toolbar-btn"
      @click="editor.chain().focus().setHorizontalRule().run()"
    >
      <Minus class="h-4 w-4" aria-hidden="true" />
    </button>

    <span class="toolbar-divider" />

    <!-- Links & Media -->
    <button
      type="button"
      :title="editor.isActive('link') ? 'Remove Link' : 'Add Link'"
      :aria-label="editor.isActive('link') ? 'Remove Link' : 'Add Link'"
      class="toolbar-btn"
      :class="{ 'is-active': editor.isActive('link') }"
      @click="toggleLink"
    >
      <Unlink v-if="editor.isActive('link')" class="h-4 w-4 text-rose-500" aria-hidden="true" />
      <Link2 v-else class="h-4 w-4" aria-hidden="true" />
    </button>

    <!-- Upload Image File -->
    <button
      type="button"
      title="Upload Image File"
      aria-label="Upload Image File"
      class="toolbar-btn"
      :disabled="uploading"
      @click="triggerFileUpload"
    >
      <Upload class="h-4 w-4" aria-hidden="true" />
    </button>

    <!-- Insert Image via URL -->
    <button
      type="button"
      title="Insert Image from URL"
      aria-label="Insert Image from URL"
      class="toolbar-btn"
      @click="insertImageUrl"
    >
      <Image class="h-4 w-4" aria-hidden="true" />
    </button>
  </div>
</template>

<style scoped>
@reference "../../styles/main.css";

.toolbar-btn {
  @apply flex h-8 w-8 items-center justify-center rounded-lg text-neutral-600 transition hover:bg-neutral-200 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-30 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white;
}

.toolbar-btn.is-active {
  @apply bg-primary-100 font-semibold text-primary-700 ring-1 ring-primary-400 dark:bg-primary-900/60 dark:text-primary-300 dark:ring-primary-600;
}

.toolbar-divider {
  @apply mx-1 h-5 w-px bg-neutral-200 dark:bg-neutral-800;
}
</style>
