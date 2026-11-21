import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, Award, Camera, Check, ImageOff, LineChart as LC, Lock, Pencil, Ruler, Scale, Trash2 } from 'lucide-react'
import { useStore, usePerson, useWeightHidden } from '../store'
import { NAME, isCut, type Person, type SessionLog } from '../types'
import { SessionEditor } from '../components/SessionEditor'
import { db, dayId, setWeight, useLive, type MeasureRow, type PhotoRow, type WeightRow } from '../db'
import { usePosition, useSessions } from '../lib/hooks'
import { addDays, dateOf, diffDays, fmtDate, week1Start } from '../engine/calendar'
import { movingAvg } from '../engine/nutrition'
import { PROGRAMS } from '../engine/program'
import { allSets } from '../lib/history'
import { EX, exName } from '../data/exercises'
import { Btn, Card, Chip, Empty, Section, Segmented, Sheet, Skeletons, Stepper, cx, item, stagger } from '../components/ui'

const FIELDS: Record<Person, { k: string; label: string }[]> = {
  vijai: [{ k: 'waist', label: 'Waist (at navel)' }, { k: 'chest', label: 'Chest' }, { k: 'arm', label: 'Arm (flexed)' }, { k: 'shoulders', label: 'Shoulders' }],
}
const RATE: Record<Person, [number, number]> = { vijai: isCut('vijai') ? [-0.7, -0.4] : [0.25, 0.35] }
const POSES = ['front', 'side', 'back', 'relaxed'] as const

export function Progress() {
  const person = usePerson()
  const hidden = useWeightHidden(person)
  const pos = usePosition()
  const sessions = useSessions()
  const weights = useLive<WeightRow[] | undefined>(() => db.weights.where('person').equals(person).sortBy('date'), [person], undefined)
  const measures = useLive<MeasureRow[] | undefined>(() => db.measures.where('person').equals(person).sortBy('date'), [person], undefined)
  if (!weights || !measures || !sessions) return <div><h1 className="display text-[30px] font-semibold mb-3">Progress</h1><Skeletons n={4} /></div>
  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <motion.h1 variants={item} className="display text-[30px] font-semibold">Progress</motion.h1>
      <motion.div variants={item}><button type="button" onClick={() => useStore.getState().open({ type: 'insights' })} className="w-full mt-3 card p-4 flex items-center gap-3 text-left min-h-[64px]"><span className="w-11 h-11 rounded-2xl accent-grad grid place-items-center text-[color:var(--on-accent)]"><LC size={20} /></span><span className="flex-1"><span className="block font-semibold text-[16px]">Insights</span><span className="block text-[13px] text-mute">Calories eaten &amp; burnt, workouts, steps — your trends</span></span></button></motion.div>
      <motion.div variants={item}><Headline person={person} weights={weights} measures={measures} /></motion.div>
      <Section title="Weight">{hidden ? <Card><p className="text-[14px] text-mute">{NAME[person]} has chosen to keep their weight private.</p></Card> : <WeightChart person={person} weights={weights} today={pos.date} />}</Section>
      <Section title="Measurements"><Measurements person={person} measures={measures} today={pos.date} /></Section>
      <Section title="Progress photos"><Photos person={person} today={pos.date} weights={weights} /></Section>
      <Section title="★ Lifts"><Lifts person={person} sessions={sessions} /></Section>
      <Section title="Sessions"><Heat sessions={sessions} /><RecentSessions sessions={sessions} /></Section>
      <Section title="Milestones"><Badges person={person} sessions={sessions} weights={weights} /></Section>
    </motion.div>
  )
}

