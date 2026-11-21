import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'
import { useStore, usePerson } from '../store'
import { NAME, isCut } from '../types'
import { db, useLive } from '../db'
import { usePosition, useSessions } from '../lib/hooks'
import { movingAvg } from '../engine/nutrition'
import { PROGRAMS } from '../engine/program'
import { allSets } from '../lib/history'
import { exName } from '../data/exercises'
import { Btn, Card, Chip, Section, Segmented } from '../components/ui'

/** End of Week 12: summarise trends, ask Vijai bulk vs cut, then start the next cycle. */
export function Review() {
  const person = usePerson()
  const pos = usePosition()
  const { open, set, say } = useStore.getState()
  const sessions = useSessions() ?? []
  const weights = useLive(() => db.weights.where('person').equals(person).sortBy('date'), [person], [])
  const measures = useLive(() => db.measures.where('person').equals(person).sortBy('date'), [person], [])
  const [softer, setSofter] = useState<'no' | 'yes'>('no')
  const [choice, setChoice] = useState<'bulk' | 'cut'>('bulk')
  const prevCycle = Math.max(1, pos.cycle - 1)
  const mine = sessions.filter((s) => s.cycle === prevCycle && s.finishedAt && s.key !== 'day0')
  const avg = movingAvg(weights)
  const dW = avg.length > 1 ? avg[avg.length - 1].avg - avg[0].avg : null
  const m0 = measures[0], m1 = measures[measures.length - 1]
  const delta = (k: string) => (m0?.v[k] && m1?.v[k] && m0 !== m1 ? m1.v[k] - m0.v[k] : null)
  const waist = delta('waist')
  const ratio = (m?: typeof m0) => (m?.v.shoulders && m?.v.hips ? m.v.shoulders / m.v.hips : null)
  const stars = [...new Set(Object.values(PROGRAMS[person].days).flatMap((d) => d.blocks.flatMap((b) => (b.type === 'lift' && b.star ? [b.ex] : []))))]
  const lifts = stars.map((id) => { const s = allSets(sessions, id); return s.length > 1 ? { id, from: s[0].w, to: Math.max(...s.map((x) => x.w)) } : null }).filter((x): x is { id: string; from: number; to: number } => !!x)
  const recommendCut = person === 'vijai' && ((waist ?? 0) >= 4 || softer === 'yes')
  const fmt = (n: number | null, u: string) => (n === null ? '—' : `${n > 0 ? '+' : ''}${n.toFixed(1)} ${u}`)
  const finish = () => {
    set((s) => { s.flags.reviewDone[person] = pos.cycle; if (person === 'vijai') s.flags.phase = choice })
    say(`Cycle ${pos.cycle} started — your logged weights carry forward.`)
    open(null)
  }
  return (
    <motion.div className="fixed inset-0 z-50 bg-bg flex flex-col h-dvh-full" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 380, damping: 38 }}>
      <div className="max-w-[520px] w-full mx-auto flex flex-col h-full">
        <div className="safe-t shrink-0 flex items-center gap-2 px-3 py-2">
          <button type="button" aria-label="Back" onClick={() => open(null)} className="w-11 h-11 grid place-items-center rounded-full bg-s2 border border-line/60"><ArrowLeft size={20} /></button>
          <h1 className="display font-semibold text-[20px]">Program Review</h1>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-6 no-scrollbar">
          <div className="flex items-center gap-2 accent-text mt-2"><Sparkles size={18} /><span className="text-[13px] uppercase tracking-widest font-semibold">12 weeks</span></div>
          <h2 className="display text-[30px] leading-tight font-semibold">Look how far you’ve come, {NAME[person]}.</h2>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {[['Sessions', `${mine.length} / 60`], ['7-day avg weight', fmt(dW, 'kg')], ['Waist', fmt(waist, 'cm')], ['Chest', fmt(delta('chest'), 'cm')]].map(([l, v]) => (
              <Card key={l} className="!p-3"><div className="text-[12px] uppercase tracking-widest text-mute font-semibold">{l}</div><div className="display text-[24px] font-semibold num accent-grad-text">{v}</div></Card>))}
          </div>
          <Section title="Priority lifts">
            <Card>{lifts.length ? <div className="space-y-2">{lifts.map((l) => <div key={l.id} className="flex items-center justify-between text-[14px]"><span>{exName(l.id)}</span><span className="num"><span className="text-mute">{l.from}</span> → <span className="font-semibold">{l.to} kg</span></span></div>)}</div> : <p className="text-[14px] text-mute">Log your ★ lifts to see them here next time.</p>}</Card>
          </Section>
          {!isCut(person) && <Section title="What next: keep bulking, or cut?">
            <Card>
              <div className="flex items-center justify-between gap-3"><span className="text-[14px]">Do you look visibly softer than when you started?</span><Segmented id="soft" small value={softer} onChange={setSofter} options={[{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }]} /></div>
              <div className="mt-3 rounded-2xl border border-a1/40 bg-a1/10 px-3 py-2.5 text-[14px]">
                {recommendCut ? <>Recommendation: <span className="font-semibold">a 6–8 week cut</span> to reveal your abs{(waist ?? 0) >= 4 ? ` — your waist is up ${waist!.toFixed(1)} cm` : ''}.</> : <>Recommendation: <span className="font-semibold">continue the lean bulk</span> — your waist has stayed in check.</>}
              </div>
              <div className="mt-3 flex justify-center"><Segmented id="phase" value={choice} onChange={setChoice} options={[{ value: 'bulk', label: 'Continue lean bulk' }, { value: 'cut', label: '6–8 week cut' }]} /></div>
              {choice === 'cut' && <p className="text-[12px] text-mute mt-2">Your choice is saved. The coach’s plan doesn’t set cut calories yet, so targets stay as they are until your coach gives you numbers.</p>}
            </Card>
          </Section>}
          <div className="mt-4 flex flex-wrap gap-2"><Chip tone="accent">Cycle {pos.cycle} restarts at Month 1</Chip><Chip>Logged weights carry forward</Chip></div>
        </div>
        <div className="shrink-0 p-4 safe-b glass border-t border-line/60"><Btn className="w-full" onClick={finish}>Start Cycle {pos.cycle} <ArrowRight size={18} /></Btn></div>
      </div>
    </motion.div>
  )
}
