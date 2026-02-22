import fs from 'fs/promises'
import path from 'path'
import puppeteer from 'puppeteer-core'
import { prisma } from '../prisma'
import { renderCover } from './templates/cover'
import { renderChapter } from './templates/chapter'
import { renderEntryPage } from './templates/entry-page'
import { renderMilestonePage } from './templates/milestone-page'
import { renderGrowthPage } from './templates/growth-page'

export interface AccentColors {
  bg: string
  border: string
  text: string
  accent: string
}

const themeColors: Record<string, AccentColors> = {
  girl:    { bg: '#FFF5F5', border: '#D16B77', text: '#5c4033', accent: '#F4A0A8' },
  boy:     { bg: '#F0F7FF', border: '#4A8BC4', text: '#5c4033', accent: '#7BB4E8' },
  neutral: { bg: '#F4F8F4', border: '#5A8A5A', text: '#5c4033', accent: '#8CB88C' },
}

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
  const colors = themeColors[settings?.gender || 'neutral'] || themeColors.neutral

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
    renderCover({ appTitle, childName }, { start: startDate, end: endDate }, colors)
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
      }, colors)
    )

    // Render entries in parallel (each may read image files from disk)
    const entryPages = await Promise.all(
      yearEntries.map((entry) => renderEntryPage(entry, colors))
    )
    sections.push(...entryPages)

    if (yearMilestones.length > 0) {
      sections.push(renderMilestonePage(yearMilestones, String(year), colors))
    }
  }

  // Growth page
  if (growthRecords.length > 0) {
    sections.push(renderGrowthPage(growthRecords, colors))
  }

  // Embed local fonts as base64 to avoid external CDN dependency
  const fontsDir = path.join(process.cwd(), 'public', 'fonts')
  let fontStyles = ''
  try {
    const [caveatBuf, interBuf] = await Promise.all([
      fs.readFile(path.join(fontsDir, 'Caveat-Variable.woff2')),
      fs.readFile(path.join(fontsDir, 'Inter-Variable.woff2')),
    ])
    fontStyles = `
      @font-face {
        font-family: 'Caveat';
        src: url(data:font/woff2;base64,${caveatBuf.toString('base64')}) format('woff2');
        font-weight: 400 700;
      }
      @font-face {
        font-family: 'Inter';
        src: url(data:font/woff2;base64,${interBuf.toString('base64')}) format('woff2');
        font-weight: 100 900;
      }
    `
  } catch {
    // Fallback: fonts not available, Puppeteer will use system fonts
  }

  const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        ${fontStyles}
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
    // domcontentloaded is sufficient since all resources are now embedded (no external CDN)
    await page.setContent(fullHtml, { waitUntil: 'domcontentloaded' })
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
