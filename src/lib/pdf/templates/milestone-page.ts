import { format } from 'date-fns'
import { escapeHtml } from '@/lib/sanitize'
import type { AccentColors } from '../generator'

interface MilestoneForPdf {
  title: string
  description: string | null
  date: Date | string
  category: string | null
  icon: string | null
}

const categoryColors: Record<string, string> = {
  physical: '#e57373',
  cognitive: '#64b5f6',
  social: '#81c784',
  language: '#ffb74d',
  emotional: '#ce93d8',
  other: '#a08b7a',
}

export function renderMilestonePage(
  milestones: MilestoneForPdf[],
  yearLabel: string,
  colors: AccentColors
): string {
  const rows = milestones
    .map((m) => {
      const date =
        typeof m.date === 'string' ? new Date(m.date) : m.date
      const dateStr = format(date, 'MMM d, yyyy')
      const color = categoryColors[m.category || 'other'] || categoryColors.other
      const icon = m.icon || '\u2B50'

      return `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e8ddd4; font-size: 20px; text-align: center; width: 40px;">${escapeHtml(icon)}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e8ddd4;">
            <div style="font-weight: 600; color: #5c4033; font-size: 14px;">${escapeHtml(m.title)}</div>
            ${m.description ? `<div style="font-size: 12px; color: #8b6f5c; margin-top: 2px;">${escapeHtml(m.description)}</div>` : ''}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e8ddd4; font-size: 12px; color: #a08b7a; white-space: nowrap;">${dateStr}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e8ddd4;">
            ${m.category ? `<span style="font-size: 11px; color: ${escapeHtml(color)}; background: ${escapeHtml(color)}18; padding: 2px 8px; border-radius: 8px;">${escapeHtml(m.category)}</span>` : ''}
          </td>
        </tr>
      `
    })
    .join('')

  return `
    <div style="
      padding: 40px 48px;
      page-break-after: always;
    ">
      <h3 style="
        font-family: 'Caveat', cursive;
        font-size: 32px;
        color: #5c4033;
        margin: 0 0 24px 0;
      ">Milestones &mdash; ${escapeHtml(yearLabel)}</h3>
      <table style="
        width: 100%;
        border-collapse: collapse;
        font-family: 'Inter', sans-serif;
      ">
        <thead>
          <tr>
            <th style="padding: 8px 12px; border-bottom: 2px solid ${colors.border}; text-align: left; font-size: 11px; color: #a08b7a; text-transform: uppercase; letter-spacing: 1px;"></th>
            <th style="padding: 8px 12px; border-bottom: 2px solid ${colors.border}; text-align: left; font-size: 11px; color: #a08b7a; text-transform: uppercase; letter-spacing: 1px;">Milestone</th>
            <th style="padding: 8px 12px; border-bottom: 2px solid ${colors.border}; text-align: left; font-size: 11px; color: #a08b7a; text-transform: uppercase; letter-spacing: 1px;">Date</th>
            <th style="padding: 8px 12px; border-bottom: 2px solid ${colors.border}; text-align: left; font-size: 11px; color: #a08b7a; text-transform: uppercase; letter-spacing: 1px;">Category</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `
}
