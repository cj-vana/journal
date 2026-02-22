import puppeteer from 'puppeteer-core'
import { prisma } from '../prisma'
import { renderCover } from './templates/cover'
import { renderChapter } from './templates/chapter'
import { renderEntryPage } from './templates/entry-page'
import { renderMilestonePage } from './templates/milestone-page'
import { renderGrowthPage } from './templates/growth-page'

export async function generatePdfBook(): Promise<Buffer> {
  const [entries, milestones, growthRecords, settings] = await Promise.all([
    prisma.entry.findMany({
      where: { isDraft: false },
      include: {
        author: { select: { name: true } },
        tags: { include: { tag: true } },
        media: true,
      },
      orderBy: { entryDate: 'asc' },
    }),
    prisma.milestone.findMany({
      include: {
        recorder: { select: { name: true } },
      },
      orderBy: { date: 'asc' },
    }),
    prisma.growthRecord.findMany({
      orderBy: { date: 'asc' },
    }),
    prisma.appSettings.findFirst({ where: { id: 'singleton' } }),
  ])

  const appTitle = settings?.appTitle || 'Our Journal'
  const childName = settings?.childName || 'Baby'

  // Group entries by year
  const entriesByYear = new Map<number, typeof entries>()
  for (const entry of entries) {
    const year = new Date(entry.entryDate).getFullYear()
    if (!entriesByYear.has(year)) entriesByYear.set(year, [])
    entriesByYear.get(year)!.push(entry)
  }

  // Group milestones by year
  const milestonesByYear = new Map<number, typeof milestones>()
  for (const m of milestones) {
    const year = new Date(m.date).getFullYear()
    if (!milestonesByYear.has(year)) milestonesByYear.set(year, [])
    milestonesByYear.get(year)!.push(m)
  }

  // Build date range
  const allDates = entries.map((e) => new Date(e.entryDate))
  const startDate = allDates.length > 0 ? allDates[0] : new Date()
  const endDate = allDates.length > 0 ? allDates[allDates.length - 1] : new Date()

  // Build HTML sections
  const sections: string[] = []

  // Cover
  sections.push(
    renderCover({ appTitle, childName }, { start: startDate, end: endDate })
  )

  // Year chapters with entries
  const years = Array.from(entriesByYear.keys()).sort()
  for (const year of years) {
    const yearEntries = entriesByYear.get(year)!
    const yearMilestones = milestonesByYear.get(year) || []

    sections.push(
      renderChapter(String(year), {
        entryCount: yearEntries.length,
        milestoneHighlights: yearMilestones.slice(0, 5).map((m) => m.title),
      })
    )

    for (const entry of yearEntries) {
      sections.push(renderEntryPage(entry))
    }

    if (yearMilestones.length > 0) {
      sections.push(renderMilestonePage(yearMilestones, String(year)))
    }
  }

  // Growth page
  if (growthRecords.length > 0) {
    sections.push(renderGrowthPage(growthRecords))
  }

  const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Inter:wght@400;600&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Inter', sans-serif;
          color: #5c4033;
          background: #fff;
        }
        img { max-width: 100%; }
      </style>
    </head>
    <body>
      ${sections.join('\n')}
    </body>
    </html>
  `

  const browser = await puppeteer.launch({
    executablePath:
      process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  try {
    const page = await browser.newPage()
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' },
    })
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}
