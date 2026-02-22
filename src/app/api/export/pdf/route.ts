import { NextResponse } from 'next/server'
import { apiAuth } from '@/lib/api-auth'
import { generatePdfBook } from '@/lib/pdf/generator'
import { format } from 'date-fns'

export async function POST() {
  try {
    const session = await apiAuth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const pdf = await generatePdfBook()
    const dateStr = format(new Date(), 'yyyyMMdd')

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="journal-book-${dateStr}.pdf"`,
      },
    })
  } catch (error) {
    console.error('PDF export error:', error)
    const message =
      error instanceof Error && error.message.includes('executablePath')
        ? 'PDF generation requires Chromium. This feature is available when running in Docker.'
        : 'Failed to generate PDF book'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
