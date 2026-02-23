import { requireAuth } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { GrowthPageClient } from '@/components/growth/GrowthPageClient'

export default async function GrowthPage() {
  const session = await requireAuth()

  const records = await prisma.growthRecord.findMany({
    orderBy: { date: 'asc' },
    include: {
      recorder: {
        select: { id: true, name: true, avatarColor: true },
      },
    },
  })

  const serialized = records.map((r) => ({
    ...r,
    date: r.date.toISOString(),
    createdAt: r.createdAt.toISOString(),
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-accent text-warm-800">Growth Tracker</h1>
          <p className="text-warm-600 mt-1">Track height, weight, and head circumference over time</p>
        </div>
      </div>

      <GrowthPageClient
        initialRecords={serialized}
        userId={session.user!.id!}
        userRole={session.user.role}
      />
    </div>
  )
}
