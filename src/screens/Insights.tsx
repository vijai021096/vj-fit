import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Dumbbell, Flame, Footprints, Utensils } from 'lucide-react'
import { Bar, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore, usePerson } from '../store'
import { NAME, PEOPLE, type Person } from '../types'
import { db, useLive, type DayRow, type WeightRow } from '../db'
import { usePosition } from '../lib/hooks'
import { fmtDate } from '../engine/calendar'
import { targets, stepsTarget } from '../engine/nutrition'
import { balanceTone, dayStats, narrate, rangeDates, summarize, type DayStat, type Summary } from '../lib/insights'
import { Card, Section, Segmented, Skeletons, cx } from '../components/ui'
import type { SessionLog } from '../types'

type Range = '7' | '30' | '90'
const tip = { background: 'rgb(var(--s2))', border: '1px solid rgb(var(--line))', borderRadius: 12, fontSize: 12 }
const axis = { fill: 'rgb(var(--mute))', fontSize: 11 }

function usePersonData(person: Person) {
  const days = useLive<DayRow[] | undefined>(() => db.days.where('person').equals(person).toArray(), [person], undefined)
  const sessions = useLive<SessionLog[] | undefined>(() => db.sessions.where('person').equals(person).toArray(), [person], undefined)
  const weights = useLive<WeightRow[] | undefined>(() => db.weights.where('person').equals(person).toArray(), [person], undefined)
  return { days, sessions, weights }
}

function Tile({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub?: string; tone?: 'good' | 'warn' }) {
  return (
    <div className="card p-3.5">
      <div className="flex items-center gap-2 text-[12px] uppercase tracking-widest text-mute font-semibold"><span className="accent-text">{icon}</span>{label}</div>
      <div className={cx('display text-[26px] font-semibold num mt-1', tone === 'good' && 'text-ok', tone === 'warn' && 'text-warn')}>{value}</div>
      {sub && <div className="text-[12px] text-mute">{sub}</div>}
    </div>
  )
}

function useStats(person: Person, n: number) {
  const pos = usePosition()
  const profile = useStore((s) => s.profiles[person])
  const settings = useStore((s) => s.settings)
  useStore((s) => s.contentRev)
  const { days, sessions, weights } = usePersonData(person)
  return useMemo(() => {
    if (!days || !sessions || !weights) return null
    const stats = dayStats(person, rangeDates(pos.date, n), days, sessions, weights, profile, settings)
    return { stats, sum: summarize(stats), target: targets(person, profile) }
  }, [days, sessions, weights, person, n, pos.date, profile, settings, useStore.getState().contentRev]) // eslint-disable-line
}

