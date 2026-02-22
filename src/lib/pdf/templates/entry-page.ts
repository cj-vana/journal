import fs from 'fs/promises'
import path from 'path'
import { format } from 'date-fns'
import { escapeHtml, sanitizeHtml } from '@/lib/sanitize'
import type { AccentColors } from '../generator'

const UPLOAD_DIR = process.env.UPLOAD_DIR || './data/uploads'

interface EntryMedia {
  type: string
  path: string
  mimeType: string
  caption: string | null
}

interface EntryTag {
  tag: {
    name: string
    color: string | null
  }
}

interface EntryForPdf {
  title: string | null
  entryDate: Date | string
  contentHtml: string | null
  content: string
  author: { name: string }
  media: EntryMedia[]
  tags: EntryTag[]
}

async function embedImage(mediaPath: string, mimeType: string): Promise<string> {
  try {
    const fullPath = path.join(UPLOAD_DIR, mediaPath)
    const imageBuffer = await fs.readFile(fullPath)
    const base64 = imageBuffer.toString('base64')
    return `data:${mimeType};base64,${base64}`
  } catch {
    return ''
  }
}

export async function renderEntryPage(entry: EntryForPdf, colors: AccentColors): Promise<string> {
  const entryDate =
    typeof entry.entryDate === 'string'
      ? new Date(entry.entryDate)
      : entry.entryDate
  const dateStr = format(entryDate, 'MMMM d, yyyy')

  const imageHtmlParts = await Promise.all(
    entry.media
      .filter((m) => m.type === 'image')
      .map(async (m) => {
        const dataUri = await embedImage(m.path, m.mimeType)
        if (!dataUri) return ''
        return `
          <div style="margin: 16px 0; text-align: center;">
            <img src="${dataUri}" style="max-width: 100%; max-height: 400px; border-radius: 8px; border: 1px solid #e8ddd4;" />
            ${m.caption ? `<p style="font-family: 'Inter', sans-serif; font-size: 12px; color: #a08b7a; margin-top: 4px;">${escapeHtml(m.caption)}</p>` : ''}
          </div>
        `
      })
  )
  const images = imageHtmlParts.join('')

  const audioNotes = entry.media
    .filter((m) => m.type === 'audio')
    .map(
      () =>
        `<p style="font-family: 'Inter', sans-serif; font-size: 13px; color: #a08b7a; font-style: italic; margin: 8px 0;">[Audio message &mdash; listen in digital journal]</p>`
    )
    .join('')

  const tags = entry.tags
    .map((et) => {
      const color = et.tag.color || '#d4a574'
      return `<span style="
        display: inline-block;
        font-family: 'Inter', sans-serif;
        font-size: 11px;
        background: ${escapeHtml(color)}22;
        color: ${escapeHtml(color)};
        border: 1px solid ${escapeHtml(color)}44;
        padding: 2px 10px;
        border-radius: 12px;
        margin-right: 6px;
        margin-bottom: 4px;
      ">${escapeHtml(et.tag.name)}</span>`
    })
    .join('')

  const contentHtml = entry.contentHtml
    ? sanitizeHtml(entry.contentHtml)
    : `<p>${escapeHtml(entry.content)}</p>`

  return `
    <div style="
      padding: 40px 48px;
      background: ${colors.bg};
      border: 1px solid #e8ddd4;
      border-radius: 8px;
      margin: 16px 0;
      page-break-after: always;
    ">
      <p style="
        font-family: 'Inter', sans-serif;
        font-size: 12px;
        color: #a08b7a;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        margin: 0 0 8px 0;
      ">${dateStr}</p>
      ${
        entry.title
          ? `<h3 style="
        font-family: 'Caveat', cursive;
        font-size: 32px;
        color: #5c4033;
        margin: 0 0 4px 0;
        line-height: 1.2;
      ">${escapeHtml(entry.title)}</h3>`
          : ''
      }
      <p style="
        font-family: 'Inter', sans-serif;
        font-size: 12px;
        color: #b8a494;
        margin: 0 0 20px 0;
      ">by ${escapeHtml(entry.author.name)}</p>
      <div style="
        font-family: 'Inter', sans-serif;
        font-size: 14px;
        color: #5c4033;
        line-height: 1.7;
      ">${contentHtml}</div>
      ${images}
      ${audioNotes}
      ${tags ? `<div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e8ddd4;">${tags}</div>` : ''}
    </div>
  `
}
