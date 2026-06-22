import Link from 'next/link'
import { BookOpen, Calendar, Star, PenSquare, TrendingUp } from 'lucide-react'
import { differenceInMonths, differenceInYears, startOfMonth, format } from 'date-fns'
import { requireAuth } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import { getAppSettings } from '@/lib/settings'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import WritingPrompt from '@/components/dashboard/WritingPrompt'

export default async function DashboardPage() {
  const session = await requireAuth()

  const isAdmin = session.user?.role === 'admin'
  const userId = session.user?.id

  // Admins see all entries; non-admins see only their own
  const entryVisibility = isAdmin
    ? { isDraft: false }
    : { authorId: userId }

  const [settings, totalEntries, monthlyEntries, recentEntries, latestMilestone, prompts] =
    await Promise.all([
      getAppSettings(),
      prisma.entry.count({ where: entryVisibility }),
      prisma.entry.count({
        where: { ...entryVisibility, createdAt: { gte: startOfMonth(new Date()) } },
      }),
      prisma.entry.findMany({
        where: entryVisibility,
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          entryDate: true,
          isDraft: true,
          content: false,
          author: { select: { id: true, name: true, avatarColor: true } },
          tags: { include: { tag: true } },
          media: { where: { type: 'image' }, take: 1, select: { path: true, type: true } },
        },
      }),
      prisma.milestone.findFirst({ orderBy: { date: 'desc' } }),
      prisma.writingPrompt.findMany({ where: { isActive: true }, take: 10 }),
    ])

  const appTitle = settings?.appTitle || 'Our Journal'
  const childName = settings?.childName || 'Baby'
  const birthDate = settings?.childBirthDate

  let ageText: string | null = null
  if (birthDate) {
    const months = differenceInMonths(new Date(), birthDate)
    if (months >= 24) {
      const years = differenceInYears(new Date(), birthDate)
      const remainingMonths = months - years * 12
      ageText = remainingMonths > 0
        ? `${years} year${years > 1 ? 's' : ''} and ${remainingMonths} month${remainingMonths > 1 ? 's' : ''} old`
        : `${years} year${years > 1 ? 's' : ''} old`
    } else if (months > 0) {
      ageText = `${months} month${months > 1 ? 's' : ''} old`
    } else {
      ageText = 'a newborn'
    }
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="font-accent text-4xl text-warm-800 mb-1">
          Welcome to {appTitle}
        </h1>
        {ageText && (
          <p className="text-lg text-warm-600">
            {childName} is {ageText}
          </p>
        )}
      </div>

      {/* Writing Prompt */}
      <WritingPrompt prompts={prompts.map((p) => p.text)} />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-warm-800">{totalEntries}</p>
              <p className="text-sm text-warm-600">Total Entries</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sage-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-sage-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-warm-800">{monthlyEntries}</p>
              <p className="text-sm text-warm-600">This Month</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-100 flex items-center justify-center">
              <Star className="w-5 h-5 text-accent-600" />
            </div>
            <div>
              <p className="text-sm text-warm-800 font-semibold truncate">
                {latestMilestone?.title || 'No milestones yet'}
              </p>
              <p className="text-sm text-warm-600">Latest Milestone</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Entries */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-warm-800">Recent Entries</h2>
          <Link href="/entries" className="text-sm text-accent-600 hover:text-accent-400 transition-colors">
            View all
          </Link>
        </div>
        {recentEntries.length === 0 ? (
          <Card className="text-center py-8">
            <p className="text-warm-600 mb-3">No entries yet. Start writing!</p>
            <Link href="/entries/new">
              <Button size="sm" className="gap-2">
                <PenSquare className="w-4 h-4" />
                New Entry
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {recentEntries.map((entry) => (
              <Link key={entry.id} href={`/entries/${entry.id}`}>
                <Card variant="interactive" className="flex items-center gap-4">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0"
                    style={{ backgroundColor: entry.author.avatarColor || '#F4A0A8' }}
                  >
                    {entry.author.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-warm-800 truncate">
                      {entry.title || 'Untitled Entry'}
                    </p>
                    <p className="text-sm text-warm-600">
                      {format(entry.entryDate, 'MMM d, yyyy')} by {entry.author.name}
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-warm-800 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/entries/new">
            <Button className="gap-2">
              <PenSquare className="w-4 h-4" />
              New Entry
            </Button>
          </Link>
          <Link href="/milestones">
            <Button variant="secondary" className="gap-2">
              <Star className="w-4 h-4" />
              Add Milestone
            </Button>
          </Link>
          <Link href="/growth">
            <Button variant="secondary" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Record Measurement
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
