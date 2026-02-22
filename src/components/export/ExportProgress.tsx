'use client'

import { useState } from 'react'
import { type LucideIcon } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'

interface ExportProgressProps {
  type: 'zip' | 'pdf'
  title: string
  description: string
  icon: LucideIcon
}

export default function ExportProgress({
  type,
  title,
  description,
  icon: Icon,
}: ExportProgressProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleExport() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/export/${type}`, { method: 'POST' })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Export failed')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const filename =
        res.headers
          .get('Content-Disposition')
          ?.match(/filename="(.+)"/)?.[1] || `export.${type}`

      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-accent-50 rounded-xl">
          <Icon className="w-6 h-6 text-accent-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-warm-800">{title}</h3>
          <p className="text-sm text-warm-600 mt-1">{description}</p>
          <div className="mt-4">
            <Button onClick={handleExport} disabled={loading} size="sm">
              {loading ? (
                <span className="flex items-center gap-2">
                  <Spinner size="sm" className="text-white" />
                  Generating...
                </span>
              ) : (
                `Download ${type.toUpperCase()}`
              )}
            </Button>
          </div>
          {error && (
            <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg p-3">
              {error}
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}