function Headline({ person, weights, measures }: { person: Person; weights: WeightRow[]; measures: MeasureRow[] }) {
  const hidden = useWeightHidden(person)
  const first = measures[0], last = measures[measures.length - 1]
  const ratio = (m?: MeasureRow) => (m?.v.shoulders && m?.v.hips ? m.v.shoulders / m.v.hips : null)
  const avg = movingAvg(weights)
  const dW = avg.length > 1 ? avg[avg.length - 1].avg - avg[0].avg : null
  const dWaist = first && last && first !== last && first.v.waist && last.v.waist ? last.v.waist - first.v.waist : null
  const four = measures.filter((m) => last && diffDays(last.date, m.date) <= 28 && m.v.waist)
  const waist4 = four.length > 1 ? four[four.length - 1].v.waist - four[0].v.waist : 0
  const Tile = ({ label, value, sub }: { label: string; value: string; sub: string }) => (
    <div className="card p-3.5"><div className="text-[12px] uppercase tracking-widest text-mute font-semibold">{label}</div><div className="display text-[28px] font-semibold num accent-grad-text">{value}</div><div className="text-[12px] text-mute">{sub}</div></div>)
  return (
    <div className="mt-3">
      <div className="grid grid-cols-2 gap-2">
        
          <Tile label="7-day average" value={hidden ? 'Hidden' : avg.length ? `${avg[avg.length - 1].avg.toFixed(1)} kg` : '—'} sub={hidden ? 'Private' : dW === null ? 'Log a few weigh-ins' : `${dW >= 0 ? '+' : ''}${dW.toFixed(1)} kg since you started`} />
          <Tile label="Waist" value={last?.v.waist ? `${last.v.waist} cm` : '—'} sub={dWaist === null ? 'Add measurements to track' : `${dWaist > 0 ? '+' : ''}${dWaist.toFixed(1)} cm since you started`} />
        
      </div>
      {!isCut(person) && waist4 > 2 && <div className="mt-2 rounded-2xl border border-warn/40 bg-warn/10 text-warn px-3 py-2.5 text-[14px] flex gap-2"><AlertTriangle size={18} className="shrink-0 mt-0.5" /> Waist is up {waist4.toFixed(1)} cm in 4 weeks — the surplus may be too high.</div>}
    </div>
  )
}

