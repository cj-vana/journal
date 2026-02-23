'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useDebounce } from '@/hooks/useDebounce'
import ImageUpload from '@/components/editor/ImageUpload'
import AudioRecorder from '@/components/editor/AudioRecorder'
import AudioPlayer from '@/components/editor/AudioPlayer'
import TagSelector from '@/components/entries/TagSelector'
import { useEditor, EditorContent } from '@tiptap/react'
import Placeholder from '@tiptap/extension-placeholder'
import { tiptapExtensions } from '@/lib/tiptap-extensions'
import { format } from 'date-fns'
import { Save, FileText, ArrowLeft, Loader2 } from 'lucide-react'

const EditorToolbar = dynamic(() => import('@/components/editor/EditorToolbar'), {
  ssr: false,
  loading: () => <div className="h-10 bg-warm-50 rounded-t-2xl border border-warm-200 animate-pulse" />,
})

interface AudioAttachment {
  id: string
  url: string
}

export default function NewEntryPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [entryDate, setEntryDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [mediaIds, setMediaIds] = useState<string[]>([])
  const [audioAttachments, setAudioAttachments] = useState<AudioAttachment[]>([])
  const [showAudioRecorder, setShowAudioRecorder] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSavedDraft, setLastSavedDraft] = useState('')
  const [draftId, setDraftId] = useState<string | null>(null)

  const debouncedContent = useDebounce(content, 3000)

  const editor = useEditor({
    extensions: [
      ...tiptapExtensions,
      Placeholder.configure({ placeholder: 'Write something...' }),
    ],
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
    onUpdate: ({ editor }) => {
      setContent(JSON.stringify(editor.getJSON()))
    },
  })

  // Auto-save draft
  useEffect(() => {
    if (!debouncedContent || debouncedContent === lastSavedDraft || !debouncedContent.includes('"content"')) return

    const autoSave = async () => {
      try {
        const draftPayload = {
          title: title || undefined,
          content: debouncedContent,
          entryDate,
          tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
          mediaIds: mediaIds.length > 0 ? mediaIds : undefined,
          isDraft: true,
        }

        if (draftId) {
          // Update existing draft
          await fetch(`/api/entries/${draftId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(draftPayload),
          })
        } else {
          // Create new draft
          const res = await fetch('/api/entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(draftPayload),
          })
          if (res.ok) {
            const data = await res.json()
            setDraftId(data.id)
          }
        }
        setLastSavedDraft(debouncedContent)
      } catch {
        // Silent fail for auto-save
      }
    }

    autoSave()
  }, [debouncedContent]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = useCallback(
    async (isDraft = false) => {
      if (!content) return
      setIsSaving(true)
      try {
        const payload = {
          title: title || undefined,
          content,
          entryDate,
          tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
          mediaIds: mediaIds.length > 0 ? mediaIds : undefined,
          isDraft,
        }

        const url = draftId ? `/api/entries/${draftId}` : '/api/entries'
        const method = draftId ? 'PUT' : 'POST'

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to save')
        }

        const entry = await res.json()
        router.push(`/entries/${entry.id}`)
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to save entry')
      } finally {
        setIsSaving(false)
      }
    },
    [content, title, entryDate, selectedTagIds, mediaIds, draftId, router]
  )

  const handleImageUpload = useCallback(() => {
    const input = document.querySelector<HTMLInputElement>('input[type="file"][accept*="image"]')
    input?.click()
  }, [])

  const handleImageUploadComplete = useCallback(
    (media: { id: string; url: string; thumbnailUrl: string }) => {
      setMediaIds((prev) => [...prev, media.id])
    },
    []
  )

  const handleAudioComplete = useCallback(
    (media: { id: string; url: string }) => {
      setMediaIds((prev) => [...prev, media.id])
      setAudioAttachments((prev) => [...prev, media])
      setShowAudioRecorder(false)
    },
    []
  )

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => router.push('/entries')}
          className="p-2 text-warm-600 hover:text-warm-800 hover:bg-warm-100 rounded-xl transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-3xl font-accent text-warm-800">New Entry</h1>
      </div>

      <div className="space-y-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Entry title (optional)"
          className="w-full px-4 py-3 bg-white border border-warm-200 rounded-2xl text-warm-800 text-lg font-accent placeholder:text-warm-500 focus:outline-none focus:ring-2 focus:ring-warm-200"
        />

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-warm-600 mb-1">Entry Date</label>
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-warm-200 rounded-xl text-warm-800 text-sm focus:outline-none focus:ring-2 focus:ring-warm-200"
            />
          </div>
          <div className="flex-1">
            <TagSelector selectedTagIds={selectedTagIds} onChange={setSelectedTagIds} />
          </div>
        </div>

        <div>
          <EditorToolbar
            editor={editor}
            onImageUpload={handleImageUpload}
            onAudioUpload={() => setShowAudioRecorder(true)}
          />
          <div className="bg-white rounded-b-2xl border border-t-0 border-warm-200">
            {editor && <EditorContent editor={editor} />}
          </div>
          <ImageUpload
            editor={editor}
            onUploadComplete={handleImageUploadComplete}
          />
        </div>

        {showAudioRecorder && (
          <AudioRecorder
            onUploadComplete={handleAudioComplete}
            onCancel={() => setShowAudioRecorder(false)}
          />
        )}

        {audioAttachments.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-warm-600">Audio Attachments</h3>
            {audioAttachments.map((audio) => (
              <AudioPlayer key={audio.id} src={audio.url} />
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 pt-4">
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={isSaving || !content}
            className="flex items-center gap-2 px-6 py-2.5 bg-rose-400 text-white rounded-xl hover:bg-rose-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            <span>Save Entry</span>
          </button>
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={isSaving || !content}
            className="flex items-center gap-2 px-6 py-2.5 bg-white border border-warm-200 text-warm-600 rounded-xl hover:bg-warm-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText size={18} />
            <span>Save as Draft</span>
          </button>
        </div>
      </div>
    </div>
  )
}
