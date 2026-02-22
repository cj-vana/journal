import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

export async function GET() {
  try {
    const userCount = await prisma.user.count()
    return NextResponse.json({ needsSetup: userCount === 0 })
  } catch (error) {
    console.error('Setup status error:', error)
    return NextResponse.json({ error: 'Failed to check setup status' }, { status: 500 })
  }
}

const setupSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  childName: z.string().min(1).max(100).optional(),
  appTitle: z.string().min(1).max(100).optional(),
  childBirthDate: z.string().nullable().optional(),
  gender: z.enum(['girl', 'boy', 'neutral']).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = setupSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid data' },
        { status: 400 }
      )
    }

    const { name, email, password, childName, appTitle, childBirthDate, gender } = parsed.data
    const passwordHash = await bcrypt.hash(password, 12)

    // Use interactive transaction to atomically check user count AND create admin
    // This prevents TOCTOU race conditions where two requests could both pass the check
    await prisma.$transaction(async (tx) => {
      const userCount = await tx.user.count()
      if (userCount > 0) {
        throw new Error('SETUP_ALREADY_COMPLETE')
      }

      await tx.user.create({
        data: {
          email,
          name,
          passwordHash,
          role: 'admin',
          avatarColor: '#F4A0A8',
        },
      })

      await tx.appSettings.upsert({
        where: { id: 'singleton' },
        update: {
          ...(childName && { childName }),
          ...(appTitle && { appTitle }),
          ...(gender && { gender }),
          ...(childBirthDate !== undefined && {
            childBirthDate: childBirthDate ? new Date(childBirthDate) : null,
          }),
        },
        create: {
          id: 'singleton',
          childName: childName || 'Baby',
          appTitle: appTitle || 'Our Journal',
          gender: gender || 'neutral',
          ...(childBirthDate && {
            childBirthDate: new Date(childBirthDate),
          }),
        },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'SETUP_ALREADY_COMPLETE') {
      return NextResponse.json(
        { error: 'Setup already completed' },
        { status: 403 }
      )
    }
    console.error('Setup error:', error)
    return NextResponse.json(
      { error: 'Setup failed' },
      { status: 500 }
    )
  }
}
