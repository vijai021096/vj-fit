import type { DayStat, Note, Summary } from './insights'
import { fmtDate } from '../engine/calendar'

export interface PdfInput {
  name: string; goal: string; stats: DayStat[]; sum: Summary
  target: { kcal: number; protein: number }; stepsGoal: number
  notes: Note[]; weights: { date: string; kg: number }[]; generated: string
}

/** The built-in PDF fonts only cover basic Latin, so swap the typographic characters the app uses. */
export const ascii = (s: string) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—−]/g, '-').replace(/×/g, 'x').replace(/·/g, '-').replace(/→/g, '->').replace(/…/g, '...').replace(/[^\x20-\x7E]/g, '')

const n0 = (n: number) => (n ? Math.round(n).toLocaleString('en-IN') : '-')
const d = (x: string) => ascii(fmtDate(x, { day: 'numeric', month: 'short' }))

export function weeklyRows(stats: DayStat[]) {
  const out: { label: string; workouts: number; minutes: number; eaten: number; steps: number }[] = []
  for (let i = 0; i < stats.length; i += 7) {
    const w = stats.slice(i, i + 7), e = w.filter((x) => x.eaten > 0), s = w.filter((x) => x.steps > 0)
    out.push({ label: `${d(w[0].date)} - ${d(w[w.length - 1].date)}`, workouts: w.reduce((a, x) => a + x.sessions, 0), minutes: w.reduce((a, x) => a + x.minutes, 0),
      eaten: e.length ? Math.round(e.reduce((a, x) => a + x.eaten, 0) / e.length) : 0, steps: s.length ? Math.round(s.reduce((a, x) => a + x.steps, 0) / s.length) : 0 })
  }
  return out
}

