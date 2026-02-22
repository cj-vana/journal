import { requireAuth } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth()
  const settings = await prisma.appSettings.findFirst({ where: { id: 'singleton' } })

  return (
    <div className="min-h-screen bg-cream-50">
      {process.env.ENABLE_DEBUG_PROFILE === 'true' && (
        <div className="bg-red-600 text-white text-center py-1 text-sm font-medium">
          DEBUG MODE ACTIVE - Not for production use
        </div>
      )}
      <div className="flex">
        {/* Sidebar will be added by ui-shell teammate */}
        <main className="flex-1 min-h-screen">
          <div className="max-w-5xl mx-auto px-4 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
