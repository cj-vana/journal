import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  inviteCode: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { name, email, password, inviteCode } = parsed.data

  // Validate invite code
  const invite = await prisma.inviteCode.findUnique({ where: { code: inviteCode } })
  if (!invite) {
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 400 })
  }
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Invite code expired' }, { status: 400 })
  }
  if (invite.useCount >= invite.maxUses) {
    return NextResponse.json({ error: 'Invite code already used' }, { status: 400 })
  }

  // Check if email already exists
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 400 })
  }

  // Create user
  const passwordHash = await bcrypt.hash(password, 12)
  const colors = ['#F4A0A8', '#7BB4E8', '#B08CE0', '#8CB88C', '#D9C4A0']
  const avatarColor = colors[Math.floor(Math.random() * colors.length)]

  await prisma.user.create({
    data: { name, email, passwordHash, avatarColor },
  })

  // Update invite code usage
  await prisma.inviteCode.update({
    where: { id: invite.id },
    data: {
      useCount: { increment: 1 },
      usedAt: new Date(),
      usedByEmail: email,
    },
  })

  return NextResponse.json({ success: true }, { status: 201 })
}
