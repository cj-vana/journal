import { NextRequest, NextResponse } from 'next/server'
import { apiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { parseDateInput } from '@/lib/dates'

export async function GET() {
  try {
    const session = await apiAuth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Atomic upsert avoids a P2002 race when two concurrent first-loads both
    // try to create the singleton on a fresh database.
    const settings = await prisma.appSettings.upsert({
      where: { id: 'singleton' },
      update: {},
      create: { id: 'singleton' },
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

const updateSettingsSchema = z.object({
  childName: z.string().trim().min(1).max(100).optional(),
  appTitle: z.string().trim().min(1).max(120).optional(),
  childBirthDate: z.string().nullable().optional(),
  gender: z.enum(['girl', 'boy', 'neutral']).optional(),
})

export async function PUT(req: NextRequest) {
  try {
    const session = await apiAuth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = updateSettingsSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    const data: Record<string, unknown> = {}
    if (parsed.data.childName !== undefined) data.childName = parsed.data.childName
    if (parsed.data.appTitle !== undefined) data.appTitle = parsed.data.appTitle
    if (parsed.data.childBirthDate !== undefined) {
      if (parsed.data.childBirthDate) {
        const parsedBirthDate = parseDateInput(parsed.data.childBirthDate)
        if (!parsedBirthDate) return NextResponse.json({ error: 'Invalid childBirthDate' }, { status: 400 })
        data.childBirthDate = parsedBirthDate
      } else {
        data.childBirthDate = null
      }
    }
    if (parsed.data.gender !== undefined) data.gender = parsed.data.gender

    const settings = await prisma.appSettings.upsert({
      where: { id: 'singleton' },
      update: data,
      create: { id: 'singleton', ...data },
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Settings PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