export async function buildInsightsPdf(p: PdfInput): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210, M = 14, CW = W - 2 * M
  let y = 0
  const text = (s: string, x: number, yy: number, o?: { size?: number; bold?: boolean; color?: [number, number, number]; align?: 'left' | 'right' | 'center' }) => {
    doc.setFont('helvetica', o?.bold ? 'bold' : 'normal'); doc.setFontSize(o?.size ?? 10); doc.setTextColor(...(o?.color ?? [30, 36, 54]))
    doc.text(ascii(s), x, yy, { align: o?.align ?? 'left' })
  }
  const need = (h: number) => { if (y + h > 285) { doc.addPage(); y = 18 } }
  const h2 = (s: string) => { need(14); y += 4; text(s, M, y, { size: 12.5, bold: true }); y += 2; doc.setDrawColor(210, 216, 230); doc.line(M, y, W - M, y); y += 5 }

  const first = p.stats[0]?.date, last = p.stats[p.stats.length - 1]?.date
  doc.setFillColor(14, 18, 34); doc.rect(0, 0, W, 30, 'F')
  text('V2 Fit  -  Insights', M, 14, { size: 18, bold: true, color: [255, 255, 255] })
  text(`${p.name}  |  ${p.goal}`, M, 21, { size: 10, color: [160, 200, 255] })
  text(`${first ? d(first) : ''} - ${last ? d(last) : ''}  (${p.stats.length} days)`, W - M, 14, { size: 10.5, bold: true, color: [255, 255, 255], align: 'right' })
  text(`Generated ${p.generated}`, W - M, 21, { size: 8.5, color: [160, 170, 195], align: 'right' })
  y = 38

  // summary tiles
  const s = p.sum
  const tiles: [string, string, string][] = [
    ['Eaten / day', n0(s.avgEaten) + (s.avgEaten ? ' kcal' : ''), `target ${n0(p.target.kcal)} kcal`],
    ['Protein / day', s.avgProtein ? `${s.avgProtein} g` : '-', `target ${p.target.protein} g`],
    ['Burnt / day (est.)', n0(s.avgBurn) + (s.avgBurn ? ' kcal' : ''), 'resting + living + steps + workouts'],
    ['Daily balance', s.net == null ? '-' : `${s.net > 0 ? '+' : ''}${s.net} kcal`, 'eaten minus burnt, days with food logged'],
    ['Workouts', String(s.workouts), s.volume ? `${s.minutes} min - ${n0(s.volume)} kg lifted` : `${s.minutes} min`],
    ['Steps / day', n0(s.avgSteps), `target ${n0(p.stepsGoal)}`],
    ['Water / day', s.avgWater ? `${s.avgWater} L` : '-', 'days with water logged'],
    ['Days logged', `${s.daysLogged} / ${p.stats.length}`, 'anything logged that day'],
  ]
  const tw = (CW - 6) / 3
  tiles.forEach((t, i) => {
    const col = i % 3, row = Math.floor(i / 3), x = M + col * (tw + 3), yy = y + row * 25
    doc.setFillColor(243, 246, 252); doc.setDrawColor(222, 228, 240); doc.roundedRect(x, yy, tw, 22, 2.5, 2.5, 'FD')
    text(t[0].toUpperCase(), x + 3.5, yy + 6, { size: 7, bold: true, color: [110, 120, 145] })
    text(t[1], x + 3.5, yy + 14, { size: 14, bold: true })
    text(t[2], x + 3.5, yy + 19.5, { size: 7, color: [120, 128, 150] })
  })
  y += Math.ceil(tiles.length / 3) * 25 + 2

  if (p.notes.length) {
    h2('In plain words')
    p.notes.forEach((nt) => {
      const lines = doc.splitTextToSize(ascii(nt.text), CW - 7) as string[]
      need(lines.length * 5 + 2)
      doc.setFillColor(...(nt.tone === 'good' ? [34, 160, 100] : nt.tone === 'warn' ? [230, 160, 20] : [150, 156, 175]) as [number, number, number]); doc.circle(M + 1.5, y - 1.2, 1.2, 'F')
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(30, 36, 54); doc.text(lines, M + 6, y)
      y += lines.length * 5 + 1.5
    })
  }

  // calories chart
  h2('Calories: eaten vs burnt')
  need(70)
  const cx0 = M + 12, cw = CW - 12, ch = 52, cy0 = y + 2
  const rawMax = Math.max(p.target.kcal * 1.1, ...p.stats.map((x) => Math.max(x.eaten, x.logged ? x.burn : 0)), 500)
  const maxV = Math.ceil(rawMax / 1000) * 1000
  const yOf = (v: number) => cy0 + ch - (v / maxV) * ch
  doc.setDrawColor(228, 232, 242); doc.setLineWidth(0.15)
  for (let g = 0; g <= 4; g++) { const v = (maxV / 4) * g, yy = yOf(v); doc.line(cx0, yy, cx0 + cw, yy); text(String(Math.round(v)), cx0 - 2, yy + 1, { size: 6.5, color: [130, 138, 160], align: 'right' }) }
  const bw = cw / p.stats.length
  p.stats.forEach((x, i) => {
    if (!x.eaten) return
    const ok = Math.abs(x.eaten - p.target.kcal) / p.target.kcal <= 0.1 || false
    doc.setFillColor(...(ok ? [70, 130, 255] : [235, 170, 40]) as [number, number, number])
    doc.rect(cx0 + i * bw + bw * 0.12, yOf(x.eaten), Math.max(bw * 0.76, 0.2), cy0 + ch - yOf(x.eaten), 'F')
  })
  doc.setDrawColor(34, 190, 220); doc.setLineWidth(0.7)
  let prev: [number, number] | null = null
  p.stats.forEach((x, i) => { if (!x.logged) { prev = null; return } const pt: [number, number] = [cx0 + i * bw + bw / 2, yOf(x.burn)]; if (prev) doc.line(prev[0], prev[1], pt[0], pt[1]); prev = pt })
  doc.setDrawColor(120, 128, 150); doc.setLineWidth(0.3); doc.setLineDashPattern([1.5, 1.5], 0); doc.line(cx0, yOf(p.target.kcal), cx0 + cw, yOf(p.target.kcal)); doc.setLineDashPattern([], 0)
  const step = Math.max(1, Math.ceil(p.stats.length / 8))
  p.stats.forEach((x, i) => { if (i % step === 0) text(d(x.date), cx0 + i * bw, cy0 + ch + 4.5, { size: 6.5, color: [130, 138, 160] }) })
  y = cy0 + ch + 9
  text('Blue/amber bars = eaten (amber when more than 10% off target)   Cyan line = burnt (est.)   Dashed = calorie target', M, y, { size: 7, color: [120, 128, 150] })
  y += 3

  // weekly table
  const wk = weeklyRows(p.stats)
  h2('Week by week')
  const cols = [M, M + 52, M + 82, M + 112, M + 150]
  need(8 + wk.length * 6)
  doc.setFillColor(243, 246, 252); doc.rect(M, y - 4, CW, 6.5, 'F')
  ;['Week', 'Workouts', 'Minutes', 'Eaten / day', 'Steps / day'].forEach((t, i) => text(t, cols[i], y, { size: 8, bold: true, color: [90, 100, 130] }))
  y += 6
  wk.forEach((w) => { need(6); [w.label, String(w.workouts), String(w.minutes), n0(w.eaten), n0(w.steps)].forEach((t, i) => text(t, cols[i], y, { size: 9 })); y += 5.5 })

  if (p.weights.length) {
    h2('Weight')
    const ws = [...p.weights].sort((a, b) => a.date.localeCompare(b.date))
    const delta = Math.round((ws[ws.length - 1].kg - ws[0].kg) * 10) / 10
    text(`${ws[0].kg} kg (${d(ws[0].date)})  ->  ${ws[ws.length - 1].kg} kg (${d(ws[ws.length - 1].date)})   change ${delta > 0 ? '+' : ''}${delta} kg   (${ws.length} weigh-ins)`, M, y, { size: 10 }); y += 5
  }

  // daily log
  h2('Day by day')
  const dc = [M, M + 24, M + 52, M + 78, M + 104, M + 130, M + 156]
  const head = () => { doc.setFillColor(243, 246, 252); doc.rect(M, y - 4, CW, 6.5, 'F'); ;['Date', 'Eaten kcal', 'Protein g', 'Burnt kcal', 'Steps', 'Water L', 'Workout min'].forEach((t, i) => text(t, dc[i], y, { size: 8, bold: true, color: [90, 100, 130] })); y += 6 }
  need(14); head()
  ;[...p.stats].reverse().forEach((x) => {
    if (y > 283) { doc.addPage(); y = 18; head() }
    const cells = [fmtDate(x.date, { weekday: 'short', day: 'numeric', month: 'short' }), n0(x.eaten), n0(x.protein), x.logged ? n0(x.burn) : '-', n0(x.steps), x.water ? String(x.water) : '-', x.minutes ? String(x.minutes) : '-']
    cells.forEach((t, i) => text(t, dc[i], y, { size: 8.5, color: x.logged ? [30, 36, 54] : [170, 176, 195] }))
    y += 5
  })
  y += 4; need(10)
  text('Estimates only: eaten = meals ticked off at your scaled portions plus extras; burnt = BMR x 1.2 + steps + logged workouts. Use them to spot trends, not as exact numbers.', M, y, { size: 7, color: [130, 138, 160] })

  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) { doc.setPage(i); text(`V2 Fit  |  ${p.name}  |  page ${i} of ${pages}`, W / 2, 292, { size: 7, color: [150, 156, 175], align: 'center' }) }
  return doc.output('blob')
}
