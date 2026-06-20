'use client'

import { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import DatePicker from '@/components/ui/DatePicker'
import Modal from '@/components/ui/Modal'
import { EVENT_TYPES, eventMeta } from '@/lib/events'
import { Copy, RefreshCw, Check, Trash2, Plus } from 'lucide-react'

interface EventItem {
  id: string
  code: string
  type: string
  title: string
  honoreeName: string | null
  eventDate: string | null
  enabled: boolean
  welcomeMessage: string | null
  _count: { messages: number }
}

export default function GuestbookManager() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [regeneratedId, setRegeneratedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ type: 'birthday', title: '', honoreeName: '', eventDate: '', welcomeMessage: '' })

  useEffect(() => {
    fetch('/api/events')
      .then((r) => { if (!r.ok) throw new Error('load'); return r.json() })
      .then(setEvents)
      .catch(() => setError('Failed to load guestbooks'))
      .finally(() => setLoading(false))
  }, [])

  function shareUrl(code: string) {
    return `${typeof window !== 'undefined' ? window.location.origin : ''}/party/${code}`
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setBusyId(id)
    setError(null)
    try {
      const res = await fetch(`/api/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('update')
      const updated = await res.json()
      setEvents((prev) => prev.map((e) => (e.id === id ? updated : e)))
      if (body.regenerateCode) {
        setRegeneratedId(id)
        setTimeout(() => setRegeneratedId((c) => (c === id ? null : c)), 2000)
      }
    } catch {
      setError('Failed to update guestbook')
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this guestbook and all of its messages? This cannot be undone.')) return
    setBusyId(id)
    setError(null)
    try {
      const res = await fetch(`/api/events/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('delete')
      setEvents((prev) => prev.filter((e) => e.id !== id))
    } catch {
      setError('Failed to delete guestbook')
    } finally {
      setBusyId(null)
    }
  }

  function handleCopy(id: string, code: string) {
    navigator.clipboard.writeText(shareUrl(code)).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 2000)
    }).catch(() => {})
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.type,
          title: form.title.trim(),
          honoreeName: form.honoreeName.trim() || undefined,
          eventDate: form.eventDate || undefined,
          welcomeMessage: form.welcomeMessage.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error('create')
      const created = await res.json()
      setEvents((prev) => [created, ...prev])
      setShowCreate(false)
      setForm({ type: 'birthday', title: '', honoreeName: '', eventDate: '', welcomeMessage: '' })
    } catch {
      setError('Failed to create guestbook')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="bg-white border border-warm-200 rounded-2xl shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-warm-800">Guestbooks</h2>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-1" /> New
        </Button>
      </div>

      <p className="text-sm text-warm-600 mb-4">
        Create a shareable guestbook for a baby shower, birthday, or any party. Guests leave messages
        without an account; you review them in the Guestbook page.
      </p>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-4">{error}</div>}

      {loading ? (
        <div className="animate-pulse h-16 bg-warm-100 rounded-xl" />
      ) : events.length === 0 ? (
        <p className="text-sm text-warm-500 py-4 text-center">No guestbooks yet. Create one to start collecting messages.</p>
      ) : (
        <ul className="space-y-3">
          {events.map((ev) => (
            <li key={ev.id} className="border border-warm-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true">{eventMeta(ev.type).emoji}</span>
                    <span className="font-medium text-warm-800 truncate">{ev.title}</span>
                  </div>
                  <p className="text-xs text-warm-500 mt-0.5">
                    {ev._count.messages} message{ev._count.messages !== 1 ? 's' : ''}
                    {ev.eventDate ? ` · ${new Date(ev.eventDate).toLocaleDateString()}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    role="switch"
                    aria-checked={ev.enabled}
                    aria-label={ev.enabled ? 'Disable guestbook' : 'Enable guestbook'}
                    onClick={() => patch(ev.id, { enabled: !ev.enabled })}
                    disabled={busyId === ev.id}
                    className={`relative w-11 h-6 rounded-full transition-colors ${ev.enabled ? 'bg-accent-400' : 'bg-warm-300'} ${busyId === ev.id ? 'opacity-50' : ''}`}
                  >
                    <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform mt-[2px] ml-[2px] ${ev.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3">
                {ev.enabled && (
                  <>
                    <input
                      readOnly
                      value={shareUrl(ev.code)}
                      aria-label="Shareable guestbook link"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      className="flex-1 bg-warm-50 border border-warm-200 rounded-lg px-3 py-1.5 text-xs text-warm-700 font-mono"
                    />
                    <Button variant="secondary" size="sm" onClick={() => handleCopy(ev.id, ev.code)} title="Copy link" aria-label="Copy link">
                      {copiedId === ev.id ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { if (confirm('Generate a new link? The old link will stop working.')) patch(ev.id, { regenerateCode: true }) }} disabled={busyId === ev.id} title="Regenerate link" aria-label="Regenerate link">
                      {regeneratedId === ev.id ? <Check className="w-4 h-4 text-green-600" /> : <RefreshCw className="w-4 h-4" />}
                    </Button>
                  </>
                )}
                <Button variant="ghost" size="sm" onClick={() => handleDelete(ev.id)} disabled={busyId === ev.id} title="Delete guestbook" aria-label="Delete guestbook" className="ml-auto text-red-500 hover:text-red-700 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New guestbook">
        <form onSubmit={handleCreate} className="space-y-4">
          <Select
            label="Type"
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            options={EVENT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
          />
          <Input label="Title" required maxLength={120} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Mia's 1st Birthday" />
          <Input label="Honoree (optional)" maxLength={100} value={form.honoreeName} onChange={(e) => setForm((f) => ({ ...f, honoreeName: e.target.value }))} placeholder="Defaults to the child's name" />
          <DatePicker label="Event date (optional)" value={form.eventDate} onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))} />
          <Input label="Welcome message (optional)" maxLength={280} value={form.welcomeMessage} onChange={(e) => setForm((f) => ({ ...f, welcomeMessage: e.target.value }))} placeholder="Share a memory or a wish!" />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" disabled={creating || !form.title.trim()}>{creating ? 'Creating...' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
