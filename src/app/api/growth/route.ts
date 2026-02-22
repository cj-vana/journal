import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  date: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  heightCm: z.number().positive().max(200).optional(),
  weightKg: z.number().positive().max(100).optional(),
  headCm: z.number().positive().max(100).optional(),
  notes: z.string().max(1000).optional(),
}).refine(
  (data) => data.heightCm !== undefined || data.weightKg !== undefined || data.headCm !== undefined,
  { message: 'At least one measurement (height, weight, or head circumference) is required' }
)

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const records = await prisma.growthRecord.findMany({
      orderBy: { date: 'asc' },
      include: {
        recorder: {
          select: { id: true, name: true, avatarColor: true },
        },
      },
    })

    return NextResponse.json(records)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch growth records' }, { status: 500 })
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

    const { date, heightCm, weightKg, headCm, notes } = parsed.data

    const record = await prisma.growthRecord.create({
      data: {
        date: new Date(date),
        heightCm,
        weightKg,
        headCm,
        notes,
        recordedBy: session.user.id!,
      },
      include: {
        recorder: {
          select: { id: true, name: true, avatarColor: true },
        },
      },
    })

    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create growth record' }, { status: 500 })
  }
}
