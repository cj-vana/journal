'use client'

import { useState } from 'react'
import { format } from 'date-fns'

interface Props {
  onSubmit: (data: Record<string, unknown>) => void
  onCancel: () => void
}

export function GrowthForm({ onSubmit, onCancel }: Props) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [heightCm, setHeightCm] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [headCm, setHeadCm] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const hasAtLeastOneMeasurement = heightCm || weightKg || headCm

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!hasAtLeastOneMeasurement) {
      setError('Please enter at least one measurement.')
      return
    }
    setError('')
    setSubmitting(true)

    try {
      await onSubmit({
        date: new Date(date).toISOString(),
        heightCm: heightCm ? parseFloat(heightCm) : undefined,
        weightKg: weightKg ? parseFloat(weightKg) : undefined,
        headCm: headCm ? parseFloat(headCm) : undefined,
        notes: notes.trim() || undefined,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
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
        Add Measurement
      </h3>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Date */}
      <div className="mb-4">
        <label htmlFor="growth-date" className="block text-sm font-medium text-warm-600 mb-1">
          Date *
        </label>
        <input
          id="growth-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="w-full px-3 py-2 rounded-xl border border-warm-200 text-warm-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
        />
      </div>

      {/* Measurements grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div>
          <label htmlFor="growth-height" className="block text-sm font-medium text-warm-600 mb-1">
            Height (cm)
          </label>
          <input
            id="growth-height"
            type="number"
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
            placeholder="e.g., 50.5"
            step="0.1"
            min="0"
            max="200"
            className="w-full px-3 py-2 rounded-xl border border-warm-200 text-warm-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
          />
        </div>
        <div>
          <label htmlFor="growth-weight" className="block text-sm font-medium text-warm-600 mb-1">
            Weight (kg)
          </label>
          <input
            id="growth-weight"
            type="number"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            placeholder="e.g., 3.50"
            step="0.01"
            min="0"
            max="100"
            className="w-full px-3 py-2 rounded-xl border border-warm-200 text-warm-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
          />
        </div>
        <div>
          <label htmlFor="growth-head" className="block text-sm font-medium text-warm-600 mb-1">
            Head (cm)
          </label>
          <input
            id="growth-head"
            type="number"
            value={headCm}
            onChange={(e) => setHeadCm(e.target.value)}
            placeholder="e.g., 35.0"
            step="0.1"
            min="0"
            max="100"
            className="w-full px-3 py-2 rounded-xl border border-warm-200 text-warm-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="mb-6">
        <label htmlFor="growth-notes" className="block text-sm font-medium text-warm-600 mb-1">
          Notes
        </label>
        <textarea
          id="growth-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any observations..."
          rows={2}
          className="w-full px-3 py-2 rounded-xl border border-warm-200 text-warm-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 resize-none"
        />
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
          disabled={submitting || !hasAtLeastOneMeasurement}
          className="px-6 py-2 rounded-xl text-sm font-medium bg-sage-400 text-white hover:bg-sage-600 disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Saving...' : 'Add Measurement'}
        </button>
      </div>
    </form>
  )
}
