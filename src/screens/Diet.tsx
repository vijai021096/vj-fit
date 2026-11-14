import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, GlassWater, Pill, Plus, Repeat, Send, ShoppingBasket, Trash2 } from 'lucide-react'
import type { MealOption } from '../data/meals.types'
import { useStore, usePerson } from '../store'
import { NAME, PEOPLE, WD_LABEL, WEEKDAYS } from '../types'
import { patchDay, type Extra } from '../db'
import { useNow, usePosition } from '../lib/hooks'
import { GLASS, dayIndex, useDay, useMenu } from './Today'
import { WEEK_THEMES, WHEY_CAP, optionById, swapOptions } from '../engine/rotation'
import { fmtMin, mealName, waterTarget } from '../engine/nutrition'
import { groceryList, groceryText } from '../engine/grocery'
import { istMinutes } from '../engine/calendar'
import { Bar, Btn, Card, Chip, Section, Segmented, Sheet, Stepper, cx, item, stagger } from '../components/ui'
import { extrasOf } from '../lib/insights'


export function Diet() {
  const person = usePerson()
  const pos = usePosition()
  const d = useNow(30000)
  const profile = useStore((s) => s.profiles[person])
  const creatine = useStore((s) => s.settings.creatine)
  const say = useStore((s) => s.say)
  const todayW = pos.phase === 'program' ? pos.weekInMonth : 1
  const todayD = pos.phase === 'program' ? dayIndex(pos.weekday) : 6
  const [tab, setTab] = useState<'meals' | 'grocery'>('meals')
  const [week, setWeek] = useState<number>(todayW)
  const [dIdx, setDIdx] = useState(todayD)
  const [preview, setPreview] = useState<Record<string, string>>({})
  const isToday = week === todayW && dIdx === todayD
  const day = useDay(person, pos.date)
  const swaps = isToday ? day.swaps : preview
  const menu = useMenu(person, week, dIdx, swaps)
  const mins = istMinutes(d)
  const ex = extrasOf(day)
  const [addOpen, setAddOpen] = useState(false)
  const eatenK = isToday ? menu.chosen.reduce((n, c) => n + (day.eaten[c.slot] ? menu.scaled.kcal[c.slot] ?? 0 : 0), 0) + ex.kcal : 0
  const eatenP = isToday ? menu.chosen.reduce((n, c) => n + (day.eaten[c.slot] ? menu.scaled.protein[c.slot] ?? 0 : 0), 0) + ex.protein : 0
  const nextSlot = isToday ? menu.plan.slots.map((s) => ({ id: s.id, at: menu.times[s.id] ?? 0 })).filter((x) => !day.eaten[x.id] && x.at >= mins - 45).sort((a, b) => a.at - b.at)[0]?.id : null
  const glasses = Math.round(waterTarget(person, profile) / GLASS)

  const [swapSlot, setSwapSlot] = useState<string | null>(null)
  const [photoOpt, setPhotoOpt] = useState<MealOption | null>(null)
  const applySwap = (slotId: string, optId: string) => {
    if (isToday) void patchDay(person, pos.date, (x) => { x.swaps[slotId] = optId })
    else setPreview({ ...preview, [slotId]: optId })
    setSwapSlot(null)
  }
  const swapView = (() => {
    if (!swapSlot) return null
    const slot = menu.plan.slots.find((s) => s.id === swapSlot)
    const cur = menu.chosen.find((c) => c.slot === swapSlot)?.option
    if (!slot || !cur) return null
    const { strict, loose } = swapOptions(slot, cur.id, profile.veg)
    const scoopsElsewhere = menu.chosen.filter((c) => c.slot !== swapSlot).reduce((n, c) => n + (c.option.whey ?? 0), 0)
    const okWhey = (o: MealOption) => scoopsElsewhere + (o.whey ?? 0) <= WHEY_CAP
    return { slot, cur, strict: strict.filter(okWhey), loose: loose.filter(okWhey) }
  })()

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <motion.div variants={item} className="flex items-end justify-between">
        <h1 className="display text-[30px] font-semibold">Diet</h1>
        <Segmented id="diet-tab" small value={tab} onChange={setTab} options={[{ value: 'meals', label: 'Meals' }, { value: 'grocery', label: 'Grocery' }]} />
      </motion.div>

      {tab === 'meals' ? <>
        <motion.div variants={item}><Card className="mt-3 space-y-3">
          <Bar label="Calories" value={Math.round(eatenK)} max={menu.t.kcal} unit=" kcal" />
          <Bar label="Protein" value={Math.round(eatenP)} max={menu.t.protein} unit=" g" />
          <div className="flex flex-wrap gap-2 text-[12px]">
            <Chip>Plan ≈ {menu.scaled.totalKcal.toLocaleString('en-IN')} kcal</Chip><Chip>≈ {menu.scaled.totalProtein} g protein</Chip><Chip>Fat ≈ {menu.t.fat} g</Chip><Chip>Carbs ≈ {menu.t.carbs} g</Chip>
            {menu.t.floored && <Chip tone="warn">At the 1,350 kcal floor</Chip>}
          </div>
        </Card></motion.div>

        <motion.div variants={item} className="mt-3 grid grid-cols-4 gap-1.5" role="tablist" aria-label="Menu week">
          {[1, 2, 3, 4].map((w) => (
            <button key={w} role="tab" aria-selected={week === w} type="button" onClick={() => { setWeek(w); setPreview({}) }} className={cx('min-h-[52px] rounded-2xl border', week === w ? 'border-a1/60 bg-a1/15' : 'border-line/60 bg-s1')}>
              <div className={cx('text-[13px] font-semibold', week === w && 'accent-text')}>W{w}{w === todayW ? ' •' : ''}</div><div className="text-[10.5px] text-mute">{WEEK_THEMES[w - 1]}</div>
            </button>))}
        </motion.div>
        <motion.div variants={item} className="mt-2 grid grid-cols-7 gap-1" role="tablist" aria-label="Day">
          {WEEKDAYS.map((wd, i) => (
            <button key={wd} role="tab" aria-selected={dIdx === i} type="button" onClick={() => { setDIdx(i); setPreview({}) }} className={cx('min-h-[44px] rounded-xl text-[13px] font-semibold border', dIdx === i ? 'accent-grad text-[#08080c] border-transparent' : 'bg-s1 border-line/60 text-mute')}>{WD_LABEL[wd][0]}{WD_LABEL[wd][1]}{week === todayW && i === todayD && dIdx !== i ? '•' : ''}</button>))}
        </motion.div>
        {!isToday && <motion.p variants={item} className="text-[12px] text-mute mt-2 px-1">Preview — you can tick meals on today’s menu. <button type="button" className="underline accent-text min-h-[32px]" onClick={() => { setWeek(todayW); setDIdx(todayD) }}>Back to today</button></motion.p>}

        <div className="mt-3 space-y-2">
          {menu.plan.slots.map((s) => {
            const c = menu.chosen.find((x) => x.slot === s.id)!
            const eaten = isToday && !!day.eaten[s.id]
            const alt = swapOptions(s, c.option.id, profile.veg)
            const altO = alt.strict[0] ?? alt.loose[0]
            return (
              <motion.div variants={item} key={s.id} layout className={cx('card p-3.5', s.id === nextSlot && 'accent-ring', eaten && 'opacity-70')}>
                <div className="flex items-center gap-2 text-[12px]">
                  <span className="num text-mute">{fmtMin(menu.times[s.id] ?? 0)}</span>
                  <span className="uppercase tracking-widest font-semibold text-mute">{s.label}</span>
                  {s.optional && <span className="text-mute">· optional</span>}
                  {s.id === nextSlot && <Chip tone="accent" className="!py-0.5 ml-auto">Next · {Math.max(0, Math.round((menu.times[s.id] ?? 0) - mins)) < 60 ? `${Math.max(0, Math.round((menu.times[s.id] ?? 0) - mins))} min` : `${Math.floor(((menu.times[s.id] ?? 0) - mins) / 60)} h ${Math.round((menu.times[s.id] ?? 0) - mins) % 60} min`}</Chip>}
                </div>
                <div className="flex items-start gap-3 mt-1.5">
                  <MealThumb opt={c.option} onOpen={() => setPhotoOpt(c.option)} />
                  <div className="flex-1 min-w-0">
                    <div className={cx('text-[15px] font-medium', eaten && 'line-through')}>{mealName(c.option, menu.scaled.qty[s.id])}</div>
                    <div className="text-[13px] text-mute num mt-0.5">≈ {menu.scaled.kcal[s.id]} kcal · ≈ {menu.scaled.protein[s.id]} g protein{c.option.tag ? ` · ${c.option.tag === 'S' ? 'South' : 'North'}` : ''}</div>
                    {altO && <div className="text-[12px] text-mute mt-1.5"><span className="font-semibold">Alt:</span> {mealName(altO)} <span className="num">(≈ {altO.kcal}/{altO.protein})</span></div>}
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {isToday && <motion.button whileTap={{ scale: 0.86 }} type="button" aria-pressed={eaten} aria-label={eaten ? `${s.label} eaten — tap to undo` : `Mark ${s.label} as eaten`} onClick={() => void patchDay(person, pos.date, (x) => { x.eaten[s.id] = !x.eaten[s.id] })}
                      className={cx('w-12 h-12 rounded-2xl grid place-items-center border', eaten ? 'accent-grad border-transparent text-[#08080c]' : 'border-line bg-s2')}><Check size={20} strokeWidth={3} /></motion.button>}
                    {s.options.length > 1 && <button type="button" aria-label={`Swap ${s.label}`} onClick={() => setSwapSlot(s.id)} className="w-12 h-12 rounded-2xl grid place-items-center border border-line bg-s2"><Repeat size={18} /></button>}
                  </div>
                </div>
              </motion.div>)
          })}
        </div>

        {isToday && <Section title="Not on the plan" right={<span className="text-[13px] text-mute num">{ex.kcal ? `+${Math.round(ex.kcal)} kcal` : ''}</span>}>
          <Card>
            {(day.extras ?? []).length === 0 && <p className="text-[14px] text-mute">Had a samosa, skipped lunch for a restaurant meal? Add it so the calories and protein stay honest.</p>}
            {(day.extras ?? []).map((e) => (
              <div key={e.id} className="flex items-center gap-2 min-h-[48px] border-b border-line/40 last:border-0" data-testid="extra-row">
                <div className="flex-1 min-w-0"><div className="text-[15px] truncate">{e.label}</div><div className="text-[12px] text-mute num">≈ {e.kcal} kcal · {e.protein} g protein</div></div>
                <button type="button" aria-label={`Remove ${e.label}`} className="w-11 h-11 grid place-items-center text-mute" onClick={() => void patchDay(person, pos.date, (x) => { x.extras = (x.extras ?? []).filter((y) => y.id !== e.id) })}><Trash2 size={16} /></button>
              </div>))}
            <Btn kind="soft" className="w-full mt-2" onClick={() => setAddOpen(true)}><Plus size={18} /> I ate something else</Btn>
          </Card></Section>}
        <Sheet open={!!swapView} onClose={() => setSwapSlot(null)} title={swapView ? `Swap ${swapView.slot.label.toLowerCase()}` : 'Swap'}>
          {swapView && <SwapList cur={swapView.cur} strict={swapView.strict} loose={swapView.loose} onPick={(id) => applySwap(swapView.slot.id, id)} />}
        </Sheet>
        <Sheet open={!!photoOpt} onClose={() => setPhotoOpt(null)} title={photoOpt ? mealName(photoOpt) : ''}>
          {photoOpt && <div>
            <img src={`/media/food/${photoOpt.id}.webp`} alt={mealName(photoOpt)} className="w-full rounded-2xl aspect-video object-cover bg-s2" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
            <div className="text-[14px] text-mute num mt-3">≈ {photoOpt.kcal} kcal · ≈ {photoOpt.protein} g protein at the base portion</div>
            <p className="text-[12px] text-mute mt-1">Photo is a guide to the portion. Your plate is scaled to your target, so the amounts shown on the meal card are the ones to follow.</p>
          </div>}
        </Sheet>
        <AddExtra open={addOpen} onClose={() => setAddOpen(false)} onAdd={(e) => { void patchDay(person, pos.date, (x) => { x.extras = [...(x.extras ?? []), e] }); say(`Added ${e.label}`) }} />

        {isToday && <Section title="Water" right={<span className="text-[13px] text-mute num">{(day.water * GLASS).toFixed(2).replace(/\.?0+$/, '')} / ~{waterTarget(person, profile)} L</span>}>
          <Card><div className="grid grid-cols-7 gap-1.5">{Array.from({ length: glasses }, (_, i) => (
            <button key={i} type="button" aria-label={`Glass ${i + 1} of ${glasses}`} aria-pressed={i < day.water} onClick={() => void patchDay(person, pos.date, (x) => { x.water = x.water === i + 1 ? i : i + 1 })}
              className={cx('h-12 rounded-xl grid place-items-center border', i < day.water ? 'accent-grad text-[#08080c] border-transparent' : 'bg-s2 border-line/60 text-mute')}><GlassWater size={18} /></button>))}</div>
            <div className="text-[12px] text-mute mt-2">One glass ≈ 250 ml.</div></Card></Section>}

        {creatine && isToday && <Section title="Supplements"><Card>
          <button type="button" aria-pressed={!!day.creatine} onClick={() => void patchDay(person, pos.date, (x) => { x.creatine = !x.creatine })} className="w-full flex items-center gap-3 text-left min-h-[48px]">
            <span className={cx('w-10 h-10 rounded-xl grid place-items-center', day.creatine ? 'accent-grad text-[#08080c]' : 'bg-s2 text-mute')}>{day.creatine ? <Check size={18} /> : <Pill size={18} />}</span>
            <span><span className="block font-medium">Creatine monohydrate 3–5 g</span><span className="block text-[12px] text-mute">Any time of day. Optional.</span></span>
          </button>
          <p className="text-[12px] text-mute mt-2">Check with a doctor if you have kidney issues.</p></Card></Section>}

        <Section title="Why this works"><Card><ul className="space-y-2 text-[14px]">{menu.plan.tips.map((t) => <li key={t} className="flex gap-2"><span className="accent-text">•</span>{t}</li>)}</ul>
          {profile.adjustReason && <p className="text-[13px] text-mute mt-3 border-t border-line/50 pt-3">{profile.adjustReason}</p>}</Card></Section>
        <p className="text-[12px] text-mute mt-4 px-1">≈ Estimates. Check labels for whey/packaged foods. Only carb portions (roti, rice, millet, oats, dosa, idli) scale to your calorie target; protein portions stay fixed. Max {WHEY_CAP} scoops of whey a day.</p>
      </> : <Grocery week={week} setWeek={setWeek} />}
    </motion.div>
  )
}

