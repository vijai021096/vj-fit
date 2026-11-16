import { useEffect, useState } from 'react'
import { Check, Pause, Play, SkipForward } from 'lucide-react'
import { COOLDOWN, COOLDOWN_HOLD, ROUTINE_ID, SAFETY, WARMUP } from '../data/common'
import { RoutineImage } from './RoutineImage'
import { usePerson } from '../store'
import { mmss, useCountdown } from '../screens/Session'
import { useStore } from '../store'
import { Btn, Segmented, Sheet, cx } from './ui'

export type Routine = 'warm' | 'cool'

/** Warm-up and cool-down on their own, any time: before you start, after you finish, or on a rest day. */
export function RoutineSheet({ open, initial, dayKind, onClose }: { open: boolean; initial: Routine; dayKind: string; onClose: () => void }) {
  const [tab, setTab] = useState<Routine>(initial)
  useEffect(() => { if (open) setTab(initial) }, [open, initial])
  return (
    <Sheet open={open} onClose={onClose} title="Warm-up & cool-down" full>
      <div className="mb-3"><Segmented id="routine" value={tab} onChange={setTab} options={[{ value: 'warm', label: 'Warm-up' }, { value: 'cool', label: 'Cool-down' }]} /></div>
      {tab === 'warm' ? <Warm dayKind={dayKind} /> : <Cool />}
    </Sheet>
  )
}

function Warm({ dayKind }: { dayKind: string }) {
  const sounds = useStore((s) => s.settings.sounds)
  const person = usePerson()
  const cd = useCountdown(300, sounds)
  const [ticked, setTicked] = useState<Record<number, boolean>>({})
  const drills = dayKind === 'lower' ? WARMUP.lower : dayKind === 'upper' ? WARMUP.upper : [...WARMUP.upper, ...WARMUP.lower]
  return (
    <div data-testid="warm-routine">
      <div className="card p-5 text-center">
        <RoutineImage id={ROUTINE_ID[WARMUP.general]} person={person} className="aspect-video w-full mb-3" />
        <div className="text-[13px] text-mute">{WARMUP.general}</div>
        <div className="display text-[56px] font-semibold num leading-none mt-2">{mmss(cd.left)}</div>
        <div className="flex justify-center mt-3"><Btn onClick={cd.toggle}>{cd.running ? <><Pause size={18} /> Pause</> : cd.done ? <><Check size={18} /> Done</> : <><Play size={18} /> Start 5 min</>}</Btn></div>
      </div>
      <h3 className="display font-semibold mt-5 mb-2">Then</h3>
      <div className="space-y-2">{drills.map((d, i) => (
        <button key={d} type="button" aria-pressed={!!ticked[i]} onClick={() => setTicked((t) => ({ ...t, [i]: !t[i] }))} className="w-full min-h-[52px] flex items-center gap-3 text-left px-3 rounded-2xl bg-s2 border border-line/60">
          <span className={cx('w-7 h-7 rounded-full grid place-items-center border shrink-0', ticked[i] ? 'accent-grad border-transparent text-[#08080c]' : 'border-line')}>{ticked[i] && <Check size={16} />}</span>
          <RoutineImage id={ROUTINE_ID[d]} person={person} className="w-16 h-16" />
          <span className="text-[15px]">{d}</span>
        </button>))}</div>
      <p className="text-[13px] text-mute mt-4">Before your first lift, do 1–2 light practice sets of it. Ramp-up weights show inside the workout.</p>
      <p className="text-[13px] text-mute mt-2">{SAFETY}</p>
    </div>
  )
}

function Cool() {
  const person = usePerson()
  const sounds = useStore((s) => s.settings.sounds)
  const [i, setI] = useState(0)
  const cd = useCountdown(COOLDOWN_HOLD, sounds, () => setTimeout(() => setI((x) => x + 1), 400))
  useEffect(() => { if (i > 0 && i < COOLDOWN.length) { cd.reset(); setTimeout(cd.toggle, 50) } }, [i]) // eslint-disable-line react-hooks/exhaustive-deps
  const over = i >= COOLDOWN.length
  return (
    <div data-testid="cool-routine">
      <div className="card p-6 text-center">
        {!over && <RoutineImage id={ROUTINE_ID[COOLDOWN[i]]} person={person} className="aspect-video w-full mb-3" />}
        <div className="text-[13px] text-mute">{over ? 'All done' : `Stretch ${i + 1} of ${COOLDOWN.length} · ${COOLDOWN_HOLD} s each`}</div>
        <div className="display text-[26px] font-semibold mt-1">{over ? 'Nice work.' : COOLDOWN[i]}</div>
        {!over && <div className="display text-[56px] font-semibold num leading-none mt-3">{mmss(Math.ceil(cd.left))}</div>}
        <div className="flex justify-center gap-2 mt-4">
          {!over && <><Btn onClick={cd.toggle}>{cd.running ? <><Pause size={18} /> Pause</> : <><Play size={18} /> Start</>}</Btn>
            <Btn kind="soft" onClick={() => setI(i + 1)}><SkipForward size={18} /> Next</Btn></>}
          {over && <Btn kind="soft" onClick={() => { cd.reset(); setI(0) }}>Again</Btn>}
        </div>
      </div>
      <ol className="mt-4 space-y-1.5">{COOLDOWN.map((s, j) => (
        <li key={s}><button type="button" onClick={() => { cd.reset(); setI(j) }} className={cx('w-full min-h-[40px] flex items-center gap-2 text-[14px] text-left', j < i ? 'text-mute line-through' : j === i ? 'font-medium' : 'text-mute')}>
          <span className={cx('w-5 h-5 rounded-full grid place-items-center text-[11px]', j < i ? 'accent-grad text-[#08080c]' : 'bg-s3')}>{j < i ? <Check size={12} /> : j + 1}</span>{s}</button></li>))}</ol>
    </div>
  )
}
