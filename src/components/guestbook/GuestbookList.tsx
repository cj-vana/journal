'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { Trash2, ArrowUpFromLine } from 'lucide-react'

interface GuestMessage {
  id: string
  guestName: string
  message: string
  promotedToEntryId: string | null
  createdAt: string
  eventTitle: string | null
}

export default function GuestbookList({ messages: initial }: { messages: GuestMessage[] }) {
  const router = useRouter()
  const [messages, setMessages] = useState(initial)
  const [actionId, setActionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm('Delete this message?')) return
    setActionId(id)
    setError(null)
    try {
      const res = await fetch(`/api/events/messages/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== id))
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to delete message')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setActionId(null)
    }
  }

  async function handlePromote(id: string) {
    if (!confirm('Promote this message to a journal entry?')) return
    setActionId(id)
    setError(null)
    try {
      const res = await fetch(`/api/events/messages/${id}`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setMessages((prev) =>
          prev.map((m) =>
            m.id === id ? { ...m, promotedToEntryId: data.entryId } : m
          )
        )
        router.refresh()
      } else if (res.status === 409) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === id ? { ...m, promotedToEntryId: 'already' } : m
          )
        )
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to promote message')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setActionId(null)
    }
  }

  if (messages.length === 0) {
    return (
      <div className="text-center py-12 text-warm-600">
        <p>No messages yet. Share your guestbook link to start collecting wishes!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3">
          {error}
        </div>
      )}
      {messages.map((msg) => (
        <div
          key={msg.id}
          className="bg-white border border-warm-200 rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-semibold text-warm-800">{msg.guestName}</h3>
                {msg.eventTitle && (
                  <span className="text-xs bg-warm-100 text-warm-600 px-2 py-0.5 rounded-full">
                    {msg.eventTitle}
                  </span>
                )}
                {msg.promotedToEntryId && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    Promoted
                  </span>
                )}
              </div>
              <p className="text-warm-700 whitespace-pre-wrap">{msg.message}</p>
              <p className="text-xs text-warm-500 mt-2">
                {new Date(msg.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            </div>

            <div className="flex gap-2 flex-shrink-0">
              {!msg.promotedToEntryId && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePromote(msg.id)}
                  disabled={actionId === msg.id}
                  title="Promote to journal entry"
                >
                  <ArrowUpFromLine className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(msg.id)}
                disabled={actionId === msg.id}
                title="Delete message"
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