function Grocery({ week, setWeek }: { week: number; setWeek: (w: number) => void }) {
  const profiles = useStore((s) => s.profiles)
  const creatine = useStore((s) => s.settings.creatine)
  const checked = useStore((s) => s.grocery)
  const set = useStore((s) => s.set)
  const people = PEOPLE.filter((p) => profiles[p].onboarded).map((p) => ({ person: p, profile: profiles[p] }))
  const list = useMemo(() => groceryList(week, people, { creatine }), [week, JSON.stringify(people), creatine]) // eslint-disable-line
  const key = (id: string) => `${week}|${id}`
  const weekChecked = Object.fromEntries(list.flatMap((g) => g.items.map((i) => [i.id, !!checked[key(i.id)]])))
  const total = list.reduce((n, g) => n + g.items.length, 0), got = Object.values(weekChecked).filter(Boolean).length
  const title = `V² Fit groceries — Week ${week} (${WEEK_THEMES[week - 1]}) for ${people.map((p) => NAME[p.person]).join(' & ')}`
  const share = async () => {
    const text = groceryText(list, title, weekChecked)
    if (navigator.share) { try { await navigator.share({ text }); return } catch { /* cancelled */ } }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }
  return (
    <div>
      <motion.div variants={item} className="mt-3 grid grid-cols-4 gap-1.5">
        {[1, 2, 3, 4].map((w) => <button key={w} type="button" aria-pressed={week === w} onClick={() => setWeek(w)} className={cx('min-h-[52px] rounded-2xl border', week === w ? 'border-a1/60 bg-a1/15' : 'border-line/60 bg-s1')}>
          <div className={cx('text-[13px] font-semibold', week === w && 'accent-text')}>W{w}</div><div className="text-[10.5px] text-mute">{WEEK_THEMES[w - 1]}</div></button>)}
      </motion.div>
      <motion.div variants={item}><Card className="mt-3 flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-a1/15 accent-text grid place-items-center"><ShoppingBasket size={20} /></div>
        <div className="flex-1"><div className="font-semibold">One week, {people.length === 2 ? 'both of you' : NAME[people[0]?.person ?? 'vikas']}</div><div className="text-[12px] text-mute num">{got} of {total} in the basket · ≈ quantities, rounded up</div></div>
        <Btn kind="soft" onClick={share} label="Share list to WhatsApp"><Send size={16} /></Btn>
      </Card></motion.div>
      {people.length < 2 && <p className="text-[12px] text-mute mt-2 px-1">Set up the other profile to get a combined household list.</p>}
      {list.map((g) => (
        <Section key={g.aisle} title={g.aisle}>
          <Card className="!p-1.5">{g.items.map((i) => {
            const on = !!checked[key(i.id)]
            return (
              <button key={i.id} type="button" aria-pressed={on} onClick={() => set((s) => { s.grocery[key(i.id)] = !on })} className="w-full min-h-[52px] px-2.5 flex items-center gap-3 text-left rounded-xl active:bg-s2">
                <span className={cx('w-7 h-7 rounded-lg grid place-items-center border shrink-0', on ? 'accent-grad border-transparent text-[#08080c]' : 'border-line')}>{on && <Check size={16} strokeWidth={3} />}</span>
                <span className={cx('flex-1 text-[15px]', on && 'line-through text-mute')}>{i.name}</span>
                <span className="text-[13px] text-mute num">{i.label}</span>
              </button>)
          })}</Card>
        </Section>))}
      <p className="text-[12px] text-mute mt-4 px-1">Quantities are raw shopping amounts estimated from the week’s menu (e.g. dry dal, uncooked rice). Staples like oil, spices, tea and coffee aren’t listed.</p>
    </div>
  )
}

