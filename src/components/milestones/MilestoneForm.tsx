'use client'

import { useState } from 'react'
import { MILESTONE_CATEGORIES, MILESTONE_SUGGESTIONS } from '@/lib/constants'
import { format } from 'date-fns'

const MILESTONE_EMOJIS = [
  '👶', '🦷', '👣', '🗣️', '😊', '🧒', '🎂', '✏️',
  '🚲', '🏊', '📖', '🎵', '🍼', '💤', '🤗', '⭐',
]

const SUGGESTION_CATEGORIES: Record<string, string> = {
  'First Smile': 'social',
  'First Laugh': 'social',
  'First Words': 'language',
  'First Steps': 'physical',
  'First Tooth': 'physical',
  'First Solid Food': 'physical',
  'First Crawl': 'physical',
  'First Day of School': 'cognitive',
  'First Friend': 'social',
  'First Drawing': 'cognitive',
  'First Bike Ride': 'physical',
  'Slept Through the Night': 'physical',
  'First Haircut': 'physical',
  'First Bath': 'physical',
  'First Roll Over': 'physical',
  'First Sit Up': 'physical',
  'First Wave': 'social',
  'First Clap': 'physical',
}

interface Props {
  initialData?: {
    title: string
    description: string
    date: string
    category: string
    icon: string
  }
  onSubmit: (data: Record<string, unknown>) => void
  onCancel: () => void
}

export function MilestoneForm({ initialData, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState(initialData?.title || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [date, setDate] = useState(initialData?.date || format(new Date(), 'yyyy-MM-dd'))
  const [category, setCategory] = useState(initialData?.category || '')
  const [icon, setIcon] = useState(initialData?.icon || '⭐')
  const [submitting, setSubmitting] = useState(false)

  function handleSuggestionSelect(suggestion: string) {
    setTitle(suggestion)
    const suggestedCategory = SUGGESTION_CATEGORIES[suggestion]
    if (suggestedCategory) {
      setCategory(suggestedCategory)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    setSubmitting(true)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        date: new Date(date).toISOString(),
        category: category || undefined,
        icon: icon || undefined,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-warm-200 shadow-sm p-6"
    >
      <h3 className="text-lg font-accent text-warm-800 mb-4">
        {initialData ? 'Edit Milestone' : 'New Milestone'}
      </h3>

      {/* Suggestion dropdown */}
      {!initialData && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-warm-600 mb-1">
            Quick select
          </label>
          <select
            value=""
            onChange={(e) => { if (e.target.value) handleSuggestionSelect(e.target.value) }}
            className="w-full px-3 py-2 rounded-xl border border-warm-200 bg-warm-50 text-warm-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
          >
            <option value="">Choose a common milestone...</option>
            {MILESTONE_SUGGESTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}

      {/* Title */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-warm-600 mb-1">
          Title *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., First Steps"
          required
          className="w-full px-3 py-2 rounded-xl border border-warm-200 text-warm-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
        />
      </div>

      {/* Date */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-warm-600 mb-1">
          Date *
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="w-full px-3 py-2 rounded-xl border border-warm-200 text-warm-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
        />
      </div>

      {/* Category */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-warm-600 mb-1">
          Category
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-warm-200 bg-white text-warm-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
        >
          <option value="">No category</option>
          {MILESTONE_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-warm-600 mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tell us about this moment..."
          rows={3}
          className="w-full px-3 py-2 rounded-xl border border-warm-200 text-warm-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
        />
      </div>

      {/* Icon picker */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-warm-600 mb-2">
          Icon
        </label>
        <div className="flex flex-wrap gap-2">
          {MILESTONE_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setIcon(emoji)}
              className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                icon === emoji
                  ? 'bg-rose-100 ring-2 ring-rose-400 scale-110'
                  : 'bg-warm-50 hover:bg-warm-100'
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl text-sm text-warm-600 hover:bg-warm-100 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || !title.trim()}
          className="px-6 py-2 rounded-xl text-sm font-medium bg-rose-400 text-white hover:bg-rose-600 disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Saving...' : initialData ? 'Update' : 'Add Milestone'}
        </button>
      </div>
    </form>
  )
}