export function Insights() {
  const me = usePerson()
  const s = useStore()
  const [who, setWho] = useState<Person>(me)
  const [range, setRange] = useState<Range>('7')
  const n = Number(range)
  const a = useStats(who, n)
  const other = PEOPLE.find((p) => p !== who)!
  const b = useStats(other, n)
  const profile = s.profiles[who]
  const notes = useMemo(() => (a ? narrate(who, a.stats, a.sum, a.target, stepsTarget(who, profile)) : []), [a, who, profile])
  const chart = useMemo(() => (a?.stats ?? []).map((d: DayStat) => ({ date: d.date, eaten: d.eaten || null, burn: d.logged ? d.burn : null, workout: d.workoutBurn + d.stepBurn })), [a])
  const weekly = useMemo(() => {
    const out: { label: string; workouts: number; minutes: number }[] = []
    for (let i = 0; i < (a?.stats.length ?? 0); i += 7) {
      const w = a!.stats.slice(i, i + 7)
      out.push({ label: fmtDate(w[0].date, { day: 'numeric', month: 'short' }), workouts: w.reduce((x, d) => x + d.sessions, 0), minutes: w.reduce((x, d) => x + d.minutes, 0) })
    }
    return out
  }, [a])

  return (
    <motion.div className="fixed inset-0 z-50 bg-bg flex flex-col h-dvh-full" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 380, damping: 38 }}>
      <div className="max-w-[520px] w-full mx-auto flex flex-col h-full">
        <div className="safe-t shrink-0 flex items-center gap-2 px-3 py-2">
          <button type="button" aria-label="Back" onClick={() => s.open(null)} className="w-11 h-11 grid place-items-center rounded-full bg-s2 border border-line/60"><ArrowLeft size={20} /></button>
          <h1 className="display font-semibold text-[22px] flex-1">Insights</h1>
        </div>
        <div className="px-4 pb-2 flex items-center justify-between gap-2">
          <Segmented id="ins-who" small value={who} onChange={setWho} options={PEOPLE.map((p) => ({ value: p, label: NAME[p] }))} />
          <Segmented id="ins-range" small value={range} onChange={setRange} options={[{ value: '7', label: '7d' }, { value: '30', label: '30d' }, { value: '90', label: '90d' }]} />
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-10 no-scrollbar" id="insights-scroll">
          {!a ? <Skeletons n={4} /> : (
            <>
              {a.sum.daysLogged === 0 && <Card className="mt-2"><p className="text-[14px] text-mute">Nothing logged in the last {n} days for {NAME[who]} yet. Tick meals, add water and steps, and finish a workout — this fills in by itself.</p></Card>}
              {notes.length > 0 && <Card className="mt-2" data-testid="summary">
                <div className="text-[12px] uppercase tracking-widest text-mute font-semibold">Last {n} days, in plain words</div>
                <ul className="mt-2 space-y-2">{notes.map((x) => <li key={x.text} className="flex gap-2 text-[14px]"><span aria-hidden className={cx('mt-[7px] w-2 h-2 rounded-full shrink-0', x.tone === 'good' ? 'bg-ok' : x.tone === 'warn' ? 'bg-warn' : 'bg-mute')} /><span><span className="sr-only">{x.tone === 'good' ? 'Good: ' : x.tone === 'warn' ? 'Needs attention: ' : ''}</span>{x.text}</span></li>)}</ul>
              </Card>}
              <div className="grid grid-cols-2 gap-3 mt-3" data-testid="insight-tiles">
                <Tile icon={<Utensils size={14} />} label="Eaten / day" value={a.sum.avgEaten ? `${a.sum.avgEaten.toLocaleString('en-IN')}` : '—'} sub={`target ${a.target.kcal.toLocaleString('en-IN')} kcal`} />
                <Tile icon={<Flame size={14} />} label="Burnt / day" value={a.sum.avgBurn ? a.sum.avgBurn.toLocaleString('en-IN') : '—'} sub="estimate, kcal" />
                <Tile icon={<Dumbbell size={14} />} label="Workouts" value={String(a.sum.workouts)} sub={`${a.sum.minutes} min · ${a.sum.volume.toLocaleString('en-IN')} kg lifted`} />
                <Tile icon={<Footprints size={14} />} label="Steps / day" value={a.sum.avgSteps ? a.sum.avgSteps.toLocaleString('en-IN') : '—'} sub={`target ${stepsTarget(who, profile).toLocaleString('en-IN')}`} tone={a.sum.avgSteps >= stepsTarget(who, profile) ? 'good' : undefined} />
              </div>
              <Card className="mt-3">
                <div className="flex items-center justify-between"><span className="text-[13px] text-mute">Daily balance (eaten − burnt)</span><span className={cx('num font-semibold whitespace-nowrap', balanceTone(who, a.sum.net) === 'good' && 'text-ok', balanceTone(who, a.sum.net) === 'warn' && 'text-warn')} data-testid="net">{a.sum.net == null ? '—' : `${a.sum.net > 0 ? '+' : ''}${a.sum.net} kcal`}</span></div>
                <div className="flex items-center justify-between mt-1"><span className="text-[13px] text-mute">Protein / day</span><span className="num font-semibold">{a.sum.avgProtein ? `${a.sum.avgProtein} g` : '—'} <span className="text-mute font-normal">of {a.target.protein} g</span></span></div>
                <div className="flex items-center justify-between mt-1"><span className="text-[13px] text-mute">Water / day</span><span className="num font-semibold">{a.sum.avgWater ? `${a.sum.avgWater} L` : '—'}</span></div>
              </Card>

              <Section title="Calories: eaten vs burnt">
                <Card className="!p-2">
                  <div className="h-[220px]" role="img" aria-label="Daily calories eaten and burnt">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chart} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                        <CartesianGrid stroke="rgb(var(--line))" strokeDasharray="3 5" vertical={false} />
                        <XAxis dataKey="date" tickFormatter={(d) => fmtDate(d, { day: 'numeric', month: 'short' })} tick={axis} axisLine={false} tickLine={false} minTickGap={24} />
                        <YAxis tick={axis} axisLine={false} tickLine={false} width={44} />
                        <Tooltip contentStyle={tip} labelFormatter={(d) => fmtDate(String(d))} formatter={(v, nme) => [`${v} kcal`, nme === 'eaten' ? 'Eaten' : 'Burnt (est.)']} />
                        <Bar dataKey="eaten" fill="var(--a1c)" radius={[6, 6, 0, 0]} isAnimationActive={false}>{chart.map((d) => <Cell key={d.date} fill={d.eaten && (who === 'vikas' ? d.eaten >= a.target.kcal * 0.92 : d.eaten <= a.target.kcal * 1.08) ? 'var(--a1c)' : 'rgb(var(--warn))'} />)}</Bar>
                        <ReferenceLine y={a.target.kcal} stroke="rgb(var(--mute))" strokeDasharray="4 4" />
                        <Line dataKey="burn" stroke="var(--a2c)" strokeWidth={3} dot={false} isAnimationActive={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex gap-4 justify-center text-[12px] text-mute pb-1"><span><i className="inline-block w-3 h-3 rounded-sm mr-1 align-[-1px]" style={{ background: 'var(--a1c)' }} />Eaten</span><span><i className="inline-block w-3 h-[3px] mr-1 align-middle" style={{ background: 'var(--a2c)' }} />Burnt (est.)</span><span><i className="inline-block w-3 h-3 rounded-sm mr-1 align-[-1px] bg-warn" />Off target</span><span>┈ Target</span></div>
                </Card>
                <p className="text-[12px] text-mute mt-2">Eaten = meals you ticked off, at your scaled portions. Balance only counts days with food logged. Burnt = resting + daily living (BMR × 1.2) + steps + logged workouts. These are estimates for spotting trends, not exact numbers.</p>
              </Section>

              <Section title="Workouts per week">
                <Card className="!p-2">
                  <div className="h-[160px]" role="img" aria-label="Workouts per week">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={weekly} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid stroke="rgb(var(--line))" strokeDasharray="3 5" vertical={false} />
                        <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={axis} axisLine={false} tickLine={false} width={40} />
                        <Tooltip contentStyle={tip} formatter={(v, nme) => [nme === 'workouts' ? `${v} sessions` : `${v} min`, nme === 'workouts' ? 'Workouts' : 'Time']} />
                        <Bar dataKey="workouts" fill="var(--a1c)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </Section>

              {b && (
                <Section title="Side by side">
                  <Card>
                    <table className="w-full text-[14px]" data-testid="compare">
                      <thead><tr className="text-mute text-[12px] uppercase tracking-widest"><th className="text-left font-semibold pb-2"> </th><th className="text-right font-semibold pb-2">{NAME[who]}</th><th className="text-right font-semibold pb-2">{NAME[other]}</th></tr></thead>
                      <tbody className="num">
                        {rows(a.sum, b.sum).map(([l, x, y]) => <tr key={l} className="border-t border-line/50"><td className="py-2 text-mute">{l}</td><td className="py-2 text-right font-semibold">{x}</td><td className="py-2 text-right font-semibold">{y}</td></tr>)}
                      </tbody>
                    </table>
                  </Card>
                </Section>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}

const f = (n: number, unit = '') => (n ? `${n.toLocaleString('en-IN')}${unit}` : '—')
const rows = (a: Summary, b: Summary): [string, string, string][] => [
  ['Days logged', String(a.daysLogged), String(b.daysLogged)],
  ['Eaten / day', f(a.avgEaten), f(b.avgEaten)],
  ['Burnt / day', f(a.avgBurn), f(b.avgBurn)],
  ['Protein / day', f(a.avgProtein, ' g'), f(b.avgProtein, ' g')],
  ['Workouts', String(a.workouts), String(b.workouts)],
  ['Steps / day', f(a.avgSteps), f(b.avgSteps)],
]
