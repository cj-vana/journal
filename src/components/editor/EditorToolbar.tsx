'use client'

import type { Editor } from '@tiptap/react'
import { cn } from '@/lib/utils'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  ImagePlus,
  Mic,
  Palette,
} from 'lucide-react'
import { useState, useRef, useEffect, useCallback } from 'react'

interface EditorToolbarProps {
  editor: Editor | null
  onImageUpload: () => void
  onAudioUpload: () => void
}

const COLORS = [
  { name: 'Default', value: '' },
  { name: 'Warm Brown', value: '#6B5B3E' },
  { name: 'Rose', value: '#D16B77' },
  { name: 'Sage', value: '#5A8A5A' },
  { name: 'Sky', value: '#4A8BC4' },
  { name: 'Lavender', value: '#7E5AB5' },
  { name: 'Coral', value: '#E07850' },
  { name: 'Gold', value: '#C4960A' },
]

function ToolbarButton({
  onClick,
  isActive = false,
  children,
  title,
  ...rest
}: {
  onClick: () => void
  isActive?: boolean
  children: React.ReactNode
  title: string
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'title' | 'children'>) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={isActive}
      className={cn(
        'p-1.5 rounded-lg transition-colors',
        isActive
          ? 'bg-warm-200 text-warm-800'
          : 'text-warm-600 hover:bg-warm-100 hover:text-warm-800'
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-6 bg-warm-200 mx-1" />
}

export default function EditorToolbar({ editor, onImageUpload, onAudioUpload }: EditorToolbarProps) {
  const [showColors, setShowColors] = useState(false)
  const colorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) {
        setShowColors(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleColorKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowColors(false)
    }
  }, [])

  useEffect(() => {
    if (showColors) {
      document.addEventListener('keydown', handleColorKeyDown)
    }
    return () => document.removeEventListener('keydown', handleColorKeyDown)
  }, [showColors, handleColorKeyDown])

  if (!editor) return null

  const addLink = () => {
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('Enter URL:', previousUrl || 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  const iconSize = 18

  return (
    <div role="toolbar" aria-label="Text formatting" className="bg-warm-50 border border-warm-200 rounded-t-2xl px-3 py-2 flex flex-wrap items-center gap-0.5">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="Bold"
      >
        <Bold size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="Italic"
      >
        <Italic size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        title="Underline"
      >
        <Underline size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        title="Strikethrough"
      >
        <Strikethrough size={iconSize} />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        title="Heading 1"
      >
        <Heading1 size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        title="Heading 2"
      >
        <Heading2 size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        title="Heading 3"
      >
        <Heading3 size={iconSize} />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="Bullet list"
      >
        <List size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="Ordered list"
      >
        <ListOrdered size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        title="Blockquote"
      >
        <Quote size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal rule"
      >
        <Minus size={iconSize} />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        isActive={editor.isActive({ textAlign: 'left' })}
        title="Align left"
      >
        <AlignLeft size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        isActive={editor.isActive({ textAlign: 'center' })}
        title="Align center"
      >
        <AlignCenter size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        isActive={editor.isActive({ textAlign: 'right' })}
        title="Align right"
      >
        <AlignRight size={iconSize} />
      </ToolbarButton>

      <Divider />

      <div className="relative" ref={colorRef}>
        <ToolbarButton onClick={() => setShowColors(!showColors)} title="Text color" aria-haspopup="true">
          <Palette size={iconSize} />
        </ToolbarButton>
        {showColors && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-warm-200 rounded-xl shadow-lg p-2 z-50 grid grid-cols-4 gap-1">
            {COLORS.map((color) => (
              <button
                key={color.name}
                type="button"
                title={color.name}
                aria-label={color.name}
                onClick={() => {
                  if (color.value === '') {
                    editor.chain().focus().unsetColor().run()
                  } else {
                    editor.chain().focus().setColor(color.value).run()
                  }
                  setShowColors(false)
                }}
                className="w-7 h-7 rounded-full border-2 border-warm-200 hover:border-warm-400 transition-colors"
                style={{
                  backgroundColor: color.value || '#374151',
                }}
              />
            ))}
          </div>
        )}
      </div>

      <ToolbarButton onClick={addLink} isActive={editor.isActive('link')} title="Link">
        <LinkIcon size={iconSize} />
      </ToolbarButton>

      <Divider />

      <ToolbarButton onClick={onImageUpload} title="Upload image">
        <ImagePlus size={iconSize} />
      </ToolbarButton>
      <ToolbarButton onClick={onAudioUpload} title="Record audio">
        <Mic size={iconSize} />
      </ToolbarButton>
    </div>
  )
}
