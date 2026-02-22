import { format } from 'date-fns'
import type { AccentColors } from '../generator'

interface GrowthRecordForPdf {
  date: Date | string
  heightCm: number | null
  weightKg: number | null
  headCm: number | null
  notes: string | null
}

export function renderGrowthPage(records: GrowthRecordForPdf[], colors: AccentColors): string {
  const rows = records
    .map((r) => {
      const date =
        typeof r.date === 'string' ? new Date(r.date) : r.date
      const dateStr = format(date, 'MMM d, yyyy')

      return `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e8ddd4; font-size: 13px; color: #5c4033;">${dateStr}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e8ddd4; font-size: 13px; color: #5c4033; text-align: center;">${r.heightCm != null ? r.heightCm.toFixed(1) : '&mdash;'}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e8ddd4; font-size: 13px; color: #5c4033; text-align: center;">${r.weightKg != null ? r.weightKg.toFixed(2) : '&mdash;'}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e8ddd4; font-size: 13px; color: #5c4033; text-align: center;">${r.headCm != null ? r.headCm.toFixed(1) : '&mdash;'}</td>
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
        margin: 0 0 8px 0;
      ">Growth Journey</h3>
      <p style="
        font-family: 'Inter', sans-serif;
        font-size: 12px;
        color: #a08b7a;
        margin: 0 0 24px 0;
      ">Interactive charts are available in the digital version of the journal.</p>
      <table style="
        width: 100%;
        border-collapse: collapse;
        font-family: 'Inter', sans-serif;
      ">
        <thead>
          <tr>
            <th style="padding: 8px 12px; border-bottom: 2px solid ${colors.border}; text-align: left; font-size: 11px; color: #a08b7a; text-transform: uppercase; letter-spacing: 1px;">Date</th>
            <th style="padding: 8px 12px; border-bottom: 2px solid ${colors.border}; text-align: center; font-size: 11px; color: #a08b7a; text-transform: uppercase; letter-spacing: 1px;">Height (cm)</th>
            <th style="padding: 8px 12px; border-bottom: 2px solid ${colors.border}; text-align: center; font-size: 11px; color: #a08b7a; text-transform: uppercase; letter-spacing: 1px;">Weight (kg)</th>
            <th style="padding: 8px 12px; border-bottom: 2px solid ${colors.border}; text-align: center; font-size: 11px; color: #a08b7a; text-transform: uppercase; letter-spacing: 1px;">Head (cm)</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `
}
