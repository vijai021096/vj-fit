import { useEffect, useState } from 'react'
import { Cloud, CloudOff, RefreshCw, Smartphone, Trash2 } from 'lucide-react'
import { useStore, usePerson } from '../store'
import { NAME } from '../types'
import { DEFAULT_API, createHousehold, disconnectLocal, formatCode, getCfg, joinWithCode, listDevices, removeDevice, startPairing, syncNow, useSync, type Device } from '../lib/sync'
import { Btn, Card, Chip, Section, Sheet, cx } from '../components/ui'

const field = 'w-full bg-s2 rounded-xl px-3 min-h-[48px] text-[16px] border border-line/60'
const ago = (t: number) => { const s = Math.max(0, Math.round((Date.now() - t) / 1000)); return s < 10 ? 'just now' : s < 90 ? `${s}s ago` : s < 5400 ? `${Math.round(s / 60)} min ago` : `${Math.round(s / 3600)} h ago` }

export function SyncPanel({ joinOnly }: { joinOnly?: boolean }) {
  const person = usePerson()
  const say = useStore((s) => s.say)
  const { state, last, error, linked } = useSync()
  const cfg = linked ? getCfg() : null
  const [api, setApi] = useState(cfg?.api ?? DEFAULT_API)
  const [label, setLabel] = useState(`${NAME[person]}’s phone`)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [pair, setPair] = useState<{ code: string; expiresAt: string } | null>(null)
  const [devices, setDevices] = useState<Device[] | null>(null)
  const [confirm, setConfirm] = useState<null | 'leave' | Device>(null)
  const [, tick] = useState(0)
  useEffect(() => { const i = setInterval(() => tick((n) => n + 1), 5000); return () => clearInterval(i) }, [])
  const refresh = () => listDevices().then((r) => setDevices(r.devices)).catch(() => setDevices(null))
  useEffect(() => { if (linked) void refresh(); else setDevices(null) }, [linked, state === 'idle'])  // eslint-disable-line

  const run = async (fn: () => Promise<void>) => { setBusy(true); setErr(''); try { await fn() } catch (e) { setErr(e instanceof TypeError ? 'Can’t reach the sync server. Check your internet and try again.' : (e as Error).message) } finally { setBusy(false) } }
  const needApi = !DEFAULT_API
  const apiOk = /^https?:\/\/\S+$/.test(api.trim())

  const status = state === 'syncing' ? 'Syncing…' : state === 'offline' ? 'Offline — changes are saved and will sync later' : state === 'error' ? `Problem: ${error}` : state === 'unlinked' ? error : last ? `Up to date · ${ago(last)}` : 'Connected'

  return (
    <Section title={joinOnly ? '' : 'Sync between phones'} className={joinOnly ? '!mt-0' : ''}>
      <Card>
        {!linked ? (
          <>
            <p className="text-[14px] text-mute">Keep Vikas’s and Varsha’s logs, plans and meals on both phones. Works offline; syncs when there’s signal. Progress photos stay on the phone they were taken on.</p>
            {needApi && <><label className="text-[12px] uppercase tracking-widest text-mute font-semibold block mt-3">Sync server</label><input aria-label="Sync server URL" className={cx(field, 'mt-1')} inputMode="url" autoCapitalize="none" placeholder="https://…onrender.com" value={api} onChange={(e) => setApi(e.target.value)} /></>}
            <label className="text-[12px] uppercase tracking-widest text-mute font-semibold block mt-3">Name this phone</label>
            <input aria-label="Phone name" className={cx(field, 'mt-1')} value={label} maxLength={40} onChange={(e) => setLabel(e.target.value)} />
            {!joinOnly && <div className="mt-3 rounded-2xl bg-s2 p-3">
              <div className="font-semibold text-[15px]">First phone</div>
              <p className="text-[13px] text-mute">Creates your private sync space and uploads what’s here.</p>
              <Btn className="w-full mt-2" disabled={busy || !apiOk} onClick={() => run(() => createHousehold(api.trim().replace(/\/+$/, ''), label.trim() || 'Phone'))}><Cloud size={18} /> Start syncing</Btn>
            </div>}
            <div className="mt-3 rounded-2xl bg-s2 p-3">
              <div className="font-semibold text-[15px]">Second phone</div>
              <p className="text-[13px] text-mute">On the first phone: Settings → Sync → Add another phone. Type the code here.</p>
              <input aria-label="Pairing code" className={cx(field, 'mt-2 text-center tracking-[0.3em] text-[20px] uppercase')} autoCapitalize="characters" autoCorrect="off" spellCheck={false} maxLength={9} placeholder="ABCD-2345" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
              <Btn kind="soft" className="w-full mt-2" disabled={busy || !apiOk || code.replace(/[^A-Z0-9]/g, '').length < 8} onClick={() => run(async () => { await joinWithCode(api.trim().replace(/\/+$/, ''), code.replace(/[^A-Z0-9]/g, ''), label.trim() || 'Phone'); setCode(''); say('Linked — pulling your data') })}><Smartphone size={18} /> Join with code</Btn>
            </div>
            {err && <p role="alert" className="text-[13px] text-bad mt-3">{err}</p>}
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <span className={cx('w-10 h-10 rounded-full grid place-items-center', state === 'offline' || state === 'error' || state === 'unlinked' ? 'bg-s3 text-warn' : 'bg-s3 accent-text')}>{state === 'offline' ? <CloudOff size={20} /> : <Cloud size={20} />}</span>
              <div className="min-w-0 flex-1"><div className="font-semibold text-[15px]" data-testid="sync-status">{status}</div><div className="text-[12px] text-mute truncate">{cfg?.label}</div></div>
              <button type="button" aria-label="Sync now" onClick={() => void syncNow()} className="w-11 h-11 grid place-items-center rounded-full bg-s2"><RefreshCw size={18} className={state === 'syncing' ? 'animate-spin' : ''} /></button>
            </div>
            <Btn kind="soft" className="w-full mt-3" disabled={busy} onClick={() => run(async () => setPair(await startPairing()))}><Smartphone size={18} /> Add another phone</Btn>
            {err && <p role="alert" className="text-[13px] text-bad mt-2">{err}</p>}
            {devices && <ul className="mt-3 divide-y divide-line/50" aria-label="Linked phones">{devices.map((d) => (
              <li key={d.id} className="flex items-center gap-2 min-h-[52px]"><div className="flex-1 min-w-0"><div className="text-[15px] truncate">{d.label}{d.me && <Chip className="ml-2">this phone</Chip>}</div><div className="text-[12px] text-mute">Last seen {ago(new Date(d.lastSeen).getTime())}</div></div>
                {!d.me && <button type="button" aria-label={`Remove ${d.label}`} onClick={() => setConfirm(d)} className="w-11 h-11 grid place-items-center text-mute"><Trash2 size={16} /></button>}</li>))}</ul>}
            <Btn kind="ghost" className="w-full mt-2" onClick={() => setConfirm('leave')}>Stop syncing on this phone</Btn>
          </>
        )}
      </Card>
      <Sheet open={!!pair} onClose={() => setPair(null)} title="Add another phone">
        <p className="text-[14px] text-mute">On the other phone open V² Fit → Settings → Sync → “Join with code”, and type:</p>
        <div className="my-5 text-center display text-[40px] font-bold tracking-[0.15em] accent-grad-text select-text" data-testid="pair-code">{pair ? formatCode(pair.code) : ''}</div>
        <p className="text-[12px] text-mute text-center">Works once, for 15 minutes. Anyone with the code can join your sync space, so only share it with your own phone.</p>
        <Btn className="w-full mt-4" onClick={() => setPair(null)}>Done</Btn>
      </Sheet>
      <Sheet open={!!confirm} onClose={() => setConfirm(null)} title={confirm === 'leave' ? 'Stop syncing here?' : 'Remove this phone?'}>
        <p className="text-[14px] text-mute mb-4">{confirm === 'leave' ? 'Your data stays on this phone but it stops sending and receiving changes. You can pair it again later.' : 'That phone will stop syncing. Its data stays on it.'}</p>
        <div className="space-y-2">
          <Btn kind="danger" className="w-full" onClick={async () => { const c = confirm; setConfirm(null); try { if (c === 'leave') { const me = getCfg(); if (me) await removeDevice(me.deviceId).catch(() => disconnectLocal()); disconnectLocal() } else if (c) { await removeDevice(c.id); void refresh() } } catch (e) { say((e as Error).message) } }}>{confirm === 'leave' ? 'Stop syncing' : 'Remove'}</Btn>
          <Btn kind="soft" className="w-full" onClick={() => setConfirm(null)}>Cancel</Btn>
        </div>
      </Sheet>
    </Section>
  )
}
