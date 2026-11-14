import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, GlassWater, Pill, Repeat, Send, ShoppingBasket } from 'lucide-react'
import { useStore, usePerson } from '../store'
import { NAME, PEOPLE, WD_LABEL, WEEKDAYS } from '../types'
import { patchDay } from '../db'
import { useNow, usePosition } from '../lib/hooks'
import { GLASS, dayIndex, useDay, useMenu } from './Today'
import { WEEK_THEMES, WHEY_CAP, optionById, swapOptions } from '../engine/rotation'
import { fmtMin, mealName, waterTarget } from '../engine/nutrition'
import { groceryList, groceryText } from '../engine/grocery'
import { istMinutes } from '../engine/calendar'
import { Bar, Btn, Card, Chip, Section, Segmented, cx, item, stagger } from '../components/ui'


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
  const eatenK = isToday ? menu.chosen.reduce((n, c) => n + (day.eaten[c.slot] ? menu.scaled.kcal[c.slot] ?? 0 : 0), 0) : 0
  const eatenP = isToday ? menu.chosen.reduce((n, c) => n + (day.eaten[c.slot] ? menu.scaled.protein[c.slot] ?? 0 : 0), 0) : 0
  const nextSlot = isToday ? menu.plan.slots.map((s) => ({ id: s.id, at: menu.times[s.id] ?? 0 })).filter((x) => !day.eaten[x.id] && x.at >= mins - 45).sort((a, b) => a.at - b.at)[0]?.id : null
  const glasses = Math.round(waterTarget(person, profile) / GLASS)

  const doSwap = (slotId: string) => {
    const slot = menu.plan.slots.find((s) => s.id === slotId)!
    const cur = menu.chosen.find((c) => c.slot === slotId)!.option
    const { strict, loose } = swapOptions(slot, cur.id, profile.veg)
    const scoopsElsewhere = menu.chosen.filter((c) => c.slot !== slotId).reduce((n, c) => n + (c.option.whey ?? 0), 0)
    const cands = [...strict, ...loose].filter((o) => scoopsElsewhere + (o.whey ?? 0) <= WHEY_CAP)
    if (!cands.length) { say('No other option for this meal'); return }
    // cycle: keep order stable by walking the slot's option list
    const order = slot.options.filter((o) => cands.some((c) => c.id === o.id))
    const strictIds = new Set(strict.map((o) => o.id))
    const pool = order.some((o) => strictIds.has(o.id)) ? order.filter((o) => strictIds.has(o.id)) : order
    const idx = slot.options.findIndex((o) => o.id === cur.id)
    const nextO = pool.find((o) => slot.options.indexOf(o) > idx) ?? pool[0]
    if (isToday) void patchDay(person, pos.date, (x) => { x.swaps[slotId] = nextO.id })
    else setPreview({ ...preview, [slotId]: nextO.id })
    if (!strictIds.has(nextO.id)) say('Closest match — outside ±15% kcal / ±5 g protein')
  }

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
                  <div className="flex-1 min-w-0">
                    <div className={cx('text-[15px] font-medium', eaten && 'line-through')}>{mealName(c.option, menu.scaled.qty[s.id])}</div>
                    <div className="text-[13px] text-mute num mt-0.5">≈ {menu.scaled.kcal[s.id]} kcal · ≈ {menu.scaled.protein[s.id]} g protein{c.option.tag ? ` · ${c.option.tag === 'S' ? 'South' : 'North'}` : ''}</div>
                    {altO && <div className="text-[12px] text-mute mt-1.5"><span className="font-semibold">Alt:</span> {mealName(altO)} <span className="num">(≈ {altO.kcal}/{altO.protein})</span></div>}
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {isToday && <motion.button whileTap={{ scale: 0.86 }} type="button" aria-pressed={eaten} aria-label={eaten ? `${s.label} eaten — tap to undo` : `Mark ${s.label} as eaten`} onClick={() => void patchDay(person, pos.date, (x) => { x.eaten[s.id] = !x.eaten[s.id] })}
                      className={cx('w-12 h-12 rounded-2xl grid place-items-center border', eaten ? 'accent-grad border-transparent text-[#08080c]' : 'border-line bg-s2')}><Check size={20} strokeWidth={3} /></motion.button>}
                    {s.options.length > 1 && <button type="button" aria-label={`Swap ${s.label}`} onClick={() => doSwap(s.id)} className="w-12 h-12 rounded-2xl grid place-items-center border border-line bg-s2"><Repeat size={18} /></button>}
                  </div>
                </div>
              </motion.div>)
          })}
        </div>

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
