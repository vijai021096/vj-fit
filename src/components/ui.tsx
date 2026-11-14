import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { Minus, Plus, X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ')
export const spring = { type: 'spring' as const, stiffness: 420, damping: 34 }

export function Btn({ children, onClick, kind = 'primary', className, disabled, label }: { children: ReactNode; onClick?: () => void; kind?: 'primary' | 'ghost' | 'soft' | 'danger'; className?: string; disabled?: boolean; label?: string }) {
  const base = 'min-h-[48px] px-5 rounded-2xl font-semibold text-[15px] inline-flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-transform'
  const kinds = {
    primary: 'accent-grad text-[#08080c] shadow-[0_10px_30px_-12px_var(--a1c)]',
    ghost: 'border border-line text-ink bg-transparent',
    soft: 'bg-s2 text-ink border border-line/60',
    danger: 'bg-red-500/15 text-red-300 border border-red-500/30',
  }
  return <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className={cx(base, kinds[kind], className)}>{children}</button>
}

export function Chip({ children, tone = 'default', className, onClick }: { children: ReactNode; tone?: 'default' | 'accent' | 'ok' | 'warn'; className?: string; onClick?: () => void }) {
  const tones = { default: 'bg-s2 text-ink border-line/70', accent: 'bg-a1/15 border-a1/40 accent-text', ok: 'bg-ok/15 text-ok border-ok/30', warn: 'bg-warn/15 text-warn border-warn/30' }
  const C = onClick ? 'button' : 'span'
  return <C onClick={onClick} className={cx('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium num whitespace-nowrap', onClick && 'min-h-[40px]', tones[tone], className)}>{children}</C>
}

export function Card({ children, className, onClick, layoutId }: { children: ReactNode; className?: string; onClick?: () => void; layoutId?: string }) {
  return <motion.div layoutId={layoutId} onClick={onClick} className={cx('card p-4', onClick && 'cursor-pointer active:scale-[0.99] transition-transform', className)}>{children}</motion.div>
}

export function Ticker({ value, digits = 0, className }: { value: number; digits?: number; className?: string }) {
  const reduce = useReducedMotion()
  const mv = useMotionValue(value)
  const text = useTransform(mv, (v) => v.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits }))
  useEffect(() => { if (reduce) { mv.set(value); return } const c = animate(mv, value, { duration: 0.6, ease: 'easeOut' }); return c.stop }, [value, reduce, mv])
  return <motion.span className={cx('num', className)}>{text}</motion.span>
}

