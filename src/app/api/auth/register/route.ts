import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rate-limit'

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  inviteCode: z.string().min(1),
})

export async function POST(req: NextRequest) {
  // Throttle the unauthenticated registration path (bcrypt cost-12 + email
  // enumeration). Best-effort per-IP limit from x-forwarded-for.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
  if (!checkRateLimit(`register:${ip}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { name, email, password, inviteCode } = parsed.data

  // Check if email already exists
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 400 })
  }

  // Create user with atomic invite code validation
  const passwordHash = await bcrypt.hash(password, 12)
  const colors = ['#F4A0A8', '#7BB4E8', '#B08CE0', '#8CB88C', '#D9C4A0']
  const avatarColor = colors[Math.floor(Math.random() * colors.length)]

  try {
    await prisma.$transaction(async (tx) => {
      // Validate invite code
      const invite = await tx.inviteCode.findUnique({ where: { code: inviteCode } })
      if (!invite) throw new Error('Invalid invite code')
      if (invite.expiresAt && invite.expiresAt < new Date()) throw new Error('Invite code expired')
      if (invite.useCount >= invite.maxUses) throw new Error('Invite code already used')

      // Atomic increment - prevents race condition
      const updated = await tx.inviteCode.updateMany({
        where: { id: invite.id, useCount: { lt: invite.maxUses } },
        data: {
          useCount: { increment: 1 },
          usedAt: new Date(),
          usedByEmail: email,
        },
      })
      if (updated.count === 0) throw new Error('Invite code already used')

      await tx.user.create({
        data: { name, email, passwordHash, avatarColor },
      })
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Registration failed'
    if (['Invalid invite code', 'Invite code expired', 'Invite code already used'].includes(msg)) {
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    throw err
  }

  return NextResponse.json({ success: true }, { status: 201 })
}
