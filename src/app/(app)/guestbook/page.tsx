import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import GuestbookList from '@/components/guestbook/GuestbookList'
import Link from 'next/link'
import { Settings } from 'lucide-react'

export default async function GuestbookPage() {
  await requireAdmin()

  const [messages, activeCount] = await Promise.all([
    prisma.guestMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: { event: { select: { id: true, title: true, type: true } } },
    }),
    prisma.event.count({ where: { enabled: true } }),
  ])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-accent text-warm-800">Guestbook</h1>
          <p className="text-warm-600 mt-1">
            {messages.length} message{messages.length !== 1 ? 's' : ''} from guests
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeCount === 0 && (
            <span className="text-sm text-warm-500 bg-warm-100 px-3 py-1 rounded-full">No active guestbooks</span>
          )}
          <Link
            href="/settings"
            className="flex items-center gap-2 text-sm text-warm-600 hover:text-warm-800 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Configure
          </Link>
        </div>
      </div>

      <GuestbookList
        messages={messages.map((m) => ({
          id: m.id,
          guestName: m.guestName,
          message: m.message,
          promotedToEntryId: m.promotedToEntryId,
          createdAt: m.createdAt.toISOString(),
          eventTitle: m.event?.title ?? null,
        }))}
      />
    </div>
  )
}
