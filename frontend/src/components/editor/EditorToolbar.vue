<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { onClickOutside } from '@vueuse/core'
import type { Editor } from '@tiptap/vue-3'
import { useEditorSettingsStore } from '@/stores/editor-settings'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
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
  Smile,
  Strikethrough,
  Table,
  Trash2,
  Undo2,
  Unlink,
  Upload,
} from 'lucide-vue-next'
import { getDataSource } from '@/api'
import { uploadProcessedImage } from '@/composables/useImageUpload'
import {
  DEFAULT_ALLOWED_IMAGE_DOMAINS,
  extractDomain,
  isAllowedImageDomain,
} from '@/lib/image-domains'

const props = defineProps<{
  editor: Editor | undefined
}>()

const editorSettings = useEditorSettingsStore()

onMounted(() => {
  editorSettings.load()
})

const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const emojiOpen = ref(false)

const TABLE_MAX = 8
const tableMenuRef = ref<HTMLElement | null>(null)
const tableMenuOpen = ref(false)
const hoveredRows = ref(3)
const hoveredCols = ref(3)
const tableCells = Array.from({ length: TABLE_MAX * TABLE_MAX }, (_, index) => index)

onClickOutside(tableMenuRef, () => {
  tableMenuOpen.value = false
})

function tableRowFor(index: number): number {
  return Math.floor(index / TABLE_MAX) + 1
}

function tableColFor(index: number): number {
  return (index % TABLE_MAX) + 1
}

function setTableHover(index: number): void {
  hoveredRows.value = tableRowFor(index)
  hoveredCols.value = tableColFor(index)
}

function resetTableHover(): void {
  hoveredRows.value = 3
  hoveredCols.value = 3
}

const emojis = [
  '😀', '😂', '😍', '👍', '🎉', '🔥', '❤️', '✨',
  '🚀', '👏', '🤔', '😅', '🙏', '💡', '🌟', '🥳',
]

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

function insertEmoji(emoji: string): void {
  if (!props.editor) return
  props.editor.chain().focus().insertContent(emoji).run()
  emojiOpen.value = false
}

function setAlign(align: 'left' | 'center' | 'right'): void {
  if (!props.editor) return
  props.editor.chain().focus().setTextAlign(align).run()
}

function insertTable(rows: number, cols: number): void {
  if (!props.editor) return
  props.editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
  tableMenuOpen.value = false
}

function insertTableFromIndex(index: number): void {
  insertTable(tableRowFor(index), tableColFor(index))
}

function tableCommand(
  command:
    | 'addRowBefore'
    | 'addRowAfter'
    | 'deleteRow'
    | 'toggleHeaderRow'
    | 'addColumnBefore'
    | 'addColumnAfter'
    | 'deleteColumn'
    | 'deleteTable',
): void {
  if (!props.editor) return
  const chain = props.editor.chain().focus()
  switch (command) {
    case 'addRowBefore':
      chain.addRowBefore().run()
      break
    case 'addRowAfter':
      chain.addRowAfter().run()
      break
    case 'deleteRow':
      chain.deleteRow().run()
      break
    case 'toggleHeaderRow':
      chain.toggleHeaderRow().run()
      break
    case 'addColumnBefore':
      chain.addColumnBefore().run()
      break
    case 'addColumnAfter':
      chain.addColumnAfter().run()
      break
    case 'deleteColumn':
      chain.deleteColumn().run()
      break
    case 'deleteTable':
      chain.deleteTable().run()
      tableMenuOpen.value = false
      break
  }
}

