'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import ImageUpload from '@/components/editor/ImageUpload'
import AudioRecorder from '@/components/editor/AudioRecorder'
import AudioPlayer from '@/components/editor/AudioPlayer'
import TagSelector from '@/components/entries/TagSelector'
import { useEditor, EditorContent } from '@tiptap/react'
import Placeholder from '@tiptap/extension-placeholder'
import { tiptapExtensions } from '@/lib/tiptap-extensions'
import { format } from 'date-fns'
import { Save, ArrowLeft, Loader2 } from 'lucide-react'

const EditorToolbar = dynamic(() => import('@/components/editor/EditorToolbar'), {
  ssr: false,
  loading: () => <div className="h-10 bg-warm-50 rounded-t-2xl border border-warm-200 animate-pulse" />,
})

interface AudioAttachment {
  id: string
  url: string
}

export default function EditEntryPage() {
  const router = useRouter()
  const params = useParams()
  const entryId = params.id as string

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [entryDate, setEntryDate] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [mediaIds, setMediaIds] = useState<string[]>([])
  const [audioAttachments, setAudioAttachments] = useState<AudioAttachment[]>([])
  const [showAudioRecorder, setShowAudioRecorder] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

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

  // Load existing entry
  useEffect(() => {
    async function loadEntry() {
      try {
        const res = await fetch(`/api/entries/${entryId}`)
        if (!res.ok) throw new Error('Failed to load entry')
        const entry = await res.json()

        setTitle(entry.title || '')
        setEntryDate(format(new Date(entry.entryDate), 'yyyy-MM-dd'))
        setSelectedTagIds(entry.tags.map((t: { tag: { id: string } }) => t.tag.id))

        const audioMedia = entry.media
          .filter((m: { type: string }) => m.type === 'audio')
          .map((m: { id: string; path: string }) => ({
            id: m.id,
            url: `/api/files/${m.path}`,
          }))
        setAudioAttachments(audioMedia)
        setMediaIds(entry.media.map((m: { id: string }) => m.id))

        if (editor) {
          try {
            const json = JSON.parse(entry.content)
            editor.commands.setContent(json)
            setContent(entry.content)
          } catch {
            editor.commands.setContent(entry.content)
            setContent(entry.content)
          }
        }
      } catch (err) {
        alert('Failed to load entry')
        router.push('/entries')
      } finally {
        setIsLoading(false)
      }
    }

    if (editor) loadEntry()
  }, [entryId, editor, router])

  const handleSave = useCallback(async () => {
    if (!content) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/entries/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || undefined,
          content,
          entryDate,
          tagIds: selectedTagIds,
          mediaIds,
          isDraft: false,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save')
      }

      router.push(`/entries/${entryId}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save entry')
    } finally {
      setIsSaving(false)
    }
  }, [content, title, entryDate, selectedTagIds, mediaIds, entryId, router])

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={32} className="animate-spin text-warm-600" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => router.push(`/entries/${entryId}`)}
          className="p-2 text-warm-600 hover:text-warm-800 hover:bg-warm-100 rounded-xl transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-3xl font-accent text-warm-800">Edit Entry</h1>
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
            onImageUpload={() => {
              const input = document.querySelector<HTMLInputElement>('input[type="file"][accept*="image"]')
              input?.click()
            }}
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
            onClick={handleSave}
            disabled={isSaving || !content}
            className="flex items-center gap-2 px-6 py-2.5 bg-rose-400 text-white rounded-xl hover:bg-rose-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>
  )
}
