import { format } from 'date-fns'
import { escapeHtml } from '@/lib/sanitize'
import type { AccentColors } from '../generator'

interface CoverSettings {
  appTitle: string
  childName: string
}

export function renderCover(
  settings: CoverSettings,
  dateRange: { start: Date; end: Date },
  colors: AccentColors
): string {
  const startLabel = format(dateRange.start, 'MMMM yyyy')
  const endLabel = format(dateRange.end, 'MMMM yyyy')

  return `
    <div style="
      width: 100%;
      height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: ${colors.bg};
      border: 3px dashed ${colors.border};
      border-radius: 16px;
      margin: 20px;
      box-sizing: border-box;
      page-break-after: always;
    ">
      <div style="text-align: center; padding: 40px;">
        <h1 style="
          font-family: 'Caveat', cursive;
          font-size: 60px;
          font-weight: 700;
          color: #5c4033;
          margin: 0 0 16px 0;
          line-height: 1.2;
        ">${escapeHtml(settings.appTitle)}</h1>
        <h2 style="
          font-family: 'Caveat', cursive;
          font-size: 36px;
          font-weight: 400;
          color: #8b6f5c;
          margin: 0 0 32px 0;
        ">${escapeHtml(settings.childName)}</h2>
        <p style="
          font-family: 'Inter', sans-serif;
          font-size: 16px;
          color: #a08b7a;
          letter-spacing: 1px;
        ">${startLabel} &mdash; ${endLabel}</p>
      </div>
    </div>
  `
}
