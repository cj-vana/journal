import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let settings = await prisma.appSettings.findFirst({
      where: { id: 'singleton' },
    })

    if (!settings) {
      settings = await prisma.appSettings.create({
        data: { id: 'singleton' },
      })
    }

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
  childName: z.string().min(1).optional(),
  appTitle: z.string().min(1).optional(),
  childBirthDate: z.string().nullable().optional(),
})

export async function PUT(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if ((session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = updateSettingsSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid data', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const data: Record<string, unknown> = {}
    if (parsed.data.childName !== undefined) data.childName = parsed.data.childName
    if (parsed.data.appTitle !== undefined) data.appTitle = parsed.data.appTitle
    if (parsed.data.childBirthDate !== undefined) {
      data.childBirthDate = parsed.data.childBirthDate
        ? new Date(parsed.data.childBirthDate)
        : null
    }

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