export function Ring({ value, size = 64, stroke = 7, children, label }: { value: number; size?: number; stroke?: number; children?: ReactNode; label?: string }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(1, value || 0))
  const id = `g${size}${stroke}`
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={label ? `${label} ${Math.round(v * 100)}%` : undefined}>
      <svg width={size} height={size} className="-rotate-90">
        <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--a1c)" /><stop offset="1" stopColor="var(--a2c)" /></linearGradient></defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--s3))" strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${id})`} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c}
          initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - v) }} transition={{ duration: 0.9, ease: 'easeOut' }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  )
}

export function Stepper({ value, onChange, step = 1, min = 0, max = 999, unit, label, big, tight }: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; unit?: string; label: string; big?: boolean; tight?: boolean }) {
  const set = (v: number) => onChange(Math.max(min, Math.min(max, Math.round(v * 100) / 100)))
  const b = cx('grid place-items-center rounded-xl bg-s2 border border-line/70 active:bg-s3 shrink-0', big ? 'w-12 h-12' : tight ? 'w-10 h-12' : 'w-11 h-12')
  return (
    <div className={cx('flex items-center', tight ? 'gap-0.5' : 'gap-1')} role="group" aria-label={`${label} stepper`}>
      <button type="button" className={b} aria-label={`Decrease ${label}`} onClick={() => set(value - step)}><Minus size={18} /></button>
      <label className={cx('flex flex-col items-center', tight ? 'w-[42px]' : 'min-w-[52px]')}>
        <input aria-label={label} inputMode="decimal" className={cx(tight ? 'w-[42px] text-[18px]' : 'w-[56px] text-[20px]', 'bg-transparent text-center display font-semibold num outline-none')} value={Number.isFinite(value) ? value : 0}
          onChange={(e) => { const n = parseFloat(e.target.value); set(Number.isNaN(n) ? 0 : n) }} onFocus={(e) => e.target.select()} />
        {unit && <span className="text-[10px] uppercase tracking-wider text-mute -mt-1 whitespace-nowrap">{unit}</span>}
      </label>
      <button type="button" className={b} aria-label={`Increase ${label}`} onClick={() => set(value + step)}><Plus size={18} /></button>
    </div>
  )
}

export function Sheet({ open, onClose, title, children, full }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; full?: boolean }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] flex items-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/60" onClick={onClose} />
          <motion.div role="dialog" aria-modal="true" aria-label={title} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={spring}
            className={cx('relative w-full max-w-[520px] mx-auto bg-s1 border-t border-line rounded-t-[28px] safe-b flex flex-col', full ? 'h-[92dvh]' : 'max-h-[86dvh]')}>
            <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
              <h2 className="display text-[20px] font-semibold">{title}</h2>
              <button type="button" aria-label="Close" onClick={onClose} className="w-11 h-11 grid place-items-center rounded-full bg-s2"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto px-5 pb-6 no-scrollbar">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Segmented<T extends string>({ value, options, onChange, id, small }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; id: string; small?: boolean }) {
  return (
    <div className="inline-flex p-1 rounded-full bg-s2 border border-line/70" role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} type="button" onClick={() => onChange(o.value)}
          className={cx('relative rounded-full font-semibold', small ? 'px-3 min-h-[36px] text-[13px]' : 'px-4 min-h-[40px] text-[14px]', value === o.value ? 'text-[#08080c]' : 'text-mute')}>
          {value === o.value && <motion.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-full accent-grad" transition={spring} />}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  )
}

export function Bar({ value, max, label, unit = '' }: { value: number; max: number; label: string; unit?: string }) {
  const v = Math.max(0, Math.min(1, max ? value / max : 0))
  return (
    <div>
      <div className="flex justify-between text-[13px] mb-1.5"><span className="text-mute">{label}</span><span className="num font-medium">≈ <Ticker value={value} /> / {max.toLocaleString('en-IN')}{unit}</span></div>
      <div className="h-2.5 rounded-full bg-s3 overflow-hidden" role="progressbar" aria-label={label} aria-valuenow={Math.round(v * 100)} aria-valuemin={0} aria-valuemax={100}>
        <motion.div className="h-full rounded-full accent-grad" initial={{ width: 0 }} animate={{ width: `${v * 100}%` }} transition={{ duration: 0.7, ease: 'easeOut' }} />
      </div>
    </div>
  )
}

export const Section = ({ title, right, children, className }: { title: string; right?: ReactNode; children: ReactNode; className?: string }) => (
  <section className={cx('mt-6', className)}>
    <div className="flex items-end justify-between mb-2.5 px-1"><h2 className="display text-[18px] font-semibold">{title}</h2>{right}</div>
    {children}
  </section>
)

export const Empty = ({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) => (
  <div className="card p-6 text-center flex flex-col items-center gap-2">
    <div className="w-12 h-12 rounded-2xl bg-a1/15 accent-text grid place-items-center">{icon}</div>
    <div className="display text-[17px] font-semibold">{title}</div>
    <p className="text-[14px] text-mute max-w-[280px]">{body}</p>
    {action}
  </div>
)

export const Skeletons = ({ n = 3 }: { n?: number }) => <div className="space-y-3" aria-busy="true" aria-label="Loading">{Array.from({ length: n }, (_, i) => <div key={i} className="skeleton h-20" />)}</div>

export const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
export const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } } }

export function Confetti({ fire }: { fire: number }) {
  const reduce = useReducedMotion()
  if (!fire || reduce) return null
  const bits = Array.from({ length: 36 }, (_, i) => i)
  return (
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden" aria-hidden key={fire}>
      {bits.map((i) => {
        const x = (Math.sin(i * 12.9898 + fire) * 43758.5453) % 1, a = Math.abs(x)
        return <motion.span key={i} className="absolute top-1/3 left-1/2 block rounded-sm" style={{ width: 8, height: 12, background: i % 3 === 0 ? 'var(--a1c)' : i % 3 === 1 ? 'var(--a2c)' : '#fff' }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }} animate={{ x: (a - 0.5) * 520, y: [0, -160 - a * 160, 520], rotate: a * 720, opacity: [1, 1, 0] }} transition={{ duration: 1.6 + a * 0.6, ease: 'easeOut' }} />
      })}
    </div>
  )
}
