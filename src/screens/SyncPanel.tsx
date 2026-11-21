import { useEffect, useState } from 'react'
import { Cloud, CloudOff, RefreshCw } from 'lucide-react'
import { useStore } from '../store'
import { connectWithKey, disconnectLocal, syncNow, useSync } from '../lib/sync'
import { Btn, Card, Section, Sheet, cx } from '../components/ui'

const field = 'w-full bg-s2 rounded-xl px-3 min-h-[48px] text-[16px] border border-line/60'
const ago = (t: number) => { const s = Math.max(0, Math.round((Date.now() - t) / 1000)); return s < 10 ? 'just now' : s < 90 ? `${s}s ago` : s < 5400 ? `${Math.round(s / 60)} min ago` : `${Math.round(s / 3600)} h ago` }

/** Optional cloud backup/sync across your devices. Enter the key once per device. */
export function SyncPanel({ bare }: { bare?: boolean }) {
  const say = useStore((s) => s.say)
  const { state, last, error, linked } = useSync()
  const [key, setKeyText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [leave, setLeave] = useState(false)
  const [, tick] = useState(0)
  useEffect(() => { const i = setInterval(() => tick((n) => n + 1), 5000); return () => clearInterval(i) }, [])
  const connect = async () => {
    setBusy(true); setErr('')
    try { await connectWithKey(key); setKeyText(''); say('Connected — loading your shared data') }
    catch (e) { setErr(e instanceof TypeError ? 'Can’t reach the server. Check your internet and try again.' : (e as Error).message) }
    finally { setBusy(false) }
  }
  const status = state === 'syncing' ? 'Syncing…' : state === 'offline' ? 'Offline — saved here, will sync later' : state === 'error' ? `Problem: ${error}` : state === 'unlinked' ? error : last ? `Up to date · ${ago(last)}` : 'Connecting…'
  const body = !linked ? (
    <>
      <p className="text-[14px] text-mute">Optional: sync your logs across devices. Enter your sync key once on this device.</p>
      <label className="text-[12px] uppercase tracking-widest text-mute font-semibold block mt-3" htmlFor="hh-key">Household key</label>
      <input id="hh-key" className={cx(field, 'mt-1')} autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="paste the key" value={key} onChange={(e) => setKeyText(e.target.value)} />
      <Btn className="w-full mt-3" disabled={busy || key.trim().length < 12} onClick={connect}><Cloud size={18} /> {busy ? 'Connecting…' : 'Connect'}</Btn>
      {(err || (state === 'unlinked' && error)) && <p role="alert" className="text-[13px] text-bad mt-3">{err || error}</p>}
    </>
  ) : (
    <>
      <div className="flex items-center gap-3">
        <span className={cx('w-10 h-10 rounded-full grid place-items-center bg-s3', state === 'offline' || state === 'error' || state === 'unlinked' ? 'text-warn' : 'accent-text')}>{state === 'offline' ? <CloudOff size={20} /> : <Cloud size={20} />}</span>
        <div className="min-w-0 flex-1"><div className="font-semibold text-[15px]" data-testid="sync-status">{status}</div><div className="text-[12px] text-mute">Shared database · both phones</div></div>
        <button type="button" aria-label="Sync now" onClick={() => void syncNow()} className="w-11 h-11 grid place-items-center rounded-full bg-s2"><RefreshCw size={18} className={state === 'syncing' ? 'animate-spin' : ''} /></button>
      </div>
      <Btn kind="ghost" className="w-full mt-3" onClick={() => setLeave(true)}>Disconnect this phone</Btn>
      <Sheet open={leave} onClose={() => setLeave(false)} title="Disconnect this phone?">
        <p className="text-[14px] text-mute mb-4">Your data stays on this phone but it stops sending and receiving changes. Enter the key again to reconnect.</p>
        <div className="space-y-2"><Btn kind="danger" className="w-full" onClick={() => { setLeave(false); disconnectLocal() }}>Disconnect</Btn><Btn kind="soft" className="w-full" onClick={() => setLeave(false)}>Cancel</Btn></div>
      </Sheet>
    </>
  )
  return bare ? <Card>{body}</Card> : <Section title="Shared data"><Card>{body}</Card></Section>
}
