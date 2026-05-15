import { NextRequest, NextResponse } from 'next/server'
import { apiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { contentToHtml } from '@/lib/tiptap-html-extensions'
import { parseDateInput, parseDateOnlyEnd } from '@/lib/dates'
import type { Prisma } from '@prisma/client'

const createEntrySchema = z.object({
  title: z.string().optional(),
  content: z.string(),
  entryDate: z.string(),
  tagIds: z.array(z.string()).optional(),
  mediaIds: z.array(z.string()).optional(),
  isDraft: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const session = await apiAuth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = Math.max(parseInt(searchParams.get('page') || '1') || 1, 1)
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20') || 20, 1), 100)
    const authorId = searchParams.get('authorId')
    const tagId = searchParams.get('tagId')
    const searchParam = searchParams.get('search')
    const search = searchParam?.slice(0, 200)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const sort = searchParams.get('sort') || 'newest'
    const drafts = searchParams.get('drafts')

    const where: Prisma.EntryWhereInput = {}

    if (authorId && session.user.role === 'admin') where.authorId = authorId
    if (drafts === 'true') {
      where.isDraft = true
    } else if (drafts === 'false') {
      where.isDraft = false
    }
    if (tagId) {
      where.tags = { some: { tagId } }
    }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ]
    }
    if (startDate || endDate) {
      const dateFilter: Prisma.DateTimeFilter = {}
      if (startDate) {
        const parsedStart = parseDateInput(startDate)
        if (!parsedStart) return NextResponse.json({ error: 'Invalid startDate' }, { status: 400 })
        dateFilter.gte = parsedStart
      }
      if (endDate) {
        const parsedEnd = parseDateOnlyEnd(endDate)
        if (!parsedEnd) return NextResponse.json({ error: 'Invalid endDate' }, { status: 400 })
        dateFilter.lte = parsedEnd
      }
      where.entryDate = dateFilter
    }

    // Non-admin users can only see their own entries
    if (session.user.role !== 'admin') {
      where.authorId = session.user.id
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
            select: { id: true, path: true, type: true },
          },
        },
        orderBy: { entryDate: sort === 'oldest' ? 'asc' : 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.entry.count({ where }),
    ])

    return NextResponse.json({
      entries,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Entries GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await apiAuth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = createEntrySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    const { title, content, entryDate, tagIds, mediaIds, isDraft } = parsed.data
    const parsedEntryDate = parseDateInput(entryDate)
    if (!parsedEntryDate) {
      return NextResponse.json({ error: 'Invalid entryDate' }, { status: 400 })
    }

    // Generate HTML from Tiptap JSON
    const contentHtml = contentToHtml(content)

    const fullEntry = await prisma.$transaction(async (tx) => {
      const entry = await tx.entry.create({
        data: {
          title: title || null,
          content,
          contentHtml,
          authorId: session.user.id!,
          entryDate: parsedEntryDate,
          isDraft: isDraft ?? false,
        },
      })

      // Link media (only unlinked media uploaded by this user)
      if (mediaIds && mediaIds.length > 0) {
        await tx.media.updateMany({
          where: {
            id: { in: mediaIds },
            entryId: null,
            OR: [
              { uploadedBy: session.user.id! },
              { uploadedBy: null },
            ],
          },
          data: { entryId: entry.id },
        })
      }

      // Create tag associations
      if (tagIds && tagIds.length > 0) {
        await tx.entryTag.createMany({
          data: tagIds.map((tagId) => ({
            entryId: entry.id,
            tagId,
          })),
        })
      }

      // Re-fetch to include linked media and tags
      return tx.entry.findUnique({
        where: { id: entry.id },
        include: {
          author: { select: { id: true, name: true, avatarColor: true } },
          tags: { include: { tag: true } },
          media: true,
        },
      })
    })

    return NextResponse.json(fullEntry, { status: 201 })
  } catch (error) {
    console.error('Entry create error:', error)
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 })
  }
}
