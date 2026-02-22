'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDebounce } from '@/hooks/useDebounce'
import { Search, ArrowUpDown, X } from 'lucide-react'
import type { Tag } from '@prisma/client'

export default function EntryFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [tags, setTags] = useState<Tag[]>([])
  const [selectedTagId, setSelectedTagId] = useState(searchParams.get('tagId') || '')
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest')

  const debouncedSearch = useDebounce(search, 300)

  useEffect(() => {
    fetch('/api/tags')
      .then((r) => r.json())
      .then(setTags)
      .catch(() => {})
  }, [])

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      }
      params.delete('page')
      router.push(`/entries?${params.toString()}`)
    },
    [router, searchParams]
  )

  useEffect(() => {
    updateParams({ search: debouncedSearch })
  }, [debouncedSearch, updateParams])

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <div className="relative flex-1 min-w-[200px]">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search entries..."
          className="w-full pl-9 pr-8 py-2 bg-white border border-warm-200 rounded-xl text-warm-800 text-sm placeholder:text-warm-400 focus:outline-none focus:ring-2 focus:ring-warm-200"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <select
        value={selectedTagId}
        onChange={(e) => {
          setSelectedTagId(e.target.value)
          updateParams({ tagId: e.target.value })
        }}
        className="px-3 py-2 bg-white border border-warm-200 rounded-xl text-warm-800 text-sm focus:outline-none focus:ring-2 focus:ring-warm-200"
      >
        <option value="">All tags</option>
        {tags.map((tag) => (
          <option key={tag.id} value={tag.id}>
            {tag.name}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => {
          const newSort = sort === 'newest' ? 'oldest' : 'newest'
          setSort(newSort)
          updateParams({ sort: newSort })
        }}
        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-warm-200 rounded-xl text-warm-800 text-sm hover:bg-warm-50 transition-colors"
      >
        <ArrowUpDown size={14} />
        <span>{sort === 'newest' ? 'Newest first' : 'Oldest first'}</span>
      </button>
    </div>
  )
}
