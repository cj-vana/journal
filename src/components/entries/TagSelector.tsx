'use client'

import { useState, useEffect, useRef } from 'react'
import { X, ChevronDown } from 'lucide-react'
import type { Tag } from '@prisma/client'

interface TagSelectorProps {
  selectedTagIds: string[]
  onChange: (tagIds: string[]) => void
}

export default function TagSelector({ selectedTagIds, onChange }: TagSelectorProps) {
  const [tags, setTags] = useState<Tag[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    fetch('/api/tags')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load tags')
        return r.json()
      })
      .then((data) => {
        if (!active) return
        if (Array.isArray(data)) setTags(data)
      })
      .catch(() => {
        if (active) setLoadError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id))
  const availableTags = tags.filter((t) => !selectedTagIds.includes(t.id))

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId))
    } else {
      onChange([...selectedTagIds, tagId])
    }
  }

  return (
    <div className="relative" ref={ref}>
      <label className="block text-sm font-medium text-warm-600 mb-1">Tags</label>

      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium"
              style={{
                backgroundColor: tag.color ? `${tag.color}20` : '#F5ECDB',
                color: tag.color || '#6B5B3E',
              }}
            >
              {tag.icon && <span>{tag.icon}</span>}
              {tag.name}
              <button
                type="button"
                onClick={() => toggleTag(tag.id)}
                aria-label={`Remove tag ${tag.name}`}
                className="hover:opacity-70"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="w-full flex items-center justify-between px-3 py-2 bg-white border border-warm-200 rounded-xl text-sm text-warm-600 hover:bg-warm-50 transition-colors"
      >
        <span>{selectedTags.length > 0 ? 'Add more tags...' : 'Select tags...'}</span>
        <ChevronDown size={14} className={isOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-warm-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {availableTags.length === 0 ? (
            <div className="px-3 py-2 text-sm text-warm-600">
              {loading
                ? 'Loading tags...'
                : loadError
                ? "Couldn't load tags"
                : tags.length === 0
                ? 'No tags available'
                : 'All tags selected'}
            </div>
          ) : (
            availableTags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className="w-full text-left px-3 py-2 text-sm text-warm-800 hover:bg-warm-50 transition-colors flex items-center gap-2"
              >
                {tag.color && (
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                )}
                {tag.icon && <span>{tag.icon}</span>}
                <span>{tag.name}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
