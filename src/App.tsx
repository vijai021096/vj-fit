import { Suspense, lazy, useEffect } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { BookOpen, CalendarDays, Home, LineChart, Salad, Settings as Cog } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useStore, type Tab } from './store'
import { NAME, PEOPLE, type Person } from './types'
import { Skeletons, cx, spring } from './components/ui'
import { Onboarding, ProfileForm, InstallGuide } from './screens/Onboarding'
import { Today } from './screens/Today'
import { maybeAdjust } from './lib/adjust'
import { useSync } from './lib/sync'
const Plan = lazy(() => import('./screens/Plan').then((m) => ({ default: m.Plan })))
const Diet = lazy(() => import('./screens/Diet').then((m) => ({ default: m.Diet })))
const Progress = lazy(() => import('./screens/Progress').then((m) => ({ default: m.Progress })))
const Library = lazy(() => import('./screens/Library').then((m) => ({ default: m.Library })))
const ExerciseDetail = lazy(() => import('./screens/Library').then((m) => ({ default: m.ExerciseDetail })))
const Settings = lazy(() => import('./screens/Settings').then((m) => ({ default: m.Settings })))
const Editor = lazy(() => import('./screens/Editor').then((m) => ({ default: m.Editor })))
const Insights = lazy(() => import('./screens/Insights').then((m) => ({ default: m.Insights })))
const Review = lazy(() => import('./screens/Review').then((m) => ({ default: m.Review })))
const SessionScreen = lazy(() => import('./screens/Session').then((m) => ({ default: m.SessionScreen })))

const TABS: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: 'today', label: 'Today', icon: Home }, { id: 'plan', label: 'Plan', icon: CalendarDays }, { id: 'diet', label: 'Diet', icon: Salad },
  { id: 'progress', label: 'Progress', icon: LineChart }, { id: 'library', label: 'Library', icon: BookOpen },
]

