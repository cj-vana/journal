import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'
import EntryCard from '@/components/entries/EntryCard'
import EntryFilters from '@/components/entries/EntryFilters'
import Link from 'next/link'
import { Plus, BookOpen } from 'lucide-react'
import type { Prisma } from '@prisma/client'
import type { EntryWithRelations } from '@/types'
import { Suspense } from 'react'

interface EntriesPageProps {
  searchParams: Promise<{
    page?: string
    search?: string
    tagId?: string
    sort?: string
    drafts?: string
  }>
}

export default async function EntriesPage({ searchParams }: EntriesPageProps) {
  const session = await requireAuth()

  const params = await searchParams
  const page = parseInt(params.page || '1')
  const limit = 20
  const search = params.search || ''
  const tagId = params.tagId || ''
  const sort = params.sort || 'newest'
  const drafts = params.drafts

  const where: Prisma.EntryWhereInput = {}
  const andConditions: Prisma.EntryWhereInput[] = []

  if (drafts === 'true') {
    where.isDraft = true
  } else if (drafts !== 'all') {
    where.isDraft = false
  }

  if (tagId) {
    where.tags = { some: { tagId } }
  }

  if (search) {
    andConditions.push({
      OR: [
        { title: { contains: search } },
        { content: { contains: search } },
      ],
    })
  }

  // Non-admins only ever see their own entries (published or draft)
  if (session.user.role !== 'admin') {
    where.authorId = session.user.id
  }

  if (andConditions.length > 0) {
    where.AND = andConditions
  }

  const [entries, total] = await Promise.all([
    prisma.entry.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, avatarColor: true } },
        tags: { include: { tag: true } },
        media: {
          where: { type: 'image' },
          take: 1,
        },
      },
      orderBy: { entryDate: sort === 'oldest' ? 'asc' : 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.entry.count({ where }),
  ])

  const totalPages = Math.ceil(total / limit)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-accent text-warm-800">Journal Entries</h1>
        <Link
          href="/entries/new"
          className="flex items-center gap-2 px-4 py-2 bg-accent-400 text-white rounded-xl hover:bg-accent-600 transition-colors font-medium text-sm"
        >
          <Plus size={18} />
          <span>New Entry</span>
        </Link>
      </div>

      <Suspense fallback={null}>
        <EntryFilters />
      </Suspense>

      {entries.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen size={48} className="mx-auto text-warm-600 mb-4" />
          <h2 className="text-xl font-accent text-warm-600 mb-2">No entries yet</h2>
          <p className="text-warm-600 mb-6">Start capturing your precious memories.</p>
          <Link
            href="/entries/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent-400 text-white rounded-xl hover:bg-accent-600 transition-colors font-medium text-sm"
          >
            <Plus size={18} />
            <span>Write your first entry</span>
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(entries as EntryWithRelations[]).map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {(() => {
                const baseParams = new URLSearchParams()
                if (search) baseParams.set('search', search)
                if (tagId) baseParams.set('tagId', tagId)
                if (sort && sort !== 'newest') baseParams.set('sort', sort)
                if (drafts) baseParams.set('drafts', drafts)
                return (
                  <>
                    {page > 1 && (
                      <Link
                        href={`/entries?${new URLSearchParams([...baseParams, ['page', String(page - 1)]]).toString()}`}
                        className="px-4 py-2 bg-white border border-warm-200 rounded-xl text-sm text-warm-600 hover:bg-warm-50 transition-colors"
                      >
                        Previous
                      </Link>
                    )}
                    <span className="px-4 py-2 text-sm text-warm-600">
                      Page {page} of {totalPages}
                    </span>
                    {page < totalPages && (
                      <Link
                        href={`/entries?${new URLSearchParams([...baseParams, ['page', String(page + 1)]]).toString()}`}
                        className="px-4 py-2 bg-white border border-warm-200 rounded-xl text-sm text-warm-600 hover:bg-warm-50 transition-colors"
                      >
                        Next
                      </Link>
                    )}
                  </>
                )
              })()}
            </div>
          )}
        </>
      )}
    </div>
  )
}
