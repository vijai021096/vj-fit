import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowDown, ArrowLeft, ArrowUp, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useStore, usePerson } from '../store'
import { NAME, WD_LABEL, WEEKDAYS, type Block, type Lift, type SessionDef, type Weekday } from '../types'
import { EXERCISES, exName } from '../data/exercises'
import { DEFAULT_PROGRAMS, PROGRAMS } from '../engine/program'
import { DEFAULT_PLANS, PLANS } from '../engine/rotation'
import { DEFAULT_STEPS, DEFAULT_WATER_L, waterTarget, stepsTarget } from '../engine/nutrition'
import { editMeals, editProgram, resetContent } from '../lib/content'
import { Btn, Card, Chip, Section, Segmented, Sheet, Stepper, cx } from '../components/ui'

const KINDS: SessionDef['kind'][] = ['upper', 'lower', 'full', 'cardio', 'active', 'rest']
const field = 'w-full bg-s2 rounded-xl px-3 min-h-[44px] text-[15px] border border-line/60'

export function Editor() {
  const person = usePerson()
  const s = useStore()
  const tab = s.overlay?.type === 'editor' ? s.overlay.tab : 'workout'
  const setTab = (t: 'workout' | 'diet') => s.open({ type: 'editor', tab: t })
  useStore((x) => x.contentRev)
  const [confirm, setConfirm] = useState(false)
  const edited = !!s.content[tab === 'workout' ? 'programs' : 'meals'][person]
  return (
    <motion.div className="fixed inset-0 z-50 bg-bg flex flex-col h-dvh-full" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 380, damping: 38 }}>
      <div className="max-w-[520px] w-full mx-auto flex flex-col h-full">
        <div className="safe-t shrink-0 flex items-center gap-2 px-3 py-2">
          <button type="button" aria-label="Back" onClick={() => s.open({ type: 'settings' })} className="w-11 h-11 grid place-items-center rounded-full bg-s2 border border-line/60"><ArrowLeft size={20} /></button>
          <h1 className="display font-semibold text-[20px] flex-1">Edit {NAME[person]}’s plan</h1>
          {edited && <Chip tone="accent">Edited</Chip>}
        </div>
        <div className="px-4 pb-2"><Segmented id="ed-tab" value={tab} onChange={setTab} options={[{ value: 'workout', label: 'Workout' }, { value: 'diet', label: 'Diet' }]} /></div>
        <div className="flex-1 overflow-y-auto px-4 pb-10 no-scrollbar" id="editor-scroll">
          {tab === 'workout' ? <WorkoutEditor /> : <DietEditor />}
          <Section title="Start over">
            <Card>
              <p className="text-[13px] text-mute">Edits sync to both phones. Resetting puts {NAME[person]}’s {tab === 'workout' ? 'workout plan' : 'meal plan'} back to the coach’s version — logged sessions and weights are never touched.</p>
              <Btn kind="danger" className="w-full mt-3" disabled={!edited} onClick={() => setConfirm(true)}><RotateCcw size={18} /> Reset to coach plan</Btn>
            </Card>
          </Section>
        </div>
      </div>
      <Sheet open={confirm} onClose={() => setConfirm(false)} title="Reset to coach plan?">
        <p className="text-[14px] text-mute mb-4">Your changes to {NAME[person]}’s {tab === 'workout' ? 'workouts' : 'meals'} will be removed on every synced phone.</p>
        <div className="space-y-2"><Btn kind="danger" className="w-full" onClick={() => { resetContent(person, tab === 'workout' ? 'programs' : 'meals'); setConfirm(false); s.say('Back to the coach plan') }}>Reset</Btn><Btn kind="soft" className="w-full" onClick={() => setConfirm(false)}>Cancel</Btn></div>
      </Sheet>
    </motion.div>
  )
}

/* ------------------------------ workout ------------------------------ */
const range = (v: [number, number] | undefined, lo: number, hi: number): [number, number] => v ?? [lo, hi]

