import { Pause, Play, RotateCcw, Save, X } from 'lucide-react'
import { useStore, usePerson } from '../store'
import { db, patchDay, useLive } from '../db'
import { istDate } from '../engine/calendar'
import { useTick } from '../lib/hooks'
import { exName } from '../data/exercises'
import { fmtDuration } from '../lib/cardio'
import { Btn, Card } from './ui'

const clock = (s: number) => { const t = Math.floor(s); return `${Math.floor(t / 3600) ? `${Math.floor(t / 3600)}:` : ''}${String(Math.floor((t % 3600) / 60)).padStart(Math.floor(t / 3600) ? 2 : 1, '0')}:${String(t % 60).padStart(2, '0')}` }

/** A stopwatch for treadmill, bike or any other cardio done outside a planned workout. Saved to today's log. */
export function CardioTimer({ ex }: { ex: string }) {
  const person = usePerson()
  const quick = useStore((s) => s.quick)
  const say = useStore((s) => s.say)
  const date = istDate()
  const row = useLive(() => db.days.get(`${person}|${date}`), [person, date], undefined)
  const mine = quick?.ex === ex ? quick : null
  const other = quick && quick.ex !== ex ? quick : null
  useTick(250, !!mine?.startedAt)
  const el = mine ? mine.elapsed + (mine.startedAt ? (Date.now() - mine.startedAt) / 1000 : 0) : 0
  const set = (fn: (q: NonNullable<typeof quick>) => void) => useStore.getState().set((s) => { if (s.quick) fn(s.quick) })
  const start = () => useStore.getState().set((s) => { s.quick = { ex, startedAt: Date.now(), elapsed: 0 } })
  const toggle = () => set((q) => { if (q.startedAt) { q.elapsed += (Date.now() - q.startedAt) / 1000; q.startedAt = null } else q.startedAt = Date.now() })
  const save = async () => {
    const sec = Math.round(el)
    await patchDay(person, date, (d) => { d.cardio = [...(d.cardio ?? []), { id: `${Date.now()}`, ex, sec }] })
    useStore.getState().set((s) => { s.quick = null })
    say(`${fmtDuration(sec)} of ${exName(ex).toLowerCase()} saved`)
  }
  const today = (row?.cardio ?? [])
  const total = today.reduce((n, e) => n + e.sec, 0)
  return (
    <Card className="mt-3 !p-4" data-testid="cardio-timer">
      <div className="text-[13px] font-semibold">Time it</div>
      <div className="display text-[52px] font-semibold num leading-none text-center mt-2" role="timer" aria-label="Elapsed time">{clock(el)}</div>
      {other && <p className="text-[13px] text-mute text-center mt-2">The {exName(other.ex)} timer is still open. Save or reset it first.</p>}
      <div className="flex justify-center gap-2 mt-3">
        {!mine ? <Btn onClick={start} disabled={!!other}><Play size={18} /> Start</Btn> : <>
          <Btn onClick={toggle}>{mine.startedAt ? <><Pause size={18} /> Pause</> : <><Play size={18} /> Resume</>}</Btn>
          <Btn kind="soft" onClick={() => void save()} disabled={el < 10}><Save size={18} /> Save</Btn>
          <Btn kind="soft" label="Reset timer" onClick={() => useStore.getState().set((s) => { s.quick = null })}><RotateCcw size={18} /></Btn></>}
        {other && <Btn kind="soft" label="Reset other timer" onClick={() => useStore.getState().set((s) => { s.quick = null })}><RotateCcw size={18} /></Btn>}
      </div>
      {today.length > 0 && <div className="mt-4 border-t border-line/60 pt-3">
        <div className="flex justify-between text-[13px]"><span className="text-mute">Cardio logged today</span><span className="font-semibold num">{fmtDuration(total)}</span></div>
        <ul className="mt-1.5 space-y-1">{today.map((e) => <li key={e.id} className="flex items-center justify-between text-[14px]"><span>{exName(e.ex)} · {fmtDuration(e.sec)}</span>
          <button type="button" aria-label={`Remove ${exName(e.ex)} entry`} onClick={() => void patchDay(person, date, (d) => { d.cardio = (d.cardio ?? []).filter((x) => x.id !== e.id) })} className="w-9 h-9 grid place-items-center text-mute"><X size={16} /></button></li>)}</ul>
      </div>}
    </Card>
  )
}
