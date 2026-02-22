'use client'

import { useRef, useState, useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import { Loader2 } from 'lucide-react'

interface ImageUploadProps {
  editor: Editor | null
  onUploadComplete?: (media: { id: string; url: string; thumbnailUrl: string }) => void
}

export default function ImageUpload({ editor, onUploadComplete }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const uploadImage = useCallback(
    async (file: File) => {
      setIsUploading(true)
      try {
        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch('/api/upload/image', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Upload failed')
        }

        const data = await res.json()

        if (editor) {
          editor.chain().focus().setImage({ src: data.url }).run()
        }

        onUploadComplete?.(data)
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Upload failed')
      } finally {
        setIsUploading(false)
      }
    },
    [editor, onUploadComplete]
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        uploadImage(file)
        e.target.value = ''
      }
    },
    [uploadImage]
  )

  const trigger = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  // Expose trigger and upload for parent components
  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const file = item.getAsFile()
          if (file) uploadImage(file)
          break
        }
      }
    },
    [uploadImage]
  )

  const handleDrop = useCallback(
    (e: DragEvent) => {
      const files = e.dataTransfer?.files
      if (!files) return
      for (const file of Array.from(files)) {
        if (file.type.startsWith('image/')) {
          e.preventDefault()
          uploadImage(file)
          break
        }
      }
    },
    [uploadImage]
  )

  // Attach paste/drop listeners to editor element
  const attachListeners = useCallback(
    (element: HTMLElement | null) => {
      if (!element) return
      element.addEventListener('paste', handlePaste)
      element.addEventListener('drop', handleDrop)
      return () => {
        element.removeEventListener('paste', handlePaste)
        element.removeEventListener('drop', handleDrop)
      }
    },
    [handlePaste, handleDrop]
  )

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
      {isUploading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 shadow-lg flex items-center gap-3">
            <Loader2 className="animate-spin text-warm-600" size={24} />
            <span className="text-warm-800">Uploading image...</span>
          </div>
        </div>
      )}
    </>
  )
}

export { ImageUpload }
export type { ImageUploadProps }
