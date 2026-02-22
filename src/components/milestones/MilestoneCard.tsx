'use client'

import { format, parseISO } from 'date-fns'

interface MilestoneData {
  id: string
  title: string
  description: string | null
  date: string
  category: string | null
  icon: string | null
  recorder: { id: string; name: string; avatarColor: string | null }
}

interface Props {
  milestone: MilestoneData
  color: string
  canModify: boolean
  onEdit: () => void
  onDelete: () => void
}

const CATEGORY_LABELS: Record<string, string> = {
  physical: 'Physical',
  language: 'Language',
  social: 'Social',
  cognitive: 'Cognitive',
}

export function MilestoneCard({ milestone, color, canModify, onEdit, onDelete }: Props) {
  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-warm-200 p-4 group hover:shadow-md transition-shadow"
      style={{ borderLeftWidth: '4px', borderLeftColor: color }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="text-2xl flex-shrink-0">
          {milestone.icon || '⭐'}
        </div>

        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3 className="font-semibold text-warm-800 text-base">
            {milestone.title}
          </h3>

          {/* Description */}
          {milestone.description && (
            <p className="text-warm-600 text-sm mt-1 line-clamp-3">
              {milestone.description}
            </p>
          )}

          {/* Bottom row: category badge + recorder */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {milestone.category && (
              <span
                className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: color }}
              >
                {CATEGORY_LABELS[milestone.category] || milestone.category}
              </span>
            )}
            <span className="text-xs text-warm-400">
              by {milestone.recorder.name}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        {canModify && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg hover:bg-warm-100 text-warm-400 hover:text-warm-600 transition-colors"
              title="Edit"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg hover:bg-rose-50 text-warm-400 hover:text-rose-600 transition-colors"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
