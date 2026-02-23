'use client'

import { MilestoneCard } from './MilestoneCard'
import { format, parseISO } from 'date-fns'

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
  milestones: MilestoneData[]
  userId: string
  userRole: string
  onEdit: (milestone: MilestoneData) => void
  onDelete: (id: string) => void
}

const CATEGORY_COLORS: Record<string, string> = {
  physical: '#8CB88C',
  language: '#7BB4E8',
  social: '#F4A0A8',
  cognitive: '#B08CE0',
}

export function MilestoneTimeline({ milestones, userId, userRole, onEdit, onDelete }: Props) {
  return (
    <div className="relative">
      {/* Vertical timeline line */}
      <div className="absolute left-4 md:left-1/2 md:-translate-x-px top-0 bottom-0 w-0.5 bg-warm-200" aria-hidden="true" />

      <div className="space-y-8">
        {milestones.map((milestone, index) => {
          const isLeft = index % 2 === 0
          const color = CATEGORY_COLORS[milestone.category || ''] || '#D9C4A0'
          const canModify = milestone.recordedBy === userId || userRole === 'admin'

          return (
            <div
              key={milestone.id}
              className="relative flex items-start"
            >
              {/* Date marker dot */}
              <div
                className="absolute left-4 md:left-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-white z-10 mt-6"
                style={{ backgroundColor: color }}
              />

              {/* Desktop: alternating layout */}
              <div className={`
                hidden md:flex w-full items-start
                ${isLeft ? 'flex-row' : 'flex-row-reverse'}
              `}>
                <div className="w-1/2 px-8">
                  <MilestoneCard
                    milestone={milestone}
                    color={color}
                    canModify={canModify}
                    onEdit={() => onEdit(milestone)}
                    onDelete={() => onDelete(milestone.id)}
                  />
                </div>
                <div className="w-1/2 px-8 pt-6">
                  <p className={`text-sm text-warm-600 ${isLeft ? 'text-left' : 'text-right'}`}>
                    {format(parseISO(milestone.date), 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>

              {/* Mobile: single column */}
              <div className="md:hidden ml-10 flex-1">
                <p className="text-xs text-warm-600 mb-1">
                  {format(parseISO(milestone.date), 'MMMM d, yyyy')}
                </p>
                <MilestoneCard
                  milestone={milestone}
                  color={color}
                  canModify={canModify}
                  onEdit={() => onEdit(milestone)}
                  onDelete={() => onDelete(milestone.id)}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
