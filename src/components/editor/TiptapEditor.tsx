'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Color from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import Blockquote from '@tiptap/extension-blockquote'
import { useEffect, useRef } from 'react'

interface TiptapEditorProps {
  content: string
  onChange: (json: string) => void
  placeholder?: string
  editable?: boolean
}

export const tiptapExtensions = [
  StarterKit.configure({
    horizontalRule: false,
    blockquote: false,
  }),
  Image.configure({
    HTMLAttributes: {
      class: 'rounded-xl max-w-full h-auto',
    },
  }),
  Color,
  TextStyle,
  Underline,
  Link.configure({
    openOnClick: false,
    HTMLAttributes: {
      class: 'text-sky-600 underline hover:text-sky-800',
    },
  }),
  TextAlign.configure({
    types: ['heading', 'paragraph'],
  }),
  HorizontalRule,
  Blockquote,
]

export default function TiptapEditor({
  content,
  onChange,
  placeholder = 'Write something...',
  editable = true,
}: TiptapEditorProps) {
  const isInitialMount = useRef(true)

  const editor = useEditor({
    extensions: [
      ...tiptapExtensions,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: content ? JSON.parse(content) : undefined,
    editable,
    onUpdate: ({ editor }) => {
      onChange(JSON.stringify(editor.getJSON()))
    },
    editorProps: {
      attributes: {
        class:
          'min-h-[300px] px-6 py-4 focus:outline-none prose prose-warm max-w-none ' +
          'prose-headings:font-accent prose-headings:text-warm-800 ' +
          'prose-p:text-warm-800 prose-p:leading-relaxed ' +
          'prose-a:text-sky-600 prose-a:no-underline hover:prose-a:underline ' +
          'prose-blockquote:border-l-4 prose-blockquote:border-rose-300 prose-blockquote:pl-4 prose-blockquote:italic ' +
          'prose-img:rounded-xl prose-img:max-w-full ' +
          'prose-hr:border-warm-200',
      },
    },
  })

  useEffect(() => {
    if (editor && isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    if (editor && content) {
      const currentContent = JSON.stringify(editor.getJSON())
      if (currentContent !== content) {
        editor.commands.setContent(JSON.parse(content))
      }
    }
  }, [content, editor])

  if (!editor) return null

  return (
    <div className="bg-white rounded-b-2xl border border-t-0 border-warm-200">
      <EditorContent editor={editor} />
    </div>
  )
}

export { TiptapEditor }
