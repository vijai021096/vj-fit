/** Web Audio chimes. iOS needs the context created/resumed inside a user gesture. */
let ctx: AudioContext | null = null
export function unlockAudio() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    if (!ctx) ctx = new AC()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch { /* no audio */ }
}
export function chime(kind: 'soft' | 'done' | 'tick' = 'soft', enabled = true) {
  if (!enabled || !ctx || ctx.state !== 'running') return
  const notes = kind === 'done' ? [660, 880, 1320] : kind === 'tick' ? [880] : [740]
  notes.forEach((f, i) => {
    const o = ctx!.createOscillator(), g = ctx!.createGain()
    const t = ctx!.currentTime + i * 0.14
    o.type = 'sine'; o.frequency.value = f
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(kind === 'tick' ? 0.08 : 0.18, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5)
    o.connect(g).connect(ctx!.destination); o.start(t); o.stop(t + 0.55)
  })
}
if (typeof window !== 'undefined') {
  const h = () => unlockAudio()
  window.addEventListener('pointerdown', h, { passive: true })
  window.addEventListener('touchend', h, { passive: true })
}

/** Screen Wake Lock with graceful fallback (may be unavailable or denied on iOS). */
type Sentinel = { release: () => Promise<void> }
let lock: Sentinel | null = null
export async function keepAwake(on: boolean): Promise<boolean> {
  try {
    if (!on) { await lock?.release(); lock = null; return false }
    const wl = (navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<Sentinel> } }).wakeLock
    if (!wl) return false
    lock = await wl.request('screen')
    return true
  } catch { return false }
}
