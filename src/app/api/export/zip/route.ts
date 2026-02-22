import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { generateZipExport } from '@/lib/export'
import { format } from 'date-fns'

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if ((session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const archive = await generateZipExport()

    // Collect archive into buffer
    const chunks: Buffer[] = []
    await new Promise<void>((resolve, reject) => {
      archive.on('data', (chunk: Buffer) => chunks.push(chunk))
      archive.on('end', resolve)
      archive.on('error', reject)
    })
    const buffer = Buffer.concat(chunks)

    const dateStr = format(new Date(), 'yyyyMMdd')

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="journal-export-${dateStr}.zip"`,
      },
    })
  } catch (error) {
    console.error('ZIP export error:', error)
    return NextResponse.json(
      { error: 'Failed to generate ZIP export' },
      { status: 500 }
    )
  }
}
