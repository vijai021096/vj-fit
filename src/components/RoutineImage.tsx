import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { Person } from '../types'
import { cx } from './ui'

/**
 * Warm-up / cool-down picture. Looks for /media/routine/<id>.webp (Varsha: <id>.f.webp first), and a second pose <id>-2.webp
 * that it fades to and from. Renders nothing at all if the picture isn't there, so a missing file never leaves a gap.
 */
export function RoutineImage({ id, person, className }: { id?: string; person: Person; className?: string }) {
  const [stage, setStage] = useState<'f' | 'm' | 'none'>(person === 'varsha' ? 'f' : 'm')
  const [two, setTwo] = useState(true)
  const reduce = useReducedMotion()
  if (!id || stage === 'none') return null
  const base = `/media/routine/${id}${stage === 'f' ? '.f' : ''}`
  return (
    <div className={cx('relative overflow-hidden rounded-2xl bg-s2 border border-line/60 shrink-0', className)} data-testid="routine-image">
      <img key={base} src={`${base}.webp`} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" onError={() => setStage(stage === 'f' ? 'm' : 'none')} />
      {two && <motion.img key={`${base}-2`} src={`${base}-2.webp`} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover"
        initial={{ opacity: 0 }} animate={reduce ? { opacity: 0 } : { opacity: [0, 1, 1, 0, 0] }} transition={{ duration: 3, times: [0, 0.35, 0.55, 0.9, 1], repeat: Infinity, ease: 'easeInOut' }} onError={() => setTwo(false)} />}
    </div>
  )
}
