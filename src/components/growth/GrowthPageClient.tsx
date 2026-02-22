'use client'

import { useState } from 'react'
import { GrowthChart } from './GrowthChart'
import { GrowthForm } from './GrowthForm'
import { format, parseISO } from 'date-fns'

interface GrowthRecordData {
  id: string
  date: string
  heightCm: number | null
  weightKg: number | null
  headCm: number | null
  notes: string | null
  recordedBy: string
  createdAt: string
  recorder: { id: string; name: string; avatarColor: string | null }
}

interface Props {
  initialRecords: GrowthRecordData[]
  userId: string
  userRole: string
}

export function GrowthPageClient({ initialRecords, userId, userRole }: Props) {
  const [records, setRecords] = useState(initialRecords)
  const [showForm, setShowForm] = useState(false)

  const heightData = records
    .filter((r) => r.heightCm !== null)
    .map((r) => ({ date: r.date, value: r.heightCm as number }))

  const weightData = records
    .filter((r) => r.weightKg !== null)
    .map((r) => ({ date: r.date, value: r.weightKg as number }))

  const headData = records
    .filter((r) => r.headCm !== null)
    .map((r) => ({ date: r.date, value: r.headCm as number }))

  async function handleCreate(data: Record<string, unknown>) {
    const res = await fetch('/api/growth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const created = await res.json()
      setRecords((prev) => [...prev, created].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      ))
      setShowForm(false)
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/growth/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setRecords((prev) => prev.filter((r) => r.id !== id))
    }
  }

  if (records.length === 0 && !showForm) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">📏</div>
        <h2 className="text-xl font-accent text-warm-800 mb-2">No growth records yet</h2>
        <p className="text-warm-600 mb-4">
          Start tracking your little one&apos;s growth!
        </p>
        <button
          onClick={() => setShowForm(true)}
          className="px-6 py-3 rounded-full bg-sage-400 text-white hover:bg-sage-600 transition-colors font-medium"
        >
          Add First Measurement
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Add button */}
      <div className="flex justify-end mb-6">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-full text-sm font-medium bg-sage-400 text-white hover:bg-sage-600 transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add Measurement'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-8">
          <GrowthForm
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Charts */}
      {records.length > 0 && (
        <div className="space-y-8 mb-8">
          {heightData.length > 0 && (
            <GrowthChart
              data={heightData}
              dataKey="height"
              label="Height"
              color="#8CB88C"
              unit="cm"
            />
          )}
          {weightData.length > 0 && (
            <GrowthChart
              data={weightData}
              dataKey="weight"
              label="Weight"
              color="#7BB4E8"
              unit="kg"
            />
          )}
          {headData.length > 0 && (
            <GrowthChart
              data={headData}
              dataKey="head"
              label="Head Circumference"
              color="#B08CE0"
              unit="cm"
            />
          )}
        </div>
      )}

      {/* Data table */}
      {records.length > 0 && (
        <div className="bg-white rounded-2xl border border-warm-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-warm-100">
            <h3 className="font-accent text-lg text-warm-800">All Measurements</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-warm-50 text-warm-600">
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-right font-medium">Height (cm)</th>
                  <th className="px-4 py-3 text-right font-medium">Weight (kg)</th>
                  <th className="px-4 py-3 text-right font-medium">Head (cm)</th>
                  <th className="px-4 py-3 text-left font-medium">Notes</th>
                  <th className="px-4 py-3 text-left font-medium">By</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {records.map((record) => {
                  const canDelete = record.recordedBy === userId || userRole === 'admin'
                  return (
                    <tr key={record.id} className="border-t border-warm-100 hover:bg-warm-50">
                      <td className="px-4 py-3 text-warm-800">
                        {format(parseISO(record.date), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-3 text-right text-warm-800">
                        {record.heightCm !== null ? record.heightCm.toFixed(1) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-warm-800">
                        {record.weightKg !== null ? record.weightKg.toFixed(2) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-warm-800">
                        {record.headCm !== null ? record.headCm.toFixed(1) : '-'}
                      </td>
                      <td className="px-4 py-3 text-warm-600 max-w-[200px] truncate">
                        {record.notes || '-'}
                      </td>
                      <td className="px-4 py-3 text-warm-600">
                        {record.recorder.name}
                      </td>
                      <td className="px-4 py-3">
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(record.id)}
                            className="text-warm-400 hover:text-rose-600 transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
