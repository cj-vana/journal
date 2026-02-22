import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_SIZE } from '@/lib/constants'
import sharp from 'sharp'
import path from 'path'
import fs from 'fs/promises'

const UPLOAD_DIR = process.env.UPLOAD_DIR || './data/uploads'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Generate unique filename
    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 21)
    const now = new Date()
    const year = now.getFullYear().toString()
    const month = (now.getMonth() + 1).toString().padStart(2, '0')

    const dir = path.join(UPLOAD_DIR, 'images', year, month)
    await fs.mkdir(dir, { recursive: true })

    // Process with Sharp
    const mainPath = path.join(dir, `${id}.webp`)
    await sharp(buffer)
      .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(mainPath)

    const thumbPath = path.join(dir, `${id}_thumb.webp`)
    await sharp(buffer)
      .resize(400, 400, { fit: 'cover' })
      .webp({ quality: 80 })
      .toFile(thumbPath)

    const stats = await fs.stat(mainPath)

    const media = await prisma.media.create({
      data: {
        type: 'image',
        filename: `${id}.webp`,
        path: `images/${year}/${month}/${id}.webp`,
        mimeType: 'image/webp',
        size: stats.size,
      },
    })

    const url = `/api/files/images/${year}/${month}/${id}.webp`
    const thumbnailUrl = `/api/files/images/${year}/${month}/${id}_thumb.webp`

    return NextResponse.json({
      id: media.id,
      url,
      thumbnailUrl,
    })
  } catch (error) {
    console.error('Image upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
