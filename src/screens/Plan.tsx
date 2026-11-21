import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, ChevronRight, Star, Timer } from 'lucide-react'
import { useStore, usePerson } from '../store'
import { WD_LABEL, WEEKDAYS, type MuscleId, type Step, type Weekday } from '../types'
import { usePosition, useSessions } from '../lib/hooks'
import { PROGRAMS, muscleSets, resolveDay0, resolveSession, restText, rxText, weekMod } from '../engine/program'
import { dateOf, fmtDate } from '../engine/calendar'
import { weekKeys } from '../lib/history'
import { EX, exName } from '../data/exercises'
import { MUSCLE_INFO } from '../data/common'
import { BodyMap } from '../components/BodyMap'
import { Card, Chip, Section, Segmented, cx, item, stagger } from '../components/ui'

export function Plan() {
  const person = usePerson()
  const pos = usePosition()
  const profile = useStore((s) => s.profiles[person])
  const start = useStore((s) => s.settings.programStart)
  const open = useStore((s) => s.open)
  const sessions = useSessions()
  const [month, setMonth] = useState<number>(pos.phase === 'program' ? pos.month : 1)
  const [week, setWeek] = useState<number>(pos.phase === 'program' ? pos.weekInMonth : 1)
  const [wd, setWd] = useState<Weekday | 'day0'>(pos.phase === 'program' ? pos.weekday : 'day0')
  const weekIndex = (month - 1) * 4 + week
  const mod = weekMod(month, week)
  const flags = { squatApproved: profile.squatApproved }
  const res = wd === 'day0' ? resolveDay0(person) : resolveSession(person, weekIndex, wd, flags)
  const done = weekKeys(sessions ?? [], pos.cycle, weekIndex)
  const heat = useMemo(() => {
    const tot: Partial<Record<MuscleId, number>> = {}
    WEEKDAYS.forEach((d) => { const m = muscleSets(resolveSession(person, weekIndex, d, flags).steps); (Object.keys(m) as MuscleId[]).forEach((k) => (tot[k] = (tot[k] ?? 0) + m[k]!)) })
    const max = Math.max(1, ...Object.values(tot).map((v) => v ?? 0))
    return { tot, norm: Object.fromEntries(Object.entries(tot).map(([k, v]) => [k, (v ?? 0) / max])) as Partial<Record<MuscleId, number>> }
  }, [person, weekIndex, profile.squatApproved]) // eslint-disable-line
  const [sel, setSel] = useState<MuscleId | null>(null)
  const patch = PROGRAMS[person].months[month as 2 | 3]

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <motion.h1 variants={item} className="display text-[30px] font-semibold">Plan</motion.h1>
      <motion.div variants={item} className="mt-3 flex flex-col gap-2">
        <Segmented id="month" value={String(month)} onChange={(v) => setMonth(Number(v))} options={[1, 2, 3].map((m) => ({ value: String(m), label: `Month ${m}` }))} />
        <div className="grid grid-cols-4 gap-1.5" role="tablist" aria-label="Week">
          {[1, 2, 3, 4].map((w) => {
            const m = weekMod(month, w)
            const cur = pos.phase === 'program' && pos.month === month && pos.weekInMonth === w
            return (
              <button key={w} type="button" role="tab" aria-selected={week === w} onClick={() => setWeek(w)} className={cx('min-h-[52px] rounded-2xl border text-center', week === w ? 'border-a1/60 bg-a1/15' : 'border-line/60 bg-s1')}>
                <div className={cx('text-[13px] font-semibold', week === w && 'accent-text')}>W{w}{cur ? ' •' : ''}</div><div className="text-[11px] text-mute">{m.name}</div>
              </button>)
          })}
        </div>
      </motion.div>
      <motion.div variants={item}><Card className="mt-3 !p-3"><div className="flex items-center gap-2 text-[13px]"><Chip tone="accent">{mod.name} · RIR {mod.rir}</Chip><span className="text-mute">{mod.hint}</span></div>
        {month > 1 && patch.note && <div className="text-[12px] text-mute mt-2">{patch.note}</div>}</Card></motion.div>

      <motion.div variants={item} className="mt-3 -mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar" role="tablist" aria-label="Day">
        {month === 1 && week === 1 && <DayPill active={wd === 'day0'} onClick={() => setWd('day0')} top="Day 0" bottom="Orient." done={(sessions ?? []).some((s) => s.key === 'day0')} />}
        {WEEKDAYS.map((d) => {
          const def = PROGRAMS[person].days[d]
          return <DayPill key={d} active={wd === d} onClick={() => setWd(d)} top={WD_LABEL[d]} bottom={fmtDate(dateOf(start, pos.cycle, weekIndex, d), { day: 'numeric', month: 'short' })} done={done.has(d)} dim={def.kind === 'rest'} />
        })}
      </motion.div>

      <motion.div variants={item} key={`${wd}${weekIndex}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="mt-3">
          <div className="flex items-start justify-between gap-2">
            <div><div className="display text-[22px] font-semibold">{res.def.title}</div>{res.def.subtitle && <div className="text-[13px] text-mute">{res.def.subtitle}</div>}</div>
            {res.def.minutes > 0 && <Chip>≈ {res.def.minutes} min</Chip>}
          </div>
          {res.def.note && <p className="text-[14px] text-mute mt-2">{res.def.note}</p>}
          <ul className="mt-3 divide-y divide-line/50">{res.steps.map((s, i) => <StepRow key={s.id} s={s} first={i === 0 || res.steps[i - 1].group !== s.group} onOpen={() => s.kind !== 'mobility' && open({ type: 'exercise', id: s.ex })} />)}</ul>
          {res.steps.length === 0 && <p className="text-[14px] text-mute mt-2">Nothing to lift today.</p>}
        </Card>
      </motion.div>

      <Section title="This week’s muscle volume">
        <Card>
          <BodyMap both heat={heat.norm} height={220} selected={sel} onSelect={setSel} />
          <div className="text-center text-[13px] mt-2 min-h-[20px]">{sel ? <><span className="font-semibold accent-text">{MUSCLE_INFO[sel].name}</span> · ≈ {Math.round((heat.tot[sel] ?? 0) * 10) / 10} sets this week</> : <span className="text-mute">Brighter = more sets. Tap a muscle for its weekly sets.</span>}</div>
          <div className="text-[11px] text-mute text-center mt-1">Primary muscles count 1 set, secondary ½.</div>
        </Card>
      </Section>
      {PROGRAMS[person].why && <Section title="Why this plan"><Card><ul className="space-y-2 text-[14px]">{PROGRAMS[person].why!.map((w) => <li key={w} className="flex gap-2"><span className="accent-text">•</span>{w}</li>)}</ul></Card></Section>}
    </motion.div>
  )
}

const DayPill = ({ active, onClick, top, bottom, done, dim }: { active: boolean; onClick: () => void; top: string; bottom: string; done?: boolean; dim?: boolean }) => (
  <button type="button" role="tab" aria-selected={active} onClick={onClick} className={cx('relative shrink-0 w-[64px] min-h-[64px] rounded-2xl border flex flex-col items-center justify-center', active ? 'accent-grad text-[#08080c] border-transparent' : 'bg-s1 border-line/60', dim && !active && 'opacity-60')}>
    <span className="text-[14px] font-semibold">{top}</span><span className={cx('text-[11px]', active ? 'text-[#08080c]/80' : 'text-mute')}>{bottom}</span>
    {done && <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-ok text-[#08080c] grid place-items-center"><Check size={12} strokeWidth={3} /></span>}
  </button>
)

function StepRow({ s, first, onOpen }: { s: Step; first: boolean; onOpen: () => void }) {
  return (
    <li>
      {s.group && first && <div className="text-[11px] uppercase tracking-widest accent-text font-semibold pt-3">{s.groupKind === 'circuit' ? `Circuit · ${s.sets} rounds` : 'Superset'}</div>}
      <button type="button" onClick={onOpen} className="w-full min-h-[56px] py-2 flex items-center gap-3 text-left">
        <span className="w-8 h-8 rounded-xl bg-s2 grid place-items-center text-[12px] font-semibold text-mute shrink-0">{s.label && s.kind === 'lift' ? s.label : s.star ? <Star size={14} className="accent-text" fill="currentColor" /> : '·'}</span>
        <span className="flex-1 min-w-0">
          <span className="block font-medium text-[15px] truncate">{s.kind === 'lift' ? exName(s.ex) : s.label}</span>
          {s.kind === 'lift' && EX[s.ex] && <span className="flex gap-1 mt-0.5 flex-wrap">{EX[s.ex].muscles.primary.map((m) => <span key={m} className="text-[10.5px] px-1.5 py-[1px] rounded-md bg-a1/15 accent-text font-semibold uppercase tracking-wide">{MUSCLE_INFO[m].name}</span>)}{EX[s.ex].muscles.secondary.slice(0, 2).map((m) => <span key={m} className="text-[10.5px] px-1.5 py-[1px] rounded-md bg-s3 text-mute uppercase tracking-wide">{MUSCLE_INFO[m].name}</span>)}</span>}
          <span className="block text-[12px] text-mute num truncate">{s.kind === 'lift' ? <>{rxText(s)}{s.rest > 0 && <> · <Timer size={11} className="inline -mt-0.5" /> {restText(s.rest)}</>}{s.note ? ` · ${s.note}` : ''}</> : <>{s.minutes} min{s.note ? ` · ${s.note}` : ''}{s.intervals ? ` · ${s.intervals.rounds} rounds` : ''}</>}</span>
        </span>
        {s.kind !== 'mobility' && <ChevronRight size={16} className="text-mute shrink-0" />}
      </button>
    </li>
  )
}
