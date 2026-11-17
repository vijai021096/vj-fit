/** Session share card: canvas image → Web Share (falls back to download). */
export async function shareCard(o: { name: string; title: string; date: string; minutes: number; volume: number; sets: number; prs: number; c1: string; c2: string }) {
  const W = 1080, H = 1350
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const x = c.getContext('2d')!
  x.fillStyle = '#0B0B0F'; x.fillRect(0, 0, W, H)
  const g = x.createRadialGradient(200, 100, 0, 200, 100, 1100); g.addColorStop(0, o.c1 + 'aa'); g.addColorStop(0.5, o.c2 + '33'); g.addColorStop(1, '#0B0B0F00')
  x.fillStyle = g; x.fillRect(0, 0, W, H)
  const font = (w: number, s: number, f = 'Bricolage Grotesque Variable') => { x.font = `${w} ${s}px "${f}", system-ui, sans-serif` }
  x.fillStyle = '#fff'; font(700, 64); x.fillText('V² Fit', 80, 150)
  x.fillStyle = '#A0A0B4'; font(500, 40, 'Inter Variable'); x.fillText(o.date, 80, 215)
  x.fillStyle = '#fff'; font(700, 120); wrap(x, o.title, 80, 480, W - 160, 128)
  const lg = x.createLinearGradient(80, 0, 700, 0); lg.addColorStop(0, o.c1); lg.addColorStop(1, o.c2)
  x.fillStyle = lg; font(600, 56); x.fillText(`${o.name} showed up.`, 80, 720)
  const stats: [string, string][] = [[`${o.minutes}`, 'minutes'], [`${o.volume.toLocaleString('en-IN')}`, 'kg lifted'], [`${o.sets}`, 'sets'], [`${o.prs}`, o.prs === 1 ? 'PR' : 'PRs']]
  stats.forEach(([v, l], i) => {
    const cx = 80 + (i % 2) * 480, cy = 900 + Math.floor(i / 2) * 200
    x.fillStyle = '#fff'; font(700, 96); x.fillText(v, cx, cy)
    x.fillStyle = '#A0A0B4'; font(500, 36, 'Inter Variable'); x.fillText(l, cx, cy + 52)
  })
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/png'))
  if (!blob) return
  const file = new File([blob], 'v2fit-session.png', { type: 'image/png' })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.canShare?.({ files: [file] })) { try { await nav.share({ files: [file], title: 'V² Fit' }); return } catch { return } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click()
}
function wrap(x: CanvasRenderingContext2D, text: string, px: number, py: number, max: number, lh: number) {
  let line = ''; let y = py
  for (const w of text.split(' ')) { const t = line ? `${line} ${w}` : w; if (x.measureText(t).width > max && line) { x.fillText(line, px, y); line = w; y += lh } else line = t }
  x.fillText(line, px, y)
}

/** Save a generated file: the share sheet on phones (Save to Files), a normal download elsewhere. */
export async function saveBlob(blob: Blob, name: string) {
  const file = new File([blob], name, { type: blob.type || 'application/pdf' })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  const phone = /iPhone|iPad|iPod/.test(navigator.userAgent)
  if (phone && nav.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); return } catch (e) { if ((e as Error)?.name === 'AbortError') return }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 30000)
}
