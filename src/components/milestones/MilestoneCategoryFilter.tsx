'use client'

import { useState } from 'react'
import { MilestoneTimeline } from './MilestoneTimeline'
import { MilestoneForm } from './MilestoneForm'
import { cn } from '@/lib/utils'

interface Category {
  value: string
  label: string
  color: string
}

interface MilestoneData {
  id: string
  title: string
  description: string | null
  date: string
  category: string | null
  icon: string | null
  photoPath: string | null
  recordedBy: string
  createdAt: string
  updatedAt: string
  recorder: { id: string; name: string; avatarColor: string | null }
}

interface Props {
  categories: Category[]
  milestones: MilestoneData[]
  userId: string
  userRole: string
}

export function MilestoneCategoryFilter({ categories, milestones: initialMilestones, userId, userRole }: Props) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [milestones, setMilestones] = useState(initialMilestones)
  const [showForm, setShowForm] = useState(false)
  const [editingMilestone, setEditingMilestone] = useState<MilestoneData | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const filtered = activeCategory
    ? milestones.filter((m) => m.category === activeCategory)
    : milestones

  async function handleCreate(data: Record<string, unknown>) {
    setFormError(null)
    try {
      const res = await fetch('/api/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => null)
        setFormError(d?.error ?? 'Could not save milestone. Please try again.')
        return
      }
      const created = await res.json()
      setMilestones((prev) => [created, ...prev])
      setShowForm(false)
    } catch {
      setFormError('Network error, please try again.')
    }
  }

  async function handleUpdate(data: Record<string, unknown>) {
    if (!editingMilestone) return
    setFormError(null)
    try {
      const res = await fetch(`/api/milestones/${editingMilestone.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => null)
        setFormError(d?.error ?? 'Could not save milestone. Please try again.')
        return
      }
      const updated = await res.json()
      setMilestones((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
      setEditingMilestone(null)
    } catch {
      setFormError('Network error, please try again.')
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this milestone? This cannot be undone.')) return
    try {
      const res = await fetch(`/api/milestones/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        window.alert('Could not delete milestone. Please try again.')
        return
      }
      setMilestones((prev) => prev.filter((m) => m.id !== id))
    } catch {
      window.alert('Could not delete milestone. Please try again.')
    }
  }

  function handleEdit(milestone: MilestoneData) {
    setFormError(null)
    setEditingMilestone(milestone)
    setShowForm(false)
  }

  return (
    <div>
      {/* Category filter buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveCategory(null)}
          aria-pressed={activeCategory === null}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium transition-colors',
            activeCategory === null
              ? 'bg-warm-800 text-white'
              : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
          )}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(activeCategory === cat.value ? null : cat.value)}
            aria-pressed={activeCategory === cat.value}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-colors',
              activeCategory === cat.value
                ? 'text-white'
                : 'text-warm-600 hover:opacity-80'
            )}
            style={{
              backgroundColor: activeCategory === cat.value ? cat.color : undefined,
            }}
          >
            {cat.label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => { setFormError(null); setShowForm(true); setEditingMilestone(null) }}
          className="px-4 py-2 rounded-full text-sm font-medium bg-accent-400 text-white hover:bg-accent-600 transition-colors"
        >
          + Add Milestone
        </button>
      </div>

      {/* Form */}
      {(showForm || editingMilestone) && (
        <div className="mb-8">
          <MilestoneForm
            initialData={editingMilestone ? {
              title: editingMilestone.title,
              description: editingMilestone.description || '',
              date: editingMilestone.date.split('T')[0],
              category: editingMilestone.category || '',
              icon: editingMilestone.icon || '',
            } : undefined}
            onSubmit={editingMilestone ? handleUpdate : handleCreate}
            onCancel={() => { setShowForm(false); setEditingMilestone(null); setFormError(null) }}
            error={formError}
          />
        </div>
      )}

      {/* Timeline or empty state */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🌟</div>
          <h2 className="text-xl font-accent text-warm-800 mb-2">No milestones yet</h2>
          <p className="text-warm-600 mb-4">
            Start recording your little one&apos;s special moments!
          </p>
          {!showForm && (
            <button
              onClick={() => { setFormError(null); setShowForm(true) }}
              className="px-6 py-3 rounded-full bg-accent-400 text-white hover:bg-accent-600 transition-colors font-medium"
            >
              Record First Milestone
            </button>
          )}
        </div>
      ) : (
        <MilestoneTimeline
          milestones={filtered}
          userId={userId}
          userRole={userRole}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
