import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Camera, Check, PlusSquare, Share, X } from 'lucide-react'
import { useStore } from '../store'
import { NAME, PEOPLE, type Person, type Profile } from '../types'
import { DISCLAIMER } from '../data/common'
import { SyncPanel } from './SyncPanel'
import { Btn, Segmented, Sheet, Stepper, cx, spring } from '../components/ui'

export function Onboarding() {
  const flags = useStore((s) => s.flags)
  const person = useStore((s) => s.person)
  const set = useStore((s) => s.set)
  if (!flags.disclaimer) return (
    <div className="relative z-10 h-dvh-full flex flex-col max-w-[520px] mx-auto px-6 safe-t safe-b">
      <div className="flex-1 flex flex-col justify-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring} className="display text-[88px] leading-none font-bold accent-grad-text">V²</motion.div>
        <h1 className="display text-[34px] leading-tight font-semibold mt-4">Two people.<br />One plan each.<br />Let’s go.</h1>
        <p className="text-mute mt-3 text-[16px]">Your training, meals and progress — in your pocket, even with no signal.</p>
      </div>
      <div className="pb-6">
        <p className="text-[13px] text-mute mb-3">{DISCLAIMER}</p>
        <Btn className="w-full" onClick={() => set((s) => { s.flags.disclaimer = true })}>I understand — continue <ArrowRight size={18} /></Btn>
      </div>
    </div>
  )
  if (!person) return <Picker />
  return <ProfileForm person={person} />
}

function Picker() {
  const [join, setJoin] = useState(false)
  const setPerson = useStore((s) => s.setPerson)
  const avatars = useStore((s) => s.avatars)
  return (
    <div className="relative z-10 h-dvh-full flex flex-col max-w-[520px] mx-auto px-5 safe-t safe-b">
      <h1 className="display text-[34px] font-semibold mt-10">Who’s training?</h1>
      <p className="text-mute mt-1">You can switch any time from the top of the screen.</p>
      <div className="flex-1 flex flex-col justify-end gap-4 pb-8">
        {PEOPLE.map((p, i) => (
          <motion.button key={p} type="button" data-person={p} onClick={() => { document.documentElement.dataset.person = p; setPerson(p) }}
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.1 + i * 0.1 }} whileTap={{ scale: 0.97 }}
            className="relative overflow-hidden rounded-xl3 border border-line/70 bg-s1 p-6 text-left min-h-[180px]"
            style={{ ['--a1c' as string]: p === 'vikas' ? '#4c8dff' : '#ff6b9a', ['--a2c' as string]: p === 'vikas' ? '#22d3ee' : '#c77dff' }}>
            <motion.div className="absolute -right-10 -top-10 w-56 h-56 rounded-full accent-grad opacity-30 blur-2xl" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 5, repeat: Infinity }} />
            <div className="relative flex items-center gap-4">
              <div className="w-20 h-20 rounded-3xl accent-grad grid place-items-center overflow-hidden text-[#08080c] display text-[40px] font-bold">
                {avatars[p] ? <img src={avatars[p]} alt="" className="w-full h-full object-cover" /> : NAME[p][0]}
              </div>
              <div>
                <div className="display text-[30px] font-semibold">{NAME[p]}</div>
                <div className="text-mute text-[14px]">{p === 'vikas' ? 'Lean bulk · shoulders, chest, back' : 'Strength · posture · shoulders · energy'}</div>
              </div>
            </div>
            <div className="relative mt-6 inline-flex items-center gap-2 text-[14px] font-semibold accent-grad-text">Start as {NAME[p]} <ArrowRight size={16} className="text-ink" /></div>
          </motion.button>))}
      </div>
      <button type="button" onClick={() => setJoin(true)} className="min-h-[48px] mb-4 text-[14px] font-semibold accent-text">Already using V² Fit on another phone? Connect it here</button>
      <Sheet open={join} onClose={() => setJoin(false)} title="Connect to the shared data"><SyncPanel bare /></Sheet>
    </div>
  )
}