const PRESETS: { label: string; kcal: number; protein: number }[] = [
  { label: 'Samosa', kcal: 260, protein: 5 }, { label: 'Chai + biscuits', kcal: 120, protein: 2 }, { label: 'Banana', kcal: 105, protein: 1 },
  { label: 'Boiled egg', kcal: 78, protein: 6 }, { label: 'Fruit bowl', kcal: 90, protein: 1 }, { label: 'Sweet / dessert', kcal: 250, protein: 3 },
  { label: 'Restaurant meal', kcal: 700, protein: 25 }, { label: 'Protein shake', kcal: 150, protein: 25 },
]

function AddExtra({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (e: Extra) => void }) {
  const [label, setLabel] = useState('')
  const [kcal, setKcal] = useState(200)
  const [protein, setProtein] = useState(5)
  return (
    <Sheet open={open} onClose={onClose} title="I ate something else">
      <p className="text-[14px] text-mute mb-3">Pick a quick one or type your own. Rough numbers are fine.</p>
      <div className="flex flex-wrap gap-2">{PRESETS.map((p) => <button key={p.label} type="button" onClick={() => { setLabel(p.label); setKcal(p.kcal); setProtein(p.protein) }} className={cx('min-h-[40px] px-3 rounded-full border text-[13px]', label === p.label ? 'border-a1/60 bg-a1/15' : 'border-line/60 bg-s2')}>{p.label}</button>)}</div>
      <input aria-label="What did you eat" placeholder="What was it?" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} className="mt-3 w-full bg-s2 rounded-xl px-3 min-h-[48px] text-[15px]" />
      <div className="flex items-center justify-between mt-4"><span className="text-[14px]">Calories</span><Stepper value={kcal} onChange={setKcal} step={25} min={0} max={3000} unit="kcal" label="Calories" /></div>
      <div className="flex items-center justify-between mt-3"><span className="text-[14px]">Protein</span><Stepper value={protein} onChange={setProtein} step={1} min={0} max={150} unit="g" label="Protein" /></div>
      <Btn className="w-full mt-5" onClick={() => { onAdd({ id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, label: label.trim() || 'Something else', kcal, protein }); setLabel(''); onClose() }}>Add to today</Btn>
    </Sheet>
  )
}


