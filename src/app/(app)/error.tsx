'use client'

import { useEffect } from 'react'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
      <h2 className="text-2xl font-accent text-warm-800 mb-2">Something went wrong</h2>
      <p className="text-warm-600 mb-6 text-center max-w-md">
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={reset}
        className="px-6 py-2.5 bg-accent-400 text-white rounded-xl hover:bg-accent-600 transition-colors font-medium"
      >
        Try Again
      </button>
    </div>
  )
}
