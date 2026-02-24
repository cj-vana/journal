'use client'

import { useState, useEffect, use } from 'react'

type PageState = 'loading' | 'invalid' | 'form' | 'submitted'

export default function ShowerGuestPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const [state, setState] = useState<PageState>('loading')
  const [childName, setChildName] = useState('')
  const [theme, setTheme] = useState('neutral')
  const [guestName, setGuestName] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/shower/validate?code=${encodeURIComponent(code)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.valid) {
          setChildName(data.childName)
          setTheme(data.theme)
          setState('form')
        } else {
          setState('invalid')
        }
      })
      .catch(() => setState('invalid'))
  }, [code])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/shower/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestName, message, showerCode: code }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to submit')
      }

      setState('submitted')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (state === 'loading') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-warm-200 p-8 text-center">
        <div className="animate-pulse text-warm-600">Loading...</div>
      </div>
    )
  }

  if (state === 'invalid') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-warm-200 p-8 text-center">
        <h1 className="text-2xl font-accent text-warm-800 mb-2">Unavailable</h1>
        <p className="text-warm-600">This guestbook link is no longer active.</p>
      </div>
    )
  }

  if (state === 'submitted') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-warm-200 p-8 text-center" data-theme={theme}>
        <div className="text-4xl mb-4">💛</div>
        <h1 className="text-2xl font-accent text-warm-800 mb-2">Thank You!</h1>
        <p className="text-warm-600">
          Your wish for {childName} has been received. The family will treasure your kind words!
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-warm-200 p-8" data-theme={theme}>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-accent text-warm-800 mb-1">
          Leave a Wish for {childName}
        </h1>
        <p className="text-warm-600 text-sm">
          Share your love and best wishes with the family
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="guestName" className="block text-sm font-medium text-warm-800 mb-1.5">
            Your Name
          </label>
          <input
            id="guestName"
            type="text"
            required
            maxLength={100}
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="w-full bg-white border border-warm-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-accent-400 focus:border-accent-400 outline-none transition-colors"
            placeholder="Your name"
          />
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-warm-800 mb-1.5">
            Your Message
          </label>
          <textarea
            id="message"
            required
            maxLength={2000}
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full bg-white border border-warm-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-accent-400 focus:border-accent-400 outline-none transition-colors resize-none"
            placeholder="Write your wishes here..."
          />
          <p className="text-xs text-warm-500 mt-1">{message.length}/2000</p>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting || !guestName.trim() || !message.trim()}
          className="w-full bg-accent-400 hover:bg-accent-600 text-white rounded-xl font-medium py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Sending...' : 'Send Your Wish'}
        </button>
      </form>
    </div>
  )
}