function LiftEditor({ l, onChange, onPick }: { l: Lift; onChange: (f: (x: Lift) => void) => void; onPick: () => void }) {
  const timed = !!l.hold
  return (
    <div className="space-y-2">
      <button type="button" onClick={onPick} className={cx(field, 'text-left font-medium flex items-center justify-between')}><span className="truncate">{exName(l.ex)}</span><span className="text-[12px] accent-text shrink-0 ml-2">Change</span></button>
      <div className="grid grid-cols-2 gap-2">
        <Stepper label="Sets" tight value={l.sets} min={1} max={8} onChange={(v) => onChange((x) => { x.sets = v })} />
        <Stepper label="Rest (s)" tight value={l.rest} step={15} min={0} max={300} onChange={(v) => onChange((x) => { x.rest = v })} />
        {timed ? <>
          <Stepper label="Hold min (s)" tight value={range(l.hold, 20, 40)[0]} step={5} min={5} max={180} onChange={(v) => onChange((x) => { const h = range(x.hold, 20, 40); x.hold = [v, Math.max(v, h[1])] })} />
          <Stepper label="Hold max (s)" tight value={range(l.hold, 20, 40)[1]} step={5} min={5} max={180} onChange={(v) => onChange((x) => { const h = range(x.hold, 20, 40); x.hold = [Math.min(h[0], v), v] })} />
        </> : <>
          <Stepper label="Reps min" tight value={range(l.reps, 8, 12)[0]} min={1} max={50} onChange={(v) => onChange((x) => { const r = range(x.reps, 8, 12); x.reps = [v, Math.max(v, r[1])] })} />
          <Stepper label="Reps max" tight value={range(l.reps, 8, 12)[1]} min={1} max={50} onChange={(v) => onChange((x) => { const r = range(x.reps, 8, 12); x.reps = [Math.min(r[0], v), v] })} />
        </>}
      </div>
      <input aria-label="Note" className={field} placeholder="Note (optional)" value={l.note ?? ''} onChange={(e) => onChange((x) => { x.note = e.target.value || undefined })} />
    </div>
  )
}