function WeightChart({ person, weights, today }: { person: Person; weights: WeightRow[]; today: string }) {
  const data = useMemo(() => {
    const avg = movingAvg(weights)
    if (!avg.length) return []
    const d0 = avg[0].date, w0 = avg[0].avg
    return avg.map((p) => { const wk = diffDays(p.date, d0) / 7; const a = w0 + RATE[person][0] * wk, b = w0 + RATE[person][1] * wk; return { date: p.date, kg: p.kg, avg: Math.round(p.avg * 100) / 100, band: [Math.min(a, b), Math.max(a, b)] as [number, number] } })
  }, [weights, person])
  if (!weights.length) return <Empty icon={<Scale />} title="No weigh-ins yet" body="Use Quick weigh-in on Today each morning. The trend line appears after a few days." />
  return (
    <Card className="!p-3">
      <div className="h-[220px] -ml-2" role="img" aria-label="Weight chart with 7-day average and target band">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
            <CartesianGrid stroke="rgb(var(--line))" strokeDasharray="3 5" vertical={false} />
            <XAxis dataKey="date" tickFormatter={(d) => fmtDate(d, { day: 'numeric', month: 'short' })} tick={{ fill: 'rgb(var(--mute))', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={28} />
            <YAxis domain={['dataMin - 1', 'dataMax + 1']} tickFormatter={(v: number) => v.toFixed(0)} tick={{ fill: 'rgb(var(--mute))', fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
            <Tooltip contentStyle={{ background: 'rgb(var(--s2))', border: '1px solid rgb(var(--line))', borderRadius: 12, fontSize: 12 }} labelFormatter={(d) => fmtDate(String(d))} formatter={(v, n) => (Array.isArray(v) ? [`${(v[0] as number).toFixed(1)}–${(v[1] as number).toFixed(1)} kg`, 'Target band'] : [`${v} kg`, n === 'avg' ? '7-day avg' : 'Weigh-in'])} />
            <Area dataKey="band" stroke="none" fill="var(--a1c)" fillOpacity={0.14} isAnimationActive={false} />
            <Line dataKey="kg" stroke="rgb(var(--mute))" strokeWidth={1} dot={{ r: 2.5, fill: 'rgb(var(--mute))' }} isAnimationActive={false} />
            <Line dataKey="avg" stroke="var(--a2c)" strokeWidth={3} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-2 mt-2 text-[12px]"><Chip>● Weigh-in</Chip><Chip tone="accent">— 7-day average</Chip><Chip>▒ Target {isCut(person) ? '−0.4–0.7' : '+0.25–0.35'} kg/wk</Chip></div>
      <details className="mt-2"><summary className="text-[13px] text-mute min-h-[40px] flex items-center cursor-pointer">Edit weigh-ins</summary>
        <div className="space-y-1.5 mt-1">{[...weights].reverse().slice(0, 14).map((w) => <div key={w.id} className="flex items-center justify-between text-[14px] num px-1"><span>{fmtDate(w.date)}</span><span>{w.kg} kg</span><button type="button" aria-label={`Delete weigh-in ${w.date}`} className="w-10 h-10 grid place-items-center text-mute" onClick={() => void db.weights.delete(w.id)}><Trash2 size={15} /></button></div>)}
          <AddWeight person={person} today={today} /></div></details>
    </Card>
  )
}
function AddWeight({ person, today }: { person: Person; today: string }) {
  const [date, setDate] = useState(today); const [kg, setKg] = useState(useStore.getState().profiles[person].weightKg)
  return <div className="flex items-center gap-2 pt-2 border-t border-line/50"><input aria-label="Date" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} className="bg-s2 rounded-xl px-2 min-h-[44px] text-[14px] w-[140px]" /><Stepper value={kg} onChange={setKg} step={0.1} min={30} max={200} unit="kg" label="Weight" /><Btn kind="soft" onClick={() => void setWeight(person, date, kg)} label="Add weigh-in"><Check size={16} /></Btn></div>
}

function Measurements({ person, measures, today }: { person: Person; measures: MeasureRow[]; today: string }) {
  const [open, setOpen] = useState(false)
  const last = measures[measures.length - 1], first = measures[0]
  const [v, setV] = useState<Record<string, number>>({})
  useEffect(() => { if (open) setV(Object.fromEntries(FIELDS[person].map((f) => [f.k, last?.v[f.k] ?? 0]))) }, [open]) // eslint-disable-line
  return (
    <>
      {!measures.length ? <Empty icon={<Ruler />} title="No measurements yet" body="A tape measure once a week, same time of day. Takes two minutes." action={<Btn onClick={() => setOpen(true)}>Add measurements</Btn>} /> : (
        <Card>
          <div className="space-y-2">{FIELDS[person].map((f) => {
            const d = last.v[f.k] && first.v[f.k] && first !== last ? last.v[f.k] - first.v[f.k] : null
            return <div key={f.k} className="flex items-center justify-between text-[15px]"><span>{f.label}</span><span className="num"><span className="font-semibold">{last.v[f.k] ? `${last.v[f.k]} cm` : '—'}</span>{d !== null && <span className="text-mute text-[13px]"> ({d > 0 ? '+' : ''}{d.toFixed(1)})</span>}</span></div>
          })}</div>
          <div className="text-[12px] text-mute mt-2">Last: {fmtDate(last.date)} · {measures.length} entr{measures.length === 1 ? 'y' : 'ies'}</div>
          <Btn kind="soft" className="w-full mt-3" onClick={() => setOpen(true)}>Add / update today</Btn>
        </Card>)}
      <Sheet open={open} onClose={() => setOpen(false)} title="Measurements (cm)">
        <div className="space-y-2">{FIELDS[person].map((f) => <div key={f.k} className="flex items-center justify-between rounded-2xl bg-s2 border border-line/60 px-3 py-2"><span className="text-[15px]">{f.label}</span><Stepper value={v[f.k] ?? 0} onChange={(x) => setV({ ...v, [f.k]: x })} step={0.5} max={250} unit="cm" label={f.label} big /></div>)}</div>
        <Btn className="w-full mt-4" onClick={async () => { await db.measures.put({ id: dayId(person, today), person, date: today, v, updatedAt: Date.now() }); setOpen(false) }}><Check size={18} /> Save</Btn>
      </Sheet>
    </>
  )
}

function useBlobUrl(b?: Blob) {
  const [u, setU] = useState<string>()
  useEffect(() => { if (!b) { setU(undefined); return } const x = URL.createObjectURL(b); setU(x); return () => URL.revokeObjectURL(x) }, [b])
  return u
}
function Photos({ person, today, weights }: { person: Person; today: string; weights: WeightRow[] }) {
  const photos = useLive<PhotoRow[]>(() => db.photos.where('person').equals(person).sortBy('date'), [person], [])
  const [pose, setPose] = useState<(typeof POSES)[number]>('front')
  const [cut, setCut] = useState(50)
  const [beforeId, setBeforeId] = useState<string | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const drag = useRef(false)
  const file = useRef<HTMLInputElement>(null)
  const of = photos.filter((p) => p.pose === pose)
  const before = of.find((p) => p.id === beforeId) ?? of[0], after = of.length > 1 ? of[of.length - 1] : undefined
  const bu = useBlobUrl(before?.blob), au = useBlobUrl(after?.blob)
  const kgOn = (date?: string) => { if (!date) return null; let kg: number | null = null; for (const w of weights) { if (w.date <= date) kg = w.kg; else break } return kg }
  const kb = kgOn(before?.date), ka = kgOn(after?.date)
  const days = before && after ? diffDays(after.date, before.date) : 0
  const move = (clientX: number) => { const r = box.current?.getBoundingClientRect(); if (r) setCut(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100))) }
  const add = async (f?: File) => {
    if (!f) return
    const img = await createImageBitmap(f).catch(() => null)
    let blob: Blob = f
    if (img) { const s = Math.min(1, 1280 / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = img.width * s; c.height = img.height * s; c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height); blob = (await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.82))) ?? f }
    await db.photos.put({ id: `${person}|${today}|${pose}`, person, date: today, pose, blob, updatedAt: Date.now() })
  }
  return (
    <Card>
      <div className="flex justify-center"><Segmented id="pose" small value={pose} onChange={(v) => { setPose(v); setBeforeId(null) }} options={POSES.map((p) => ({ value: p, label: p[0].toUpperCase() + p.slice(1) }))} /></div>
      <div ref={box} data-testid="compare" className="relative mt-3 rounded-2xl overflow-hidden bg-s2 aspect-[3/4] grid place-items-center touch-none select-none"
        onPointerDown={(e) => { if (!after) return; drag.current = true; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); move(e.clientX) }}
        onPointerMove={(e) => { if (drag.current) move(e.clientX) }}
        onPointerUp={() => { drag.current = false }} onPointerCancel={() => { drag.current = false }}>
        {!before ? <div className="text-center text-mute px-6"><ImageOff className="mx-auto mb-2" /><div className="text-[14px]">No {pose} photo yet. Same light, same spot each time — then drag to compare.</div></div> : <>
          <img src={au ?? bu} alt={`${pose} — ${after ? 'now' : 'first'}`} className="absolute inset-0 w-full h-full object-cover" />
          {after && <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - cut}% 0 0)` }}><img src={bu} alt={`${pose} — before`} className="absolute inset-0 w-full h-full object-cover" /></div>}
          {after && <div className="absolute top-0 bottom-0 w-[3px] -ml-[1.5px] accent-grad glow pointer-events-none" style={{ left: `${cut}%` }}>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full accent-grad text-[color:var(--on-accent)] grid place-items-center shadow-lg font-bold text-[14px]">⇆</div></div>}
          <div className="absolute left-2 top-2 rounded-xl bg-black/65 px-2.5 py-1.5 text-white pointer-events-none"><div className="font-display caps text-[13px] font-bold tracking-wide">{after ? 'Before' : 'Day 1'}</div><div className="text-[11px] num opacity-80">{fmtDate(before.date, { day: 'numeric', month: 'short', year: '2-digit' })}{kb ? ` · ${kb} kg` : ''}</div></div>
          {after && <div className="absolute right-2 top-2 rounded-xl bg-black/65 px-2.5 py-1.5 text-right pointer-events-none"><div className="font-display caps text-[13px] font-bold tracking-wide accent-text">Now</div><div className="text-[11px] num text-white/80">{fmtDate(after.date, { day: 'numeric', month: 'short', year: '2-digit' })}{ka ? ` · ${ka} kg` : ''}</div></div>}
          {after && <div className="absolute left-1/2 -translate-x-1/2 bottom-2 rounded-full bg-black/70 px-3 py-1.5 text-[12px] text-white num pointer-events-none whitespace-nowrap">{days} days{kb && ka ? ` · ${ka - kb > 0 ? '+' : ''}${(ka - kb).toFixed(1)} kg` : ''}</div>}
        </>}
      </div>
      {of.length > 2 && <div className="mt-2 -mx-1 px-1 flex gap-1.5 overflow-x-auto no-scrollbar" aria-label="Compare from">
        <span className="text-[12px] text-mute self-center shrink-0">Before:</span>
        {of.slice(0, -1).map((p) => <Chip key={p.id} tone={p.id === before?.id ? 'accent' : 'default'} onClick={() => setBeforeId(p.id)}>{fmtDate(p.date, { day: 'numeric', month: 'short' })}</Chip>)}
      </div>}
      {after && <input aria-label="Before / after slider" type="range" min={0} max={100} value={Math.round(cut)} onChange={(e) => setCut(Number(e.target.value))} className="sr-only" />}
      <input ref={file} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { void add(e.target.files?.[0]); e.target.value = '' }} />
      <div className="flex gap-2 mt-3">
        <Btn className="flex-1" onClick={() => file.current?.click()}><Camera size={18} /> Add today’s {pose}</Btn>
        {of.length > 0 && <Btn kind="soft" label="Delete latest photo" onClick={() => void db.photos.delete(of[of.length - 1].id)}><Trash2 size={16} /></Btn>}
      </div>
      <div className="text-[12px] text-mute mt-2 flex items-center gap-1.5"><Lock size={12} /> Stored only on this device. Never uploaded. Take one every 2 weeks.</div>
    </Card>
  )
}

function Lifts({ person, sessions }: { person: Person; sessions: SessionLog[] }) {
  const stars = useMemo(() => {
    const ids = new Set<string>()
    Object.values(PROGRAMS[person].days).forEach((d) => d.blocks.forEach((b) => { if (b.type === 'lift' && b.star) { ids.add(b.ex); if (b.gate?.use.ex) ids.add(b.gate.use.ex) } }))
    Object.values(PROGRAMS[person].months).forEach((m) => Object.entries(m.swap ?? {}).forEach(([from, to]) => { if (ids.has(from) && to.ex) ids.add(to.ex) }))
    return [...ids]
  }, [person])
  const withData = stars.filter((id) => allSets(sessions, id).length)
  const [sel, setSel] = useState<string | null>(null)
  const id = sel && withData.includes(sel) ? sel : withData[0]
  const data = useMemo(() => {
    if (!id) return []
    const by: Record<string, { w: number; r: number }> = {}
    allSets(sessions, id).forEach((s) => { const c = by[s.date]; if (!c || s.w > c.w || (s.w === c.w && s.r > c.r)) by[s.date] = { w: s.w, r: s.r } })
    return Object.entries(by).sort().map(([date, v]) => ({ date, ...v }))
  }, [sessions, id])
  if (!id) return <Empty icon={<LC />} title="No lifts logged yet" body="Your priority lifts chart themselves as soon as you log a session." />
  const assist = EX[id].loadType === 'assist'
  return (
    <Card className="!p-3">
      <div className="-mx-1 px-1 flex gap-2 overflow-x-auto no-scrollbar">{withData.map((x) => <Chip key={x} tone={x === id ? 'accent' : 'default'} onClick={() => setSel(x)}>{exName(x)}</Chip>)}</div>
      <div className="h-[190px] mt-2 -ml-2" role="img" aria-label={`${exName(id)} top set over time`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
            <CartesianGrid stroke="rgb(var(--line))" strokeDasharray="3 5" vertical={false} />
            <XAxis dataKey="date" tickFormatter={(d) => fmtDate(d, { day: 'numeric', month: 'short' })} tick={{ fill: 'rgb(var(--mute))', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={28} />
            <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fill: 'rgb(var(--mute))', fontSize: 11 }} axisLine={false} tickLine={false} width={44} reversed={assist} />
            <Tooltip contentStyle={{ background: 'rgb(var(--s2))', border: '1px solid rgb(var(--line))', borderRadius: 12, fontSize: 12 }} labelFormatter={(d) => fmtDate(String(d))} formatter={(v, _n, p) => [`${v} kg × ${(p.payload as { r: number }).r}`, 'Top set']} />
            <Line dataKey="w" stroke="var(--a2c)" strokeWidth={3} dot={{ r: 3.5, fill: 'var(--a1c)' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="text-[12px] text-mute">{assist ? 'Assistance kg — lower is stronger.' : 'Heaviest completed set each session.'}</div>
    </Card>
  )
}

function RecentSessions({ sessions }: { sessions: SessionLog[] }) {
  const [editId, setEditId] = useState<string | null>(null)
  const recent = sessions.filter((s) => s.finishedAt).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8)
  if (!recent.length) return null
  return (
    <div className="mt-3 space-y-2" data-testid="recent-sessions">
      {recent.map((s) => (
        <button key={s.id} type="button" onClick={() => setEditId(s.id)} aria-label={`Edit ${s.title} on ${fmtDate(s.date)}`} className="w-full card px-4 min-h-[56px] flex items-center justify-between text-left active:opacity-70">
          <span><span className="block font-medium">{s.title}</span><span className="block text-[12px] text-mute">{fmtDate(s.date)}{s.volume ? ` · ${s.volume.toLocaleString('en-IN')} kg` : ''}</span></span>
          <span className="text-[13px] text-mute inline-flex items-center gap-1.5"><Pencil size={14} /> Edit</span>
        </button>))}
      <SessionEditor id={editId} onClose={() => setEditId(null)} />
    </div>
  )
}

function Heat({ sessions }: { sessions: SessionLog[] }) {
  const pos = usePosition()
  const start = useStore((s) => s.settings.programStart)
  const done = new Map(sessions.filter((s) => s.finishedAt).map((s) => [s.date, s]))
  const w1 = addDays(week1Start(start), (pos.cycle - 1) * 84)
  return (
    <Card>
      <div className="grid grid-cols-[auto_repeat(12,minmax(0,1fr))] gap-1 items-center" role="img" aria-label={`${done.size} sessions logged`}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((l, d) => [
          <span key={`l${d}`} className="text-[10px] text-mute pr-1">{l}</span>,
          ...Array.from({ length: 12 }, (_, w) => {
            const date = addDays(w1, w * 7 + d), s = done.get(date)
            return <span key={`${w}${d}`} title={`${fmtDate(date)}${s ? ` — ${s.title}` : ''}`} className={cx('aspect-square rounded-[5px]', s ? 'accent-grad' : date === pos.date ? 'bg-s3 ring-1 ring-ink/50' : date < pos.date ? 'bg-s3' : 'bg-s2')} />
          }),
        ])}
      </div>
      <div className="flex justify-between text-[11px] text-mute mt-2"><span>Week 1</span><span>{sessions.filter((s) => s.finishedAt).length} sessions logged</span><span>Week 12</span></div>
    </Card>
  )
}

function Badges({ person, sessions, weights }: { person: Person; sessions: SessionLog[]; weights: WeightRow[] }) {
  const manual = useStore((s) => s.badges[person])
  const set = useStore((s) => s.set)
  const bw = weights[weights.length - 1]?.kg ?? useStore.getState().profiles[person].weightKg
  const days = useLive(() => db.days.where('person').equals(person).sortBy('date'), [person], [])
  const earned = useMemo(() => {
    const e: Record<string, boolean> = {}
    const pu = allSets(sessions, 'assisted-pull-up')
    e['pullup-1'] = pu.some((s) => s.w === 0 && s.r >= 1)
    e['pullup-10'] = pu.some((s) => s.w === 0 && s.r >= 10)
    e['assist-half'] = pu.length > 1 && pu[0].w > 0 && pu.some((s) => s.w <= pu[0].w / 2)
    e['bench-bw5'] = allSets(sessions, 'bb-bench-press').some((s) => s.w >= bw && s.r >= 5)
    const minAvg = movingAvg(weights).reduce((m, x) => Math.min(m, x.avg), Infinity)
    e['kg-82'] = minAvg < 82
    e['kg-77'] = minAvg <= 77
    e['bench-bw'] = e['bench-bw5']
    e['squat-125'] = allSets(sessions, 'back-squat').some((s) => s.w >= 1.25 * bw && s.r >= 5)
    const weeks = new Map<string, number>()
    sessions.filter((s) => s.finishedAt && s.key !== 'day0').forEach((s) => weeks.set(`${s.cycle}|${s.weekIndex}`, (weeks.get(`${s.cycle}|${s.weekIndex}`) ?? 0) + 1))
    e['streak-12'] = [1, 2, 3].some((c) => Array.from({ length: 12 }, (_, i) => weeks.get(`${c}|${i + 1}`) ?? 0).every((n) => n >= 4))
    let run = 0, best = 0, prev = ''
    days.forEach((d) => { if (d.steps >= 8000) { run = prev && diffDays(d.date, prev) === 1 ? run + 1 : 1; best = Math.max(best, run) } else run = 0; prev = d.date })
    e['steps-30'] = best >= 30
    return e
  }, [sessions, bw, days])
  return (
    <div className="grid grid-cols-2 gap-2">
      {PROGRAMS[person].milestones.map((m) => {
        const on = earned[m.id] || !!manual[m.id]
        return (
          <button key={m.id} type="button" aria-pressed={on} onClick={() => set((s) => { if (s.badges[person][m.id]) delete s.badges[person][m.id]; else s.badges[person][m.id] = new Date().toISOString().slice(0, 10) })}
            className={cx('card p-3 text-left min-h-[92px]', on ? 'border-a1/50' : 'opacity-70')}>
            <div className={cx('w-9 h-9 rounded-xl grid place-items-center', on ? 'accent-grad text-[color:var(--on-accent)]' : 'bg-s2 text-mute')}><Award size={18} /></div>
            <div className="text-[13px] font-medium mt-2 leading-snug">{m.label}</div>
            <div className="text-[11px] text-mute">{on ? 'Earned' : 'Tap to mark it yourself'}</div>
          </button>)
      })}
      <p className="col-span-2 text-[12px] text-mute px-1">Most badges unlock from your logs. “12-week streak” needs at least 4 sessions in each of the 12 weeks.</p>
    </div>
  )
}
