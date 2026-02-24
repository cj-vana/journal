'use client'

import { useState, useEffect, useRef } from 'react'
import Button from '@/components/ui/Button'
import { Copy, RefreshCw, Check } from 'lucide-react'

export default function ShowerSettings() {
  const [enabled, setEnabled] = useState(false)
  const [code, setCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    fetch('/api/shower/config')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load')
        return r.json()
      })
      .then((data) => {
        setEnabled(data.showerEnabled ?? false)
        setCode(data.showerCode ?? null)
      })
      .catch(() => setError('Failed to load shower settings'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    }
  }, [])

  async function handleToggle() {
    const newEnabled = !enabled
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/shower/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newEnabled }),
      })
      if (!res.ok) throw new Error('Failed to update')
      const data = await res.json()
      setEnabled(data.showerEnabled)
      setCode(data.showerCode)
    } catch {
      setError('Failed to update shower settings')
    } finally {
      setSaving(false)
    }
  }

  async function handleRegenerate() {
    if (!confirm('Generate a new link? The old link will stop working.')) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/shower/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerate: true }),
      })
      if (!res.ok) throw new Error('Failed to regenerate')
      const data = await res.json()
      setCode(data.showerCode)
    } catch {
      setError('Failed to regenerate link')
    } finally {
      setSaving(false)
    }
  }

  function handleCopy() {
    if (!code) return
    const url = `${window.location.origin}/shower/${code}`
    navigator.clipboard.writeText(url)
      .then(() => {
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
        setCopied(true)
        copyTimerRef.current = setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => {
        // Fallback: select the input text so user can copy manually
        const input = document.querySelector<HTMLInputElement>('input[readonly]')
        if (input) { input.select(); input.setSelectionRange(0, input.value.length) }
      })
  }

  if (loading) {
    return (
      <div className="bg-white border border-warm-200 rounded-2xl shadow-sm p-6 mb-6">
        <div className="animate-pulse h-6 bg-warm-100 rounded w-1/3 mb-4" />
        <div className="animate-pulse h-10 bg-warm-100 rounded w-full" />
      </div>
    )
  }

  const shareUrl = code ? `${typeof window !== 'undefined' ? window.location.origin : ''}/shower/${code}` : null

  return (
    <div className="bg-white border border-warm-200 rounded-2xl shadow-sm p-6 mb-6">
      <h2 className="text-lg font-semibold text-warm-800 mb-4">
        Baby Shower Guestbook
      </h2>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-4">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-warm-700">
            Allow guests to leave wishes via a shareable link
          </p>
        </div>
        <button
          role="switch"
          aria-checked={enabled}
          onClick={handleToggle}
          disabled={saving}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            enabled ? 'bg-accent-400' : 'bg-warm-300'
          } ${saving ? 'opacity-50' : ''}`}
        >
          <span
            className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
              enabled ? 'translate-x-5.5 ml-[2px]' : 'translate-x-0 ml-[2px]'
            } mt-[2px]`}
          />
        </button>
      </div>

      {enabled && shareUrl && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 bg-warm-50 border border-warm-200 rounded-xl px-3 py-2 text-sm text-warm-700 font-mono"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopy}
              title="Copy link"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRegenerate}
              disabled={saving}
              title="Generate new link"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-warm-500">
            Share this link with baby shower guests. They can leave messages without creating an account.
          </p>
        </div>
      )}
    </div>
  )
}
