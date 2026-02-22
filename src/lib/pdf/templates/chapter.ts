interface ChapterStats {
  entryCount: number
  milestoneHighlights: string[]
}

export function renderChapter(yearLabel: string, stats: ChapterStats): string {
  const milestoneList = stats.milestoneHighlights
    .map((m) => `<li style="margin-bottom: 4px; color: #8b6f5c;">${m}</li>`)
    .join('')

  return `
    <div style="
      width: 100%;
      height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #FFFDF7;
      page-break-after: always;
    ">
      <div style="text-align: center; padding: 40px;">
        <div style="
          width: 80px;
          height: 2px;
          background: #d4a574;
          margin: 0 auto 24px auto;
        "></div>
        <h2 style="
          font-family: 'Caveat', cursive;
          font-size: 48px;
          font-weight: 700;
          color: #5c4033;
          margin: 0 0 16px 0;
        ">${yearLabel}</h2>
        <p style="
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          color: #a08b7a;
          margin: 0 0 24px 0;
        ">${stats.entryCount} ${stats.entryCount === 1 ? 'entry' : 'entries'}</p>
        ${
          milestoneList
            ? `
        <div style="text-align: left; max-width: 300px; margin: 0 auto;">
          <p style="font-family: 'Inter', sans-serif; font-size: 12px; color: #a08b7a; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Key Milestones</p>
          <ul style="font-family: 'Inter', sans-serif; font-size: 14px; list-style: none; padding: 0;">${milestoneList}</ul>
        </div>`
            : ''
        }
        <div style="
          width: 80px;
          height: 2px;
          background: #d4a574;
          margin: 24px auto 0 auto;
        "></div>
      </div>
    </div>
  `
}
