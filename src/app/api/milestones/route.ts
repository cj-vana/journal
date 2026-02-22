import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  date: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  category: z.string().max(50).optional(),
  icon: z.string().max(10).optional(),
  photoPath: z.string().max(500).optional(),
})

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')

    const milestones = await prisma.milestone.findMany({
      where: category ? { category } : undefined,
      orderBy: { date: 'desc' },
      include: {
        recorder: {
          select: { id: true, name: true, avatarColor: true },
        },
      },
    })

    return NextResponse.json(milestones)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch milestones' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
    }

    const { title, description, date, category, icon, photoPath } = parsed.data

    const milestone = await prisma.milestone.create({
      data: {
        title,
        description,
        date: new Date(date),
        category,
        icon,
        photoPath,
        recordedBy: session.user.id!,
      },
      include: {
        recorder: {
          select: { id: true, name: true, avatarColor: true },
        },
      },
    })

    return NextResponse.json(milestone, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create milestone' }, { status: 500 })
  }
}
