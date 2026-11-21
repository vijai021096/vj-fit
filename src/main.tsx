import React from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/barlow-condensed/600.css'
import '@fontsource/barlow-condensed/700.css'
import '@fontsource/barlow-condensed/800.css'
import '@fontsource-variable/inter/index.css'
import './index.css'
import App from './App'
import { watchContent } from './lib/content'
import { consumeSetupLink, startSync } from './lib/sync'
import { startReminders } from './lib/reminders'
import { setSimulatedNow } from './engine/calendar'

const sim = new URLSearchParams(location.search).get('simulate') ?? sessionStorage.getItem('v2fit-simulate')
if (sim) { setSimulatedNow(sim); sessionStorage.setItem('v2fit-simulate', sim) }

// iOS Safari ignores user-scalable=no for pinch, so block the gesture events as well.
for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false })
document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault() }, { passive: false })
let lastTap = 0
document.addEventListener('touchend', (e) => { const t = Date.now(); if (t - lastTap < 300 && !(e.target as HTMLElement).closest('button,input,textarea,select,a,[role=tab]')) e.preventDefault(); lastTap = t }, { passive: false })
document.addEventListener('wheel', (e) => { if (e.ctrlKey) e.preventDefault() }, { passive: false })

class Boundary extends React.Component<{ children: React.ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null }
  static getDerivedStateFromError(err: Error) { return { err } }
  render() {
    if (!this.state.err) return this.props.children
    return (
      <div className="h-dvh-full grid place-items-center p-6 text-center">
        <div className="card p-6 max-w-sm">
          <div className="display text-[22px] font-semibold">Something tripped.</div>
          <p className="text-mute text-[14px] mt-2">Your logs are safe on this device. Reload to carry on.</p>
          <p className="text-[12px] text-mute mt-2 break-words">{String(this.state.err.message)}</p>
          <button className="mt-4 min-h-[48px] px-5 rounded-2xl accent-grad text-[#08080c] font-semibold" onClick={() => location.reload()}>Reload</button>
        </div>
      </div>
    )
  }
}

watchContent()
consumeSetupLink()
startSync()
startReminders()
createRoot(document.getElementById('root')!).render(<React.StrictMode><Boundary><App /></Boundary></React.StrictMode>)