export default function App() {
  const person = useStore((s) => s.person)
  const profiles = useStore((s) => s.profiles)
  const theme = useStore((s) => s.settings.theme)
  const flags = useStore((s) => s.flags)
  const tab = useStore((s) => s.tab)
  const contentRev = useStore((s) => s.contentRev)
  const sync = useSync()
  const overlay = useStore((s) => s.overlay)
  const toast = useStore((s) => s.toast)
  const { setTab, open, setPerson } = useStore.getState()
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()

  useEffect(() => {
    const root = document.documentElement
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const apply = () => {
      const light = theme === 'light' || (theme === 'system' && mq.matches)
      root.classList.toggle('light', light)
      document.querySelector('meta[name=theme-color]')?.setAttribute('content', light ? '#F4F4F8' : '#0B0B0F')
    }
    apply(); mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
  useEffect(() => { document.documentElement.dataset.person = person ?? 'vikas'; if (person) void maybeAdjust(person) }, [person])
  useEffect(() => { void navigator.storage?.persist?.().catch(() => false) }, [])
  useEffect(() => { document.getElementById('main')?.scrollTo(0, 0) }, [tab, person])

  const full = !!overlay && ['session', 'exercise', 'settings', 'review', 'editor', 'insights'].includes(overlay.type)
  const ready = flags.disclaimer && person && profiles[person].onboarded
  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

  return (
    <MotionConfig reducedMotion="user">
      <div className="grain h-dvh-full">
        <div className="aura" />
        {!ready ? <Onboarding /> : (
          <div className="relative z-10 h-dvh-full flex flex-col max-w-[520px] mx-auto">
            <div className="contents" {...(full ? ({ inert: '' } as object) : {})}>
            <header className="safe-t shrink-0 glass border-b border-line/50 z-20">
              <div className="flex items-center gap-2 px-4 h-14">
                <div className="display text-[22px] font-bold accent-grad-text select-none" aria-label="V squared Fit">V²</div>
                <div className="flex-1 flex justify-center">
                  <div className="inline-flex p-1 rounded-full bg-s2 border border-line/70" role="tablist" aria-label="Who's training">
                    {PEOPLE.map((p: Person) => (
                      <button key={p} type="button" role="tab" aria-selected={person === p} onClick={() => (profiles[p].onboarded ? setPerson(p) : open({ type: 'profile', person: p }))}
                        className={cx('relative px-4 min-h-[40px] rounded-full text-[14px] font-semibold', person === p ? 'text-[#08080c]' : 'text-mute')}>
                        {person === p && <motion.span layoutId="who" className="absolute inset-0 rounded-full accent-grad" transition={spring} />}
                        <span className="relative">{NAME[p]}</span>
                      </button>))}
                  </div>
                </div>
                <button type="button" aria-label="Settings" onClick={() => open({ type: 'settings' })} className="relative w-11 h-11 grid place-items-center rounded-full bg-s2 border border-line/60"><Cog size={18} />{sync.linked && <span data-testid="sync-dot" data-state={sync.state} className={cx('absolute top-2 right-2 w-2.5 h-2.5 rounded-full border border-bg', sync.state === 'idle' ? 'bg-ok' : sync.state === 'syncing' ? 'bg-a1 animate-pulse' : 'bg-warn')} />}</button>
              </div>
            </header>
            <main className="flex-1 overflow-y-auto no-scrollbar" id="main">
              <AnimatePresence mode="wait">
                <motion.div key={tab + person} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="px-4 pt-4 pb-8">
                  <Suspense fallback={<Skeletons n={4} />} key={contentRev}>
                    {tab === 'today' && <Today />}
                    {tab === 'plan' && <Plan />}
                    {tab === 'diet' && <Diet />}
                    {tab === 'progress' && <Progress />}
                    {tab === 'library' && <Library />}
                  </Suspense>
                </motion.div>
              </AnimatePresence>
            </main>
            <nav className="shrink-0 glass border-t border-line/50 safe-b z-20" aria-label="Main">
              <div className="grid grid-cols-5">
                {TABS.map((t) => (
                  <button key={t.id} type="button" onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}
                    className={cx('relative min-h-[58px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium', tab === t.id ? 'accent-text' : 'text-mute')}>
                    {tab === t.id && <motion.span layoutId="tabdot" className="absolute top-0 h-[3px] w-8 rounded-full accent-grad" transition={spring} />}
                    <t.icon size={21} />{t.label}
                  </button>))}
              </div>
            </nav>
            </div>
            <Suspense fallback={null}>
              {overlay?.type === 'session' && <SessionScreen key="session" />}
              {overlay?.type === 'exercise' && <ExerciseDetail key="ex" id={overlay.id} />}
              {overlay?.type === 'settings' && <Settings key="settings" />}
              {overlay?.type === 'insights' && <Insights key="insights" />}
              {overlay?.type === 'editor' && <Editor key="editor" />}
              {overlay?.type === 'review' && <Review key="review" />}
              {overlay?.type === 'profile' && <ProfileForm key="profile" person={overlay.person} sheet />}
            </Suspense>
            <InstallGuide open={overlay?.type === 'install' || (!standalone && !flags.install && !overlay)} />
          </div>
        )}
        <AnimatePresence>
          {toast && <motion.div role="status" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} className="fixed z-[90] left-1/2 -translate-x-1/2 bottom-24 px-4 py-3 rounded-2xl glass border border-line text-[14px] font-medium max-w-[88vw] text-center">{toast}</motion.div>}
          {needRefresh && <motion.div role="alert" initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="fixed z-[95] left-1/2 -translate-x-1/2 top-[calc(env(safe-area-inset-top)+64px)] px-4 py-2 rounded-2xl glass border border-a1/40 text-[14px] flex items-center gap-3">
            Update available <button type="button" className="min-h-[40px] px-3 rounded-xl accent-grad text-[#08080c] font-semibold" onClick={() => updateServiceWorker(true)}>Reload</button></motion.div>}
        </AnimatePresence>
      </div>
    </MotionConfig>
  )
}
