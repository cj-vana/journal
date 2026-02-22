'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface PromptData {
  id: string
  text: string
  category: string | null
}

export function WritingPrompt() {
  const [prompt, setPrompt] = useState<PromptData | null>(null)
  const [loading, setLoading] = useState(true)
  const [skipCount, setSkipCount] = useState(0)
  const router = useRouter()

  useEffect(() => {
    fetchPrompt(skipCount)
  }, [skipCount])

  async function fetchPrompt(skip: number) {
    setLoading(true)
    try {
      const res = await fetch(`/api/prompts?skip=${skip}`)
      if (res.ok) {
        const data = await res.json()
        setPrompt(data)
      }
    } finally {
      setLoading(false)
    }
  }

  function handleUsePrompt() {
    if (prompt) {
      router.push(`/entries/new?prompt=${encodeURIComponent(prompt.text)}`)
    }
  }

  function handleNextPrompt() {
    setSkipCount((prev) => prev + 1)
  }

  if (loading && !prompt) {
    return (
      <div className="bg-warm-50 border border-warm-200 rounded-2xl p-6 animate-pulse">
        <div className="h-4 bg-warm-200 rounded w-24 mb-4" />
        <div className="h-6 bg-warm-200 rounded w-3/4 mb-2" />
        <div className="h-6 bg-warm-200 rounded w-1/2" />
      </div>
    )
  }

  if (!prompt) return null

  return (
    <div className="bg-warm-50 border border-warm-200 rounded-2xl p-6 relative overflow-hidden">
      {/* Decorative quote marks */}
      <div className="absolute top-2 left-4 text-7xl text-warm-200 font-accent leading-none select-none" aria-hidden="true">
        &ldquo;
      </div>
      <div className="absolute bottom-0 right-4 text-7xl text-warm-200 font-accent leading-none select-none" aria-hidden="true">
        &rdquo;
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm font-medium text-warm-600">Today&apos;s Writing Prompt</span>
          {prompt.category && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-warm-200 text-warm-600">
              {prompt.category}
            </span>
          )}
        </div>

        {/* Prompt text */}
        <p className="font-accent text-2xl text-warm-800 leading-relaxed mb-6 pl-6">
          {prompt.text}
        </p>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleUsePrompt}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-rose-400 text-white hover:bg-rose-600 transition-colors"
          >
            Use this prompt
          </button>
          <button
            onClick={handleNextPrompt}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-sm text-warm-600 hover:bg-warm-200 transition-colors"
          >
            Next prompt
          </button>
        </div>
      </div>
    </div>
  )
}
