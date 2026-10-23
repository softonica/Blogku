<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableCell } from '@tiptap/extension-table-cell'
import { useEditorSettingsStore } from '@/stores/editor-settings'
import EditorToolbar from './EditorToolbar.vue'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    placeholder?: string
    disabled?: boolean
  }>(),
  {
    modelValue: '',
    placeholder: 'Write your post here…',
    disabled: false,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const editorSettings = useEditorSettingsStore()

onMounted(() => {
  editorSettings.load()
})

const editor = useEditor({
  content: props.modelValue,
  editable: !props.disabled,
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [2, 3],
      },
      link: false,
    }),
    Placeholder.configure({
      placeholder: () =>
        editorSettings.loaded ? editorSettings.settings.placeholder : props.placeholder,
    }),
    Link.configure({
      openOnClick: false,
      autolink: editorSettings.settings.autolink,
      HTMLAttributes: {
        rel: 'noopener noreferrer',
        class: 'text-primary-600 underline hover:text-primary-700 dark:text-primary-400',
      },
    }),
    Image.configure({
      inline: false,
      HTMLAttributes: {
        class: 'rounded-2xl max-h-[500px] object-cover mx-auto my-4 shadow-sm',
      },
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    Table.configure({
      resizable: true,
      HTMLAttributes: {
        class: 'border-collapse table-auto w-full my-4',
      },
    }),
    TableRow,
    TableHeader,
    TableCell,
  ],
  editorProps: {
    attributes: {
      class:
        'prose-ncmaz max-w-none focus:outline-none min-h-[360px] p-5 text-neutral-900 dark:text-white',
    },
  },
  onUpdate: ({ editor: ed }) => {
    emit('update:modelValue', ed.getHTML())
  },
})

watch(
  () => props.modelValue,
  (val) => {
    if (!editor.value) return
    const isSame = editor.value.getHTML() === val
    if (!isSame) {
      editor.value.commands.setContent(val || '', { emitUpdate: false })
    }
  },
)

watch(
  () => props.disabled,
  (disabled) => {
    editor.value?.setEditable(!disabled)
  },
)

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<template>
  <div
    class="overflow-hidden rounded-2xl border border-neutral-300 bg-white transition focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-200 dark:border-neutral-700 dark:bg-neutral-900 dark:focus-within:border-primary-500 dark:focus-within:ring-primary-900"
  >
    <EditorToolbar :editor="editor" />
    <EditorContent :editor="editor" />
  </div>
</template>

<style scoped>
:deep(.tiptap p.is-editor-empty:first-child::before) {
  color: rgb(156 163 175);
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}

:deep(.tiptap) {
  min-height: 360px;
}

:deep(.tiptap:focus) {
  outline: none;
}

:deep(.tiptap img) {
  max-width: 100%;
  height: auto;
}
</style>
