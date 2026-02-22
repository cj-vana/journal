import { requireAuth } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { MilestoneCategoryFilter } from '@/components/milestones/MilestoneCategoryFilter'
import { MILESTONE_CATEGORIES } from '@/lib/constants'

export default async function MilestonesPage() {
  const session = await requireAuth()

  const milestones = await prisma.milestone.findMany({
    orderBy: { date: 'desc' },
    include: {
      recorder: {
        select: { id: true, name: true, avatarColor: true },
      },
    },
  })

  const serialized = milestones.map((m) => ({
    ...m,
    date: m.date.toISOString(),
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-accent text-warm-800">Milestones</h1>
          <p className="text-warm-600 mt-1">Track special moments and achievements</p>
        </div>
      </div>

      <MilestoneCategoryFilter
        categories={MILESTONE_CATEGORIES as unknown as Array<{ value: string; label: string; color: string }>}
        milestones={serialized}
        userId={session.user!.id!}
        userRole={session.user.role}
      />
    </div>
  )
}
