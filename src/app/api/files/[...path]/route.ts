import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import path from 'path'
import fs from 'fs/promises'

const UPLOAD_DIR = process.env.UPLOAD_DIR || './data/uploads'

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
  // Check auth (allow debug key bypass)
  const session = await auth()
  const debugKey = req.headers.get('x-debug-key')
  const isDebug = process.env.ENABLE_DEBUG_PROFILE === 'true' && debugKey === process.env.DEBUG_KEY

  if (!session?.user && !isDebug) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { path: pathSegments } = await params
  const filePath = path.join(UPLOAD_DIR, ...pathSegments)

  // Path traversal protection
  const resolvedPath = path.resolve(filePath)
  const resolvedUploadDir = path.resolve(UPLOAD_DIR)
  if (!resolvedPath.startsWith(resolvedUploadDir)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const file = await fs.readFile(resolvedPath)
    const ext = path.extname(resolvedPath).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    return new NextResponse(file, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