export function ProfileForm({ person, sheet }: { person: Person; sheet?: boolean }) {
  const cur = useStore((s) => s.profiles[person])
  const avatars = useStore((s) => s.avatars)
  const set = useStore((s) => s.set)
  const open = useStore((s) => s.open)
  const [p, setP] = useState<Profile>(cur)
  const file = useRef<HTMLInputElement>(null)
  const up = (k: keyof Profile, v: number | string | boolean) => setP({ ...p, [k]: v })
  const save = () => {
    set((s) => { s.profiles[person] = { ...p, onboarded: true }; s.person = person })
    document.documentElement.dataset.person = person
    if (sheet) open(null)
  }
  const onAvatar = (f?: File) => {
    if (!f) return
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = c.height = 160
      const s = Math.min(img.width, img.height)
      c.getContext('2d')!.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 160, 160)
      set((st) => { st.avatars[person] = c.toDataURL('image/jpeg', 0.8) })
    }
    img.src = URL.createObjectURL(f)
  }
  const body = (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button type="button" aria-label="Add a photo (optional)" onClick={() => file.current?.click()} className="relative w-16 h-16 rounded-2xl accent-grad grid place-items-center overflow-hidden text-[#08080c] display text-[30px] font-bold">
          {avatars[person] ? <img src={avatars[person]} alt="" className="w-full h-full object-cover" /> : NAME[person][0]}
          <span className="absolute bottom-0 right-0 w-6 h-6 rounded-tl-xl bg-black/60 text-white grid place-items-center"><Camera size={12} /></span>
        </button>
        <input ref={file} type="file" accept="image/*" hidden onChange={(e) => onAvatar(e.target.files?.[0])} />
        <div><div className="display text-[22px] font-semibold">{NAME[person]}</div><div className="text-[13px] text-mute">Used only to estimate your calories. Shared with your other phone.</div></div>
      </div>
      {([['heightCm', 'Height', 'cm', 1, 120, 220], ['weightKg', 'Weight', 'kg', 0.5, 30, 200], ['age', 'Age', 'yrs', 1, 14, 90]] as const).map(([k, label, unit, step, min, max]) => (
        <div key={k} className="flex items-center justify-between rounded-2xl bg-s2 border border-line/60 px-4 py-2">
          <span className="text-[15px]">{label}</span>
          <Stepper value={p[k]} onChange={(v) => up(k, v)} step={step} min={min} max={max} unit={unit} label={label} big />
        </div>))}
      <div className="flex items-center justify-between rounded-2xl bg-s2 border border-line/60 px-4 py-3"><span className="text-[15px]">Sex</span>
        <Segmented id={`sex-${person}`} small value={p.sex} onChange={(v) => up('sex', v)} options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} /></div>
      <label className="flex items-center justify-between rounded-2xl bg-s2 border border-line/60 px-4 py-3"><span className="text-[15px]">Gym time</span>
        <input type="time" value={p.gymTime} onChange={(e) => up('gymTime', e.target.value || '07:00')} className="bg-s3 rounded-xl px-3 min-h-[44px] num" /></label>
      <div className="flex items-center justify-between rounded-2xl bg-s2 border border-line/60 px-4 py-3"><span className="text-[15px]">Diet</span>
        <Segmented id={`veg-${person}`} small value={p.veg ? 'veg' : 'egg'} onChange={(v) => up('veg', v === 'veg')} options={[{ value: 'egg', label: 'Eggetarian' }, { value: 'veg', label: 'Veg only' }]} /></div>
    </div>
  )
  if (sheet) return (
    <Sheet open onClose={() => open(null)} title={`Set up ${NAME[person]}`}>{body}<Btn className="w-full mt-5" onClick={save}><Check size={18} /> Save and switch</Btn></Sheet>
  )
  return (
    <div className="relative z-10 h-dvh-full flex flex-col max-w-[520px] mx-auto safe-t safe-b">
      <div className="flex-1 overflow-y-auto px-5 pt-8 pb-4 no-scrollbar">
        <h1 className="display text-[30px] font-semibold">A few numbers, {NAME[person]}</h1>
        <p className="text-mute mt-1 mb-5">So your meals and targets fit you.</p>
        {body}
      </div>
      <div className="px-5 pb-6 flex gap-2">
        <Btn kind="ghost" onClick={() => set((s) => { s.person = null })} label="Back"><X size={18} /></Btn>
        <Btn className="flex-1" onClick={save}>Build my plan <ArrowRight size={18} /></Btn>
      </div>
    </div>
  )
}

export function InstallGuide({ open }: { open: boolean }) {
  const set = useStore((s) => s.set)
  const openO = useStore((s) => s.open)
  const close = () => { set((s) => { s.flags.install = true }); openO(null) }
  const steps = [
    { icon: <span className="display font-bold text-[18px]">S</span>, t: 'Open this page in Safari', d: 'It must be Safari — not Chrome or an in-app browser.' },
    { icon: <Share size={20} />, t: 'Tap the Share button', d: 'The square with an arrow, at the bottom of the screen.' },
    { icon: <PlusSquare size={20} />, t: 'Choose “Add to Home Screen”', d: 'Scroll down the share sheet if you can’t see it.' },
    { icon: <Check size={20} />, t: 'Tap Add, then open V² from your Home Screen', d: 'It now runs full-screen and works offline.' },
  ]
  return (
    <Sheet open={open} onClose={close} title="Install on your iPhone">
      <p className="text-[14px] text-mute mb-4">Installing keeps your logs safer and makes the app work in airplane mode.</p>
      <ol className="space-y-3">{steps.map((s, i) => (
        <motion.li key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="flex gap-3 items-start">
          <div className={cx('w-12 h-12 rounded-2xl grid place-items-center shrink-0', i === 1 || i === 2 ? 'accent-grad text-[#08080c]' : 'bg-s2 border border-line/60')}>{s.icon}</div>
          <div><div className="font-semibold text-[15px]">{i + 1}. {s.t}</div><div className="text-[13px] text-mute">{s.d}</div></div>
        </motion.li>))}</ol>
      <Btn className="w-full mt-5" onClick={close}>Got it</Btn>
    </Sheet>
  )
}
