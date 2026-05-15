import { NextRequest, NextResponse } from 'next/server'
import { apiAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import path from 'path'
import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import { Readable } from 'stream'

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(/*turbopackIgnore: true*/ process.cwd(), 'data', 'uploads')

const MIME_TYPES: Record<string, string> = {
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.webm': 'audio/webm',
  '.ogg': 'audio/ogg',
  '.mp4': 'audio/mp4',
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const session = await apiAuth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { path: pathSegments } = await params
  const requestedPath = pathSegments.join('/')
  const mediaPath = requestedPath.replace(/_thumb(?=\.[^.]+$)/, '')
  const resolvedPath = path.resolve(UPLOAD_DIR, ...pathSegments)

  // Path traversal protection
  if (!resolvedPath.startsWith(UPLOAD_DIR + path.sep) && resolvedPath !== UPLOAD_DIR) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const media = await prisma.media.findFirst({
      where: { path: mediaPath },
      include: { entry: { select: { authorId: true } } },
    })

    if (!media) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const canRead = session.user.role === 'admin'
      || media.entry?.authorId === session.user.id
      || (!media.entryId && media.uploadedBy === session.user.id)

    if (!canRead) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const stats = await stat(resolvedPath)
    const ext = path.extname(resolvedPath).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    const stream = Readable.toWeb(createReadStream(resolvedPath)) as ReadableStream<Uint8Array>

    return new NextResponse(stream, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': stats.size.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