function MealThumb({ opt, onOpen }: { opt: MealOption; onOpen: () => void }) {
  const [ok, setOk] = useState(true)
  if (!ok) return null
  return (
    <button type="button" aria-label={`Show photo of ${mealName(opt)}`} onClick={onOpen} className="shrink-0 w-16 h-16 rounded-2xl overflow-hidden bg-s2 border border-line/60">
      <img src={`/media/food/${opt.id}.webp`} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" onError={() => setOk(false)} />
    </button>
  )
}

const signed = (n: number, unit: string) => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${Math.abs(Math.round(n * 10) / 10)}${unit}`

function SwapList({ cur, strict, loose, onPick }: { cur: MealOption; strict: MealOption[]; loose: MealOption[]; onPick: (id: string) => void }) {
  const row = (o: MealOption) => {
    const dk = o.kcal - cur.kcal, dp = o.protein - cur.protein
    return (
      <button key={o.id} type="button" onClick={() => onPick(o.id)} className="w-full flex items-center gap-3 min-h-[64px] py-2 text-left border-b border-line/40 last:border-0">
        <MealThumbStatic id={o.id} />
        <span className="flex-1 min-w-0">
          <span className="block text-[15px] font-medium leading-snug">{mealName(o)}</span>
          <span className="block text-[12px] text-mute num mt-0.5">≈ {o.kcal} kcal · {o.protein} g protein</span>
        </span>
        <span className="text-right text-[12px] num shrink-0">
          <span className={cx('block', Math.abs(dk) <= 0.15 * cur.kcal ? 'text-ok' : 'text-warn')}>{signed(dk, ' kcal')}</span>
          <span className={cx('block', dp >= -5 ? 'text-ok' : 'text-warn')}>{signed(dp, ' g')}</span>
        </span>
      </button>)
  }
  return (
    <div>
      <p className="text-[14px] text-mute mb-2">Now: <span className="text-ink">{mealName(cur)}</span>. Differences are against this meal.</p>
      {strict.length > 0 && <><div className="text-[12px] uppercase tracking-widest font-semibold text-mute mt-2">Close match</div>{strict.map(row)}</>}
      {loose.length > 0 && <><div className="text-[12px] uppercase tracking-widest font-semibold text-mute mt-4">Different calories or protein</div>{loose.map(row)}</>}
      {!strict.length && !loose.length && <p className="text-[14px] text-mute">No other option for this meal.</p>}
    </div>
  )
}

function MealThumbStatic({ id }: { id: string }) {
  const [ok, setOk] = useState(true)
  if (!ok) return <span className="shrink-0 w-14 h-14 rounded-xl bg-s2 grid place-items-center text-mute"><Repeat size={16} /></span>
  return <img src={`/media/food/${id}.webp`} alt="" loading="lazy" decoding="async" className="shrink-0 w-14 h-14 rounded-xl object-cover bg-s2" onError={() => setOk(false)} />
}
