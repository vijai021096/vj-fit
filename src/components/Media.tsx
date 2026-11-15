import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Play } from 'lucide-react'
import type { Exercise, MediaSet, Person } from '../types'
import { BodyMap } from './BodyMap'
import { Chip, cx } from './ui'

/** Phase-2 media manifest: { [exerciseId]: { male?: {video, poster}, female?: {...} } }. Swappable without code changes. */
type Manifest = Record<string, { male?: MediaSet; female?: MediaSet }>
let manifest: Manifest | null = null
let pending: Promise<Manifest> | null = null
export function loadManifest(): Promise<Manifest> {
  if (manifest) return Promise.resolve(manifest)
  pending ??= fetch('/media/hf/manifest.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : {})).catch(() => ({})).then((m: Manifest) => (manifest = m))
  return pending
}

/**
 * A looping silent demo. iPhone Safari often refuses autoplay when React renders the video (the muted flag isn't set early enough),
 * and Low Power Mode blocks it outright, so: force muted in code, call play() ourselves, retry when the app comes back to the
 * foreground, and if the browser still says no, show a big play button.
 */
function AutoVideo({ src, poster, onBroken }: { src: string; poster?: string; onBroken: () => void }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [blocked, setBlocked] = useState(false)
  const play = () => {
    const v = ref.current
    if (!v) return
    v.muted = true
    void v.play().then(() => setBlocked(false)).catch((e: unknown) => { if ((e as { name?: string })?.name !== 'AbortError') setBlocked(true) })
  }
  useEffect(() => {
    const v = ref.current
    if (!v) return
    v.muted = true; v.defaultMuted = true
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '')
    play()
    const back = () => { if (!document.hidden && ref.current?.paused) play() }
    document.addEventListener('visibilitychange', back)
    return () => document.removeEventListener('visibilitychange', back)
  }, [src]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <video ref={ref} src={src} poster={poster} autoPlay muted loop playsInline preload="auto" className="w-full h-full object-cover" onError={onBroken} onCanPlay={() => { if (ref.current?.paused && !blocked) play() }} />
      {blocked && (
        <button type="button" aria-label="Play demo" data-testid="play-demo" onClick={play} className="absolute inset-0 grid place-items-center bg-black/25">
          <span className="w-16 h-16 rounded-full bg-black/60 border border-white/30 grid place-items-center"><Play size={28} className="text-white ml-1" fill="currentColor" /></span>
        </button>)}
    </>
  )
}

/** Small still for lists: our own clip's poster, then the old fallback photo, else a placeholder. */
export function ExerciseThumb({ ex, person }: { ex: Exercise; person: Person }) {
  const [m, setM] = useState<Manifest | null>(manifest)
  const [bad, setBad] = useState(false)
  useEffect(() => { let live = true; loadManifest().then((x) => { if (live) setM(x) }); return () => { live = false } }, [])
  const e = m?.[ex.id]
  const src = (e ? (person === 'varsha' ? e.female ?? e.male : e.male ?? e.female)?.poster : undefined) ?? (m ? ex.media.fallback?.[0] : undefined)
  if (!src || bad) return m ? <span className="text-[10px] text-mute text-center leading-tight">Demo<br />soon</span> : null
  return <img src={src} alt="" loading="lazy" onError={() => setBad(true)} className="w-full h-full object-cover" />
}

const tempoSeconds = (t: string) => { const n = t.split('-').map(Number).filter((x) => !Number.isNaN(x)); return n.length ? Math.max(2.4, n.reduce((a, b) => a + b, 0) + 0.8) : 4 }

/** Priority: Higgsfield video → Higgsfield still → fallback crossfade → body map. */
export function ExerciseMedia({ ex, person, className }: { ex: Exercise; person: Person; className?: string }) {
  const [hf, setHf] = useState<MediaSet | undefined>()
  const [broken, setBroken] = useState(false)
  const reduce = useReducedMotion()
  useEffect(() => {
    let live = true
    setBroken(false)
    loadManifest().then((m) => { if (!live) return; const e = m[ex.id]; setHf(e ? (person === 'varsha' ? e.female ?? e.male : e.male ?? e.female) : undefined) })
    return () => { live = false }
  }, [ex.id, person])
  const fb = ex.media.fallback
  const dur = tempoSeconds(ex.tempo)
  const frame = 'relative overflow-hidden rounded-xl3 bg-s2 border border-line/60 aspect-[4/3]'
  if (hf?.video && !broken) return (
    <div className={cx(frame, '!aspect-video', className)}>
      <AutoVideo src={hf.video} poster={hf.poster} onBroken={() => setBroken(true)} />
    </div>
  )
  if (hf?.poster && !broken) return <div className={cx(frame, '!aspect-video', className)}><img src={hf.poster} alt={ex.name} className="w-full h-full object-cover" onError={() => setBroken(true)} /></div>
  if (fb) return (
    <div className={cx(frame, className)}>
      <div className={cx('absolute inset-0', !reduce && 'kenburns')}>
        <img src={fb[0]} alt={`${ex.name} — start position`} className="absolute inset-0 w-full h-full object-cover" decoding="async" />
        <motion.img src={fb[1]} alt={`${ex.name} — end position`} className="absolute inset-0 w-full h-full object-cover" decoding="async"
          initial={{ opacity: 0 }} animate={reduce ? { opacity: 0 } : { opacity: [0, 1, 1, 0, 0] }} transition={{ duration: dur, times: [0, 0.35, 0.5, 0.85, 1], repeat: Infinity, ease: 'easeInOut' }} />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
      {ex.mediaNote && <div className="absolute left-3 right-3 bottom-2 text-[12px] text-white/90">{ex.mediaNote}</div>}
    </div>
  )
  return (
    <div className={cx(frame, 'grid place-items-center py-3', className)}>
      <BodyMap primary={ex.muscles.primary} secondary={ex.muscles.secondary} height={210} flip={false} />
      <Chip tone="accent" className="absolute top-3 left-3">Demo coming soon</Chip>
    </div>
  )
}