async function insertImageUrl(): Promise<void> {
  if (!props.editor) return
  const url = window.prompt('Enter image URL (e.g. https://images.unsplash.com/...):')
  if (!url || !url.trim()) return

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

  const maxSize = editorSettings.settings.maxImageUploadSize
  if (maxSize > 0 && file.size > maxSize) {
    window.alert(
      `Ukuran file melebihi batas ${Math.round(maxSize / 1024 / 1024)}MB. Silakan pilih gambar yang lebih kecil.`,
    )
    input.value = ''
    return
  }

  uploading.value = true
  try {
    const result = await uploadProcessedImage(file)
    props.editor.chain().focus().setImage({ src: result.full }).run()
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
    <input
      ref="fileInput"
      type="file"
      accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
      class="sr-only"
      :disabled="uploading"
      @change="onFileSelected"
    />

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

    <template v-if="editorSettings.settings.showHeadings">
      <span class="toolbar-divider" />
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
    </template>

    <template v-if="editorSettings.settings.showFormatting">
      <span class="toolbar-divider" />
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
    </template>

    <template v-if="editorSettings.settings.showLists">
      <span class="toolbar-divider" />
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
    </template>

    <template v-if="editorSettings.settings.showBlockquote">
      <span class="toolbar-divider" />
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
    </template>

    <template v-if="editorSettings.settings.showRule">
      <span class="toolbar-divider" />
      <button
        type="button"
        title="Horizontal Divider"
        aria-label="Horizontal Divider"
        class="toolbar-btn"
        @click="editor.chain().focus().setHorizontalRule().run()"
      >
        <Minus class="h-4 w-4" aria-hidden="true" />
      </button>
    </template>

    <template v-if="editorSettings.settings.showLink || editorSettings.settings.showImageUpload || editorSettings.settings.showImageUrl || editorSettings.settings.showEmoji">
      <span class="toolbar-divider" />
      <button
        v-if="editorSettings.settings.showLink"
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
      <button
        v-if="editorSettings.settings.showImageUpload"
        type="button"
        title="Upload Image File"
        aria-label="Upload Image File"
        class="toolbar-btn"
        :disabled="uploading"
        @click="triggerFileUpload"
      >
        <Upload class="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        v-if="editorSettings.settings.showImageUrl"
        type="button"
        title="Insert Image from URL"
        aria-label="Insert Image from URL"
        class="toolbar-btn"
        @click="insertImageUrl"
      >
        <Image class="h-4 w-4" aria-hidden="true" />
      </button>
      <div v-if="editorSettings.settings.showEmoji" class="relative">
        <button
          type="button"
          title="Insert Emoji"
          aria-label="Insert Emoji"
          class="toolbar-btn"
          :class="{ 'is-active': emojiOpen }"
          @click="emojiOpen = !emojiOpen"
        >
          <Smile class="h-4 w-4" aria-hidden="true" />
        </button>
        <div
          v-if="emojiOpen"
          class="absolute end-0 top-full z-20 mt-2 grid w-44 grid-cols-4 gap-1 rounded-lg sm:rounded-2xl border border-neutral-200 bg-white p-2 shadow-float dark:border-neutral-800 dark:bg-neutral-900"
        >
          <button
            v-for="emoji in emojis"
            :key="emoji"
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-lg text-lg transition hover:bg-neutral-100 dark:hover:bg-neutral-800"
            @click="insertEmoji(emoji)"
          >
            {{ emoji }}
          </button>
        </div>
      </div>
    </template>

    <template v-if="editorSettings.settings.showAlign">
      <span class="toolbar-divider" />
      <button
        type="button"
        title="Align Left"
        aria-label="Align Left"
        class="toolbar-btn"
        :class="{ 'is-active': editor.isActive({ textAlign: 'left' }) }"
        @click="setAlign('left')"
      >
        <AlignLeft class="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        title="Align Center"
        aria-label="Align Center"
        class="toolbar-btn"
        :class="{ 'is-active': editor.isActive({ textAlign: 'center' }) }"
        @click="setAlign('center')"
      >
        <AlignCenter class="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        title="Align Right"
        aria-label="Align Right"
        class="toolbar-btn"
        :class="{ 'is-active': editor.isActive({ textAlign: 'right' }) }"
        @click="setAlign('right')"
      >
        <AlignRight class="h-4 w-4" aria-hidden="true" />
      </button>
    </template>

    <template v-if="editorSettings.settings.showTable">
      <span class="toolbar-divider" />
      <div ref="tableMenuRef" class="relative">
        <button
          type="button"
          title="Table"
          aria-label="Table"
          aria-haspopup="menu"
          :aria-expanded="tableMenuOpen"
          class="toolbar-btn"
          :class="{ 'is-active': tableMenuOpen || editor.isActive('table') }"
          @click="tableMenuOpen = !tableMenuOpen"
        >
          <Table class="h-4 w-4" aria-hidden="true" />
        </button>

        <div
          v-if="tableMenuOpen"
          class="absolute end-0 top-full z-20 mt-2 w-64 rounded-lg sm:rounded-2xl border border-neutral-200 bg-white p-3 shadow-float dark:border-neutral-800 dark:bg-neutral-900"
          role="menu"
        >
          <div class="mb-2 flex items-center justify-between gap-2">
            <span class="text-xs font-semibold text-neutral-700 dark:text-neutral-200">Insert table</span>
            <span class="text-xs font-medium text-primary-600 dark:text-primary-400">
              {{ hoveredRows }} × {{ hoveredCols }}
            </span>
          </div>

          <div
            class="grid grid-cols-8 gap-1"
            @mouseleave="resetTableHover"
          >
            <button
              v-for="cell in tableCells"
              :key="cell"
              type="button"
              :title="`${tableRowFor(cell)} rows × ${tableColFor(cell)} columns`"
              :aria-label="`Insert ${tableRowFor(cell)} rows by ${tableColFor(cell)} columns table`"
              class="h-5 w-5 rounded border transition"
              :class="
                tableRowFor(cell) <= hoveredRows && tableColFor(cell) <= hoveredCols
                  ? 'border-primary-500 bg-primary-500'
                  : 'border-neutral-300 bg-neutral-50 hover:border-primary-300 dark:border-neutral-700 dark:bg-neutral-800'
              "
              @mouseenter="setTableHover(cell)"
              @focus="setTableHover(cell)"
              @click="insertTableFromIndex(cell)"
            />
          </div>

          <div v-if="editor.isActive('table')" class="mt-3 border-t border-neutral-200 pt-2 dark:border-neutral-800">
            <p class="mb-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Rows
            </p>
            <div class="grid grid-cols-2 gap-1">
              <button type="button" class="table-menu-btn" @click="tableCommand('addRowBefore')">
                + Row above
              </button>
              <button type="button" class="table-menu-btn" @click="tableCommand('addRowAfter')">
                + Row below
              </button>
              <button type="button" class="table-menu-btn" @click="tableCommand('deleteRow')">
                − Delete row
              </button>
              <button type="button" class="table-menu-btn" @click="tableCommand('toggleHeaderRow')">
                Toggle header
              </button>
            </div>

            <p class="mb-1 mt-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Columns
            </p>
            <div class="grid grid-cols-2 gap-1">
              <button type="button" class="table-menu-btn" @click="tableCommand('addColumnBefore')">
                + Column left
              </button>
              <button type="button" class="table-menu-btn" @click="tableCommand('addColumnAfter')">
                + Column right
              </button>
              <button type="button" class="table-menu-btn" @click="tableCommand('deleteColumn')">
                − Delete column
              </button>
              <button
                type="button"
                class="table-menu-btn flex items-center justify-center gap-1 text-rose-600 dark:text-rose-400"
                @click="tableCommand('deleteTable')"
              >
                <Trash2 class="h-3.5 w-3.5" aria-hidden="true" />
                Delete table
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
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

.table-menu-btn {
  @apply rounded-lg px-2 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800;
}
</style>
