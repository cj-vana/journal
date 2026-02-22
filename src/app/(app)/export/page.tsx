import { requireAdmin } from '@/lib/auth-utils'
import { Download, BookOpen } from 'lucide-react'
import ExportProgress from '@/components/export/ExportProgress'

export default async function ExportPage() {
  await requireAdmin()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-accent text-warm-800">
          Export Your Journal
        </h1>
        <p className="text-warm-600 mt-1">
          Back up your data or generate a beautiful printed book
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <ExportProgress
          type="zip"
          title="Download Data (ZIP)"
          description="Export all entries, milestones, growth records, and media files as a ZIP archive. Perfect for backups or migrating your data."
          icon={Download}
        />
        <ExportProgress
          type="pdf"
          title="Generate Book (PDF)"
          description="Create a beautifully formatted scrapbook-style PDF with all your entries, photos, and milestones. Ready for printing or sharing."
          icon={BookOpen}
        />
      </div>
    </div>
  )
}
