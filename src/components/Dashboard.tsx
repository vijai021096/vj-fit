import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Flame, Target, TrendingDown, Trophy, Zap } from 'lucide-react'
import type { DayRow, WeightRow } from '../db'
import type { MuscleId, Person, Profile, SessionLog } from '../types'
import { MUSCLE_INFO } from '../data/common'
import { fmtDate } from '../engine/calendar'
import { stepsTarget, targets, waterTarget } from '../engine/nutrition'
import { dayStats, rangeDates } from '../lib/insights'
import { XP_RULES, forecast, gamify, levelOf } from '../lib/gamify'
import { recovery, type Freshness } from '../lib/recovery'
import { BodyMap } from './BodyMap'
import { Card, Chip, Ring, Sheet, cx } from './ui'

/* ───────────── Goal countdown ───────────── */
export function GoalCard({ weights, profile, today }: { weights: WeightRow[]; profile: Profile; today: string }) {
  const goal = profile.goalWeightKg ?? 77
  const f = forecast(weights, profile.weightKg, goal, today)
  const label = { ahead: 'Ahead of plan', 'on-track': 'On track', behind: 'A bit slow', gaining: 'Trending up', unknown: 'Weigh in daily', done: 'Goal reached!' }[f.status]
  const tone = f.status === 'ahead' || f.status === 'on-track' || f.status === 'done' ? 'ok' : f.status === 'unknown' ? 'default' : 'warn'
  return (
    <Card className="mt-4 neon-border overflow-hidden relative" data-testid="goal-card">
      <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full accent-grad opacity-[0.10] blur-2xl pointer-events-none" />
      <div className="relative flex items-center gap-4">
        <Ring value={f.pct} size={112} stroke={11} label="Progress to goal">
          <div className="text-center leading-none">
            <div className="display text-[34px] font-extrabold num accent-grad-text">{f.left.toFixed(1)}</div>
            <div className="text-[11px] text-mute uppercase tracking-widest mt-0.5">kg to go</div>
          </div>
        </Ring>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] uppercase tracking-widest accent-text font-semibold flex items-center gap-1.5"><Target size={13} /> Goal {goal} kg</div>
          <div className="display text-[26px] font-bold num leading-tight mt-0.5">{f.now.toFixed(1)} <span className="text-mute text-[16px]">kg now</span></div>
          <div className="text-[13px] text-mute num">−{f.lost.toFixed(1)} kg since {f.start.toFixed(1)} · {Math.round(f.pct * 100)}%</div>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            <Chip tone={tone}>{label}</Chip>
            {f.rate != null && <Chip><TrendingDown size={13} /> {f.rate > 0 ? '+' : ''}{f.rate.toFixed(2)} kg/wk</Chip>}
          </div>
        </div>
      </div>
      {f.status !== 'done' && f.eta && <div className="relative mt-3 rounded-2xl bg-s2/70 border border-line/60 px-3 py-2 text-[13px] flex items-center justify-between gap-2">
        <span className="text-mute">{f.etaFromPlan ? 'At the planned 0.6 kg/week' : 'At your current pace'}, you hit {goal} kg around</span>
        <span className="font-semibold accent-text num whitespace-nowrap">{fmtDate(f.eta, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
      </div>}
    </Card>
  )
}

/* ───────────── XP, level, streak ───────────── */
export function LevelCard({ person, profile, weights, days, sessions, settings, today }: {
  person: Person; profile: Profile; weights: WeightRow[]; days: DayRow[]; sessions: SessionLog[]
  settings: { programStart: string; mergeDay0: boolean }; today: string
}) {
  const [open, setOpen] = useState(false)
  const g = useMemo(() => {
    const first = [settings.programStart, ...days.map((d) => d.date), ...weights.map((w) => w.date), ...sessions.map((s) => s.date)].filter((d) => d <= today).sort()[0] ?? today
    const n = Math.min(365, Math.max(1, Math.round((Date.parse(today) - Date.parse(first)) / 86400000) + 1))
    const stats = dayStats(person, rangeDates(today, n), days, sessions, weights, profile, settings)
    const t = targets(person, profile)
    return gamify(stats, { kcal: t.kcal, protein: t.protein, steps: stepsTarget(person, profile), waterL: waterTarget(person, profile) }, weights, sessions)
  }, [person, profile, weights, days, sessions, settings, today])
  const lv = levelOf(g.total)
  return (
    <>
      <Card className="mt-3 !p-3.5" onClick={() => setOpen(true)} data-testid="level-card">
        <div className="flex items-center gap-3">
          <div className="relative w-14 h-14 shrink-0 rounded-2xl accent-grad grid place-items-center text-[#0a0a0a] glow">
            <span className="display text-[26px] font-extrabold num leading-none">{lv.level}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="display caps text-[19px] font-bold">Level {lv.level} · {lv.title}</div>
              <div className="text-[12px] text-mute num">{g.total.toLocaleString('en-IN')} XP</div>
            </div>
            <div className="h-2.5 rounded-full bg-s3 mt-1.5 overflow-hidden"><motion.div className="h-full accent-grad rounded-full glow" initial={{ width: 0 }} animate={{ width: `${Math.round(lv.pct * 100)}%` }} transition={{ duration: 0.9, ease: 'easeOut' }} /></div>
            <div className="text-[12px] text-mute mt-1 num">{(lv.need - lv.into).toLocaleString('en-IN')} XP to level {lv.level + 1} · +{g.todayXp} today</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <Stat icon={<Flame size={15} className="text-[#ff6b00] glow-o" />} v={`${g.streak}`} l="day streak" />
          <Stat icon={<Trophy size={15} className="accent-text" />} v={`${g.best}`} l="best streak" />
          <Stat icon={<Zap size={15} className="accent-text" />} v={g.week.toLocaleString('en-IN')} l="XP this week" />
        </div>
      </Card>
      <Sheet open={open} onClose={() => setOpen(false)} title="Today’s XP">
        <p className="text-[14px] text-mute mb-3">Hit 3 of the 5 daily habits to keep your streak alive. Rest days count when you nail food, steps and water.</p>
        <ul className="space-y-1.5">{XP_RULES.map((r) => {
          const on = g.today[r.key]
          return <li key={r.key} className={cx('flex items-center gap-3 rounded-2xl border px-3 min-h-[48px]', on ? 'border-a1/50 bg-a1/10' : 'border-line/60 bg-s2')}>
            <span className={cx('w-7 h-7 rounded-lg grid place-items-center', on ? 'accent-grad text-[#0a0a0a]' : 'bg-s3 text-mute')}>{on ? <Check size={16} strokeWidth={3} /> : null}</span>
            <span className="flex-1 text-[15px]">{r.label}</span><span className={cx('text-[13px] font-semibold num', on ? 'accent-text' : 'text-mute')}>+{r.xp}</span>
          </li>
        })}</ul>
        <p className="text-[12px] text-mute mt-3">Every personal record in a workout adds +25 XP. Titles go Rookie → Grinder → Iron → Shredder → Beast → Machine → Spartan → Titan → Legend.</p>
      </Sheet>
    </>
  )
}
const Stat = ({ icon, v, l }: { icon: React.ReactNode; v: string; l: string }) => (
  <div className="rounded-2xl bg-s2/80 border border-line/60 px-2 py-2 text-center"><div className="flex items-center justify-center gap-1.5">{icon}<span className="display text-[20px] font-bold num">{v}</span></div><div className="text-[11px] text-mute">{l}</div></div>
)

/* ───────────── Muscle recovery ───────────── */
const TONE: Record<Freshness, string> = { fresh: 'text-[#c6ff00]', recovering: 'text-[#ffc400]', fatigued: 'text-[#ff6b00]' }
export function RecoveryCard({ sessions, todayPrimary }: { sessions: SessionLog[]; todayPrimary: MuscleId[] }) {
  const rec = useMemo(() => recovery(sessions), [sessions])
  const list = Object.values(rec).filter((m) => m.fatigue >= 0.2).sort((a, b) => b.fatigue - a.fatigue)
  const heat = Object.fromEntries(Object.values(rec).map((m) => [m.id, m.fatigue])) as Partial<Record<MuscleId, number>>
  const clash = todayPrimary.map((m) => rec[m]).filter((m) => m && m.state === 'fatigued')
  const freshToday = todayPrimary.filter((m) => rec[m]?.state === 'fresh').length
  return (
    <Card className="mt-3" data-testid="recovery-card">
      <div className="flex items-center justify-between"><div className="text-[12px] uppercase tracking-widest text-mute font-semibold">Muscle recovery</div>
        <div className="flex gap-2 text-[11px]"><span className={TONE.fresh}>● Fresh</span><span className={TONE.recovering}>● Recovering</span><span className={TONE.fatigued}>● Fatigued</span></div></div>
      <div className="flex items-center gap-3 mt-2">
        <BodyMap both heat={heat} heatFill="#ff6b00" height={150} info />
        <div className="flex-1 min-w-0 space-y-1.5">
          {list.length === 0 ? <p className="text-[13px] text-mute">Everything is fresh. Go hit it hard.</p> : list.slice(0, 6).map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-2 text-[13px]">
              <span className={cx('truncate', TONE[m.state])}>{MUSCLE_INFO[m.id].name}</span>
              <span className="text-mute num whitespace-nowrap">{m.readyInH > 0 ? `${m.readyInH} h` : 'ready'}</span>
            </div>))}
        </div>
      </div>
      {todayPrimary.length > 0 && <div className={cx('mt-3 rounded-2xl border px-3 py-2 text-[13px]', clash.length ? 'border-warn/40 bg-warn/10' : 'border-a1/30 bg-a1/10')}>
        {clash.length
          ? <>Still sore from last time: <b>{clash.map((m) => MUSCLE_INFO[m!.id].name).join(', ')}</b>. Do an extra warm-up set and leave 1 more rep in reserve on those.</>
          : <>Today’s muscles are {freshToday === todayPrimary.length ? 'all fresh' : 'mostly recovered'}. Push for a rep or weight PR.</>}
      </div>}
    </Card>
  )
}