function WorkoutEditor() {
  const person = usePerson()
  const [wd, setWd] = useState<Weekday>('mon')
  const [picker, setPicker] = useState<null | { bi: number; ii?: number; add?: boolean }>(null)
  const [q, setQ] = useState('')
  const def = PROGRAMS[person].days[wd]
  const edit = (fn: (d: SessionDef) => void) => editProgram(person, (p) => fn(p.days[wd]))
  const blockEdit = (bi: number, fn: (b: Block) => void) => edit((d) => fn(d.blocks[bi]))
  const move = (bi: number, dir: -1 | 1) => edit((d) => { const j = bi + dir; if (j < 0 || j >= d.blocks.length) return; [d.blocks[bi], d.blocks[j]] = [d.blocks[j], d.blocks[bi]] })
  const pick = (id: string) => {
    if (!picker) return
    const e = EXERCISES.find((x) => x.id === id)!
    const timed = e.loadType === 'hold'
    const fresh: Lift = { ex: id, sets: 3, rest: 90, ...(timed ? { hold: [20, 40] as [number, number] } : { reps: [8, 12] as [number, number] }) }
    edit((d) => {
      if (picker.add) d.blocks.push({ type: 'lift', ...fresh })
      else {
        const b = d.blocks[picker.bi]
        if (b.type === 'lift') b.ex = id
        else if ((b.type === 'superset' || b.type === 'circuit') && picker.ii != null) (b.items[picker.ii] as { ex: string }).ex = id
        else if (b.type === 'cardio') b.ex = id
      }
    })
    setPicker(null); setQ('')
  }
  const list = EXERCISES.filter((e) => e.name.toLowerCase().includes(q.toLowerCase()))
  const isEdited = JSON.stringify(def) !== JSON.stringify(DEFAULT_PROGRAMS[person].days[wd])

  return (
    <>
      <p className="text-[13px] text-mute mt-1">Edits the Month 1 template. Month 2 and 3 progressions build on it. Weekly sets/reps progression (Learn → Prove) still applies automatically.</p>
      <div className="mt-3 -mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar" role="tablist" aria-label="Day">
        {WEEKDAYS.map((d) => <button key={d} type="button" role="tab" aria-selected={wd === d} onClick={() => setWd(d)} className={cx('shrink-0 min-w-[56px] min-h-[48px] rounded-2xl border text-[14px] font-semibold', wd === d ? 'accent-grad text-[color:var(--on-accent)] border-transparent' : 'bg-s1 border-line/60')}>{WD_LABEL[d]}</button>)}
      </div>
      <Card className="mt-3">
        <label className="text-[12px] uppercase tracking-widest text-mute font-semibold">Session title</label>
        <input aria-label="Session title" className={cx(field, 'mt-1')} value={def.title} onChange={(e) => edit((d) => { d.title = e.target.value })} />
        <div className="grid grid-cols-2 gap-2 mt-3 items-end">
          <div><label className="text-[12px] uppercase tracking-widest text-mute font-semibold">Type</label>
            <select aria-label="Session type" className={cx(field, 'mt-1')} value={def.kind} onChange={(e) => edit((d) => { d.kind = e.target.value as SessionDef['kind'] })}>{KINDS.map((k) => <option key={k} value={k}>{k}</option>)}</select></div>
          <Stepper label="Minutes" tight value={def.minutes} step={5} min={0} max={180} onChange={(v) => edit((d) => { d.minutes = v })} />
        </div>
        <label className="text-[12px] uppercase tracking-widest text-mute font-semibold block mt-3">Coach note</label>
        <input aria-label="Session note" className={cx(field, 'mt-1')} value={def.note ?? ''} placeholder="Shown at the top of the session" onChange={(e) => edit((d) => { d.note = e.target.value || undefined })} />
        {isEdited && <div className="mt-3"><Btn kind="ghost" className="w-full" onClick={() => editProgram(person, (p) => { p.days[wd] = structuredClone(DEFAULT_PROGRAMS[person].days[wd]) })}><RotateCcw size={16} /> Reset {WD_LABEL[wd]} to coach plan</Btn></div>}
      </Card>

      <div className="mt-3 space-y-3">
        {def.blocks.map((b, bi) => (
          <Card key={bi}>
            <div className="flex items-center justify-between mb-2">
              <Chip>{b.type === 'lift' ? 'Exercise' : b.type === 'superset' ? 'Superset' : b.type === 'circuit' ? 'Circuit' : b.type === 'cardio' ? 'Cardio' : 'Mobility'}</Chip>
              <div className="flex gap-1">
                <button type="button" aria-label="Move up" disabled={bi === 0} onClick={() => move(bi, -1)} className="w-11 h-11 grid place-items-center rounded-xl bg-s2 disabled:opacity-30"><ArrowUp size={18} /></button>
                <button type="button" aria-label="Move down" disabled={bi === def.blocks.length - 1} onClick={() => move(bi, 1)} className="w-11 h-11 grid place-items-center rounded-xl bg-s2 disabled:opacity-30"><ArrowDown size={18} /></button>
                <button type="button" aria-label="Remove" onClick={() => edit((d) => { d.blocks.splice(bi, 1) })} className="w-11 h-11 grid place-items-center rounded-xl bg-s2 text-bad"><Trash2 size={18} /></button>
              </div>
            </div>
            {b.type === 'lift' && <LiftEditor l={b} onPick={() => setPicker({ bi })} onChange={(f) => blockEdit(bi, (x) => f(x as Lift))} />}
            {b.type === 'superset' && <div className="space-y-4">
              {b.items.map((it, ii) => <div key={ii}><div className="text-[12px] text-mute mb-1">{String.fromCharCode(65 + bi)}{ii + 1}</div><LiftEditor l={it} onPick={() => setPicker({ bi, ii })} onChange={(f) => blockEdit(bi, (x) => f((x as Extract<Block, { type: 'superset' }>).items[ii]))} /></div>)}
              <Stepper label="Rest after pair (s)" tight value={b.rest} step={15} min={0} max={300} onChange={(v) => blockEdit(bi, (x) => { (x as typeof b).rest = v })} />
            </div>}
            {b.type === 'circuit' && <div className="space-y-2">
              {b.items.map((it, ii) => <button key={ii} type="button" onClick={() => setPicker({ bi, ii })} className={cx(field, 'text-left flex justify-between')}><span className="truncate">{exName(it.ex)}{it.reps ? ` · ${it.reps} reps` : it.hold ? ` · ${it.hold}s` : ''}</span><span className="text-[12px] accent-text">Change</span></button>)}
              <div className="grid grid-cols-2 gap-2"><Stepper label="Rounds" tight value={b.rounds} min={1} max={8} onChange={(v) => blockEdit(bi, (x) => { (x as typeof b).rounds = v })} /><Stepper label="Rest (s)" tight value={b.rest} step={15} min={0} max={300} onChange={(v) => blockEdit(bi, (x) => { (x as typeof b).rest = v })} /></div>
            </div>}
            {(b.type === 'cardio' || b.type === 'mobility') && <div className="space-y-2">
              {b.type === 'cardio' && <button type="button" onClick={() => setPicker({ bi })} className={cx(field, 'text-left flex justify-between')}><span className="truncate">{exName(b.ex)}</span><span className="text-[12px] accent-text">Change</span></button>}
              <input aria-label="Label" className={field} value={b.label} onChange={(e) => blockEdit(bi, (x) => { (x as typeof b).label = e.target.value })} />
              <Stepper label="Minutes" tight value={b.minutes} min={1} max={90} onChange={(v) => blockEdit(bi, (x) => { (x as typeof b).minutes = v; if (x.type === 'cardio') delete x.minutesByWeek })} />
            </div>}
          </Card>
        ))}
        {def.blocks.length === 0 && <p className="text-[14px] text-mute text-center py-4">No exercises on this day.</p>}
        <Btn kind="soft" className="w-full" onClick={() => setPicker({ bi: -1, add: true })}><Plus size={18} /> Add exercise</Btn>
      </div>

      <Sheet open={!!picker} onClose={() => { setPicker(null); setQ('') }} title="Choose exercise" full>
        <input aria-label="Search exercises" autoFocus className={cx(field, 'mb-3')} placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
        <ul className="divide-y divide-line/50">{list.map((e) => <li key={e.id}><button type="button" onClick={() => pick(e.id)} className="w-full min-h-[52px] text-left flex flex-col justify-center"><span className="font-medium text-[15px]">{e.name}</span><span className="text-[12px] text-mute">{e.equipment.join(', ')}</span></button></li>)}</ul>
      </Sheet>
    </>
  )
}

