import { NextRequest, NextResponse } from 'next/server'
import { apiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'

export async function GET() {
  try {
    const session = await apiAuth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const settings = await prisma.appSettings.findFirst({
      where: { id: 'singleton' },
      select: { showerEnabled: true, showerCode: true },
    })

    return NextResponse.json(settings ?? { showerEnabled: false, showerCode: null })
  } catch (error) {
    console.error('Shower config GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 })
  }
}

const configSchema = z.object({
  enabled: z.boolean().optional(),
  regenerate: z.boolean().optional(),
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
    const parsed = configSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    const { enabled, regenerate } = parsed.data
    const data: Partial<{ showerEnabled: boolean; showerCode: string }> = {}

    if (typeof enabled === 'boolean') {
      data.showerEnabled = enabled
      if (enabled) {
        const current = await prisma.appSettings.findFirst({
          where: { id: 'singleton' },
          select: { showerCode: true },
        })
        if (!current?.showerCode) {
          data.showerCode = crypto.randomBytes(6).toString('hex')
        }
      }
    }

    if (regenerate) {
      data.showerCode = crypto.randomBytes(6).toString('hex')
    }

    const settings = await prisma.appSettings.upsert({
      where: { id: 'singleton' },
      update: data,
      create: { id: 'singleton', ...data },
      select: { showerEnabled: true, showerCode: true },
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Shower config PUT error:', error)
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 })
  }
}
