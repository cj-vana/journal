import { requireAuth } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export default async function DashboardPage() {
  const session = await requireAuth()
  const settings = await prisma.appSettings.findFirst({ where: { id: 'singleton' } })

  return (
    <div>
      <h1 className="text-4xl font-accent text-warm-800 mb-2">
        Welcome to {settings?.appTitle || 'Our Journal'}
      </h1>
      <p className="text-warm-600">Dashboard content coming soon...</p>
    </div>
  )
}