/* -------------------------------- diet -------------------------------- */
function DietEditor() {
  const person = usePerson()
  const p = useStore((s) => s.profiles[person])
  const setP = (fn: (x: typeof p) => void) => useStore.getState().set((x) => { fn(x.profiles[person]) })
  const plan = PLANS[person]
  const [slotId, setSlotId] = useState(plan.slots[0].id)
  const slot = plan.slots.find((s) => s.id === slotId) ?? plan.slots[0]
  const defSlot = DEFAULT_PLANS[person].slots.find((s) => s.id === slot.id)
  const editSlot = (fn: (s: typeof slot) => void) => editMeals(person, (m) => fn(m.slots.find((s) => s.id === slot.id)!))
  return (
    <>
      <Section title="Daily targets" className="!mt-2">
        <Card>
          <div className="grid grid-cols-3 gap-2">
            <Stepper label="Water (L)" tight value={waterTarget(person, p)} step={0.25} min={1} max={6} onChange={(v) => setP((x) => { x.waterL = v })} />
            <Stepper label="Steps" tight value={stepsTarget(person, p)} step={500} min={2000} max={20000} onChange={(v) => setP((x) => { x.stepsTarget = v })} />
            <Stepper label="Protein g/kg" tight value={p.proteinPerKg ?? 1.9} step={0.1} min={1.2} max={2.6} onChange={(v) => setP((x) => { x.proteinPerKg = Math.round(v * 10) / 10 })} />
          </div>
          <p className="text-[12px] text-mute mt-2">Calories still come from your stats and goal (see Settings). Coach defaults: {DEFAULT_WATER_L[person]} L, {DEFAULT_STEPS[person].toLocaleString('en-IN')} steps, 1.9 g/kg.</p>
        </Card>
      </Section>
      <Section title="Meals">
        <div className="-mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar" role="tablist" aria-label="Meal slot">
          {plan.slots.map((s) => <button key={s.id} type="button" role="tab" aria-selected={slot.id === s.id} onClick={() => setSlotId(s.id)} className={cx('shrink-0 px-4 min-h-[44px] rounded-2xl border text-[14px] font-semibold', slot.id === s.id ? 'accent-grad text-[color:var(--on-accent)] border-transparent' : 'bg-s1 border-line/60')}>{s.label}</button>)}
        </div>
        <p className="text-[12px] text-mute mt-2">Options rotate through the week. Adding or removing options reshuffles which one lands on which day. Egg meals are hidden in Veg mode.</p>
        <div className="mt-3 space-y-3">
          {slot.options.map((o, oi) => {
            const base = defSlot?.options.find((x) => x.id === o.id)
            return (
              <Card key={o.id}>
                <textarea aria-label="Meal name" rows={2} className={cx(field, 'py-2 resize-none')} value={o.name} onChange={(e) => editSlot((s) => { s.options[oi].name = e.target.value })} />
                {o.carb && <div className="text-[11px] text-mute mt-1">{'{c}'} is replaced by the scaled {o.carb.unit} portion.</div>}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Stepper label="kcal" tight value={o.kcal} step={10} min={0} max={1500} onChange={(v) => editSlot((s) => { s.options[oi].kcal = v })} />
                  <Stepper label="Protein g" tight value={o.protein} min={0} max={100} onChange={(v) => editSlot((s) => { s.options[oi].protein = v })} />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex gap-1.5">{o.egg && <Chip>egg</Chip>}{!base && <Chip tone="accent">yours</Chip>}</div>
                  <button type="button" aria-label={`Remove ${o.name}`} disabled={slot.options.length <= 1} onClick={() => editSlot((s) => { s.options.splice(oi, 1) })} className="w-11 h-11 grid place-items-center rounded-xl bg-s2 text-bad disabled:opacity-30"><Trash2 size={18} /></button>
                </div>
              </Card>)
          })}
          <Btn kind="soft" className="w-full" onClick={() => editSlot((s) => { s.options.push({ id: `u${Date.now().toString(36)}`, name: 'New meal', kcal: 300, protein: 20, g: '' }) })}><Plus size={18} /> Add a {slot.label.toLowerCase()} option</Btn>
        </div>
      </Section>
    </>
  )
}
