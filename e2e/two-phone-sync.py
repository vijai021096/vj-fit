import asyncio, json, sys, re
from playwright.async_api import async_playwright
URL='http://localhost:4173'
fails=[]
def check(name, ok, extra=''):
    print(('PASS ' if ok else 'FAIL ')+name, extra); 
    if not ok: fails.append(name)

IDB_PUT = """([store,row])=>new Promise((res,rej)=>{const r=indexedDB.open('v2fit');r.onsuccess=()=>{const d=r.result;const t=d.transaction(store,'readwrite');t.objectStore(store).put(row);t.oncomplete=()=>{d.close();res(true)};t.onerror=()=>rej(t.error)}})"""
IDB_DEL = """([store,id])=>new Promise((res,rej)=>{const r=indexedDB.open('v2fit');r.onsuccess=()=>{const d=r.result;const t=d.transaction(store,'readwrite');t.objectStore(store).delete(id);t.oncomplete=()=>{d.close();res(true)}}})"""
IDB_ALL = """(store)=>new Promise((res)=>{const r=indexedDB.open('v2fit');r.onsuccess=()=>{const d=r.result;const q=d.transaction(store).objectStore(store).getAll();q.onsuccess=()=>{d.close();res(q.result)}}})"""

async def newphone(b, name):
    ctx=await b.new_context(viewport={'width':430,'height':932},is_mobile=True,has_touch=True,reduced_motion='reduce')
    pg=await ctx.new_page(); pg.errs=[]
    pg.on('pageerror',lambda e: pg.errs.append(f'{name}: {e}'))
    await pg.goto(URL); await pg.wait_for_timeout(800)
    await pg.get_by_text('I understand').click(); await pg.wait_for_timeout(300)
    return ctx,pg

async def open_settings(pg):
    await pg.get_by_role('button',name='Settings').click(); await pg.wait_for_timeout(500)

async def status(pg):
    if await pg.get_by_test_id('sync-status').count(): return await pg.get_by_test_id('sync-status').inner_text()
    await open_settings(pg); t=await pg.get_by_test_id('sync-status').inner_text(); await pg.get_by_role('button',name='Back').click(); await pg.wait_for_timeout(300); return t

async def sync_now(pg):
    opened=False
    if not await pg.get_by_role('button',name='Sync now').count():
        # settings not open (maybe editor is): close overlays until the Settings button shows, then open it
        for _ in range(3):
            if await pg.get_by_role('button',name='Settings').count() and not await pg.get_by_label('Session title').count(): break
            if await pg.get_by_role('button',name='Back').count(): await pg.get_by_role('button',name='Back').click(); await pg.wait_for_timeout(300)
        if not await pg.get_by_role('button',name='Sync now').count():
            await open_settings(pg); opened=True
    await pg.get_by_role('button',name='Sync now').click()
    await pg.wait_for_timeout(1800)
    if opened: await pg.get_by_role('button',name='Back').click(); await pg.wait_for_timeout(300)

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        # ---------- Phone A (Vikas) ----------
        ctxA,A=await newphone(b,'A')
        await A.get_by_text('Start as Vikas').click(); await A.wait_for_timeout(300)
        await A.get_by_text('Build my plan').click(); await A.wait_for_timeout(700)
        await A.get_by_role('button',name='Got it').click(); await A.wait_for_timeout(400)
        await open_settings(A)
        await A.get_by_label('Phone name').fill('Vikas A')
        await A.get_by_role('button',name='Start syncing').click(); await A.wait_for_timeout(2500)
        st=await status(A); check('A linked & synced', 'Up to date' in st or 'Connected' in st, st)
        await A.get_by_role('button',name='Add another phone').click(); await A.wait_for_timeout(800)
        code=(await A.get_by_test_id('pair-code').inner_text()).replace('-','').strip()
        check('pair code is 8 chars', len(code)==8, code)
        await A.screenshot(path='/home/claude/qa/60-paircode.png')
        await A.get_by_role('button',name='Done').click(); await A.wait_for_timeout(300)

        # ---------- Phone B joins from the welcome screen ----------
        ctxB,B=await newphone(b,'B')
        await B.get_by_text('Sync it here').click(); await B.wait_for_timeout(500)
        await B.get_by_label('Phone name').fill('Varsha B')
        await B.get_by_label('Pairing code').fill(code)
        await B.get_by_role('button',name='Join with code').click(); await B.wait_for_timeout(3000)
        st=await status(B); check('B joined', 'Up to date' in st or 'Connected' in st, st)
        await B.screenshot(path='/home/claude/qa/61-b-joined.png')
        # wrong/used code
        used = await B.evaluate("()=>JSON.parse(localStorage.getItem('v2fit-sync')).token.length>10")
        check('B has token', used)
        await B.keyboard.press('Escape')
        await B.reload(); await B.wait_for_timeout(1200)
        await B.get_by_text('Start as Vikas').click(); await B.wait_for_timeout(1000)
        onboarded = await B.get_by_role('button',name='Settings').count()
        check('B skipped onboarding (profile synced from A)', onboarded==1)
        if await B.get_by_role('button',name='Got it').count(): await B.get_by_role('button',name='Got it').click(); await B.wait_for_timeout(400)

        # ---------- A edits the plan; B should see it ----------
        await A.get_by_role('button',name='Back').click(); await A.wait_for_timeout(300)
        await open_settings(A)
        await A.get_by_text('Edit workouts and meals').click(); await A.wait_for_timeout(600)
        await A.get_by_role('tab',name='Mon',exact=True).click(); await A.wait_for_timeout(300)
        t=A.get_by_label('Session title'); await t.fill('Chest Day ZZ'); await A.wait_for_timeout(400)
        await A.screenshot(path='/home/claude/qa/62-editor.png')
        await A.wait_for_timeout(3500)  # debounce push
        await B.get_by_role('button',name='Settings').click(); await B.wait_for_timeout(400)
        await sync_now(B)
        await B.get_by_role('button',name='Back').click(); await B.wait_for_timeout(400)
        await B.get_by_role('button',name='Plan',exact=True).click(); await B.wait_for_timeout(600)
        await B.wait_for_timeout(1200)
        await B.get_by_role('tab',name=re.compile(r'^Mon \d')).first.click(); await B.wait_for_timeout(500)
        print('B state:', await B.evaluate("()=>{const s=JSON.parse(localStorage.getItem('v2fit-store')).state; return {at:s.contentAt, has:Object.keys(s.content.programs), title:s.content.programs.vikas?.days.mon.title, cursor:JSON.parse(localStorage.getItem('v2fit-sync')).cursor}}"))
        print('A state:', await A.evaluate("()=>{const s=JSON.parse(localStorage.getItem('v2fit-store')).state; return {at:s.contentAt, has:Object.keys(s.content.programs)}}"))
        check('B sees A’s edited Monday title', await B.get_by_text('Chest Day ZZ').count()>0)
        await B.screenshot(path='/home/claude/qa/63-b-plan.png')

        # ---------- A logs a weight (raw IDB, like a write from another tab); syncs to B ----------
        await A.get_by_role('button',name='Back').click(); await A.wait_for_timeout(300)
        await A.get_by_role('button',name='Back').click(); await A.wait_for_timeout(300)
        row={'id':'vikas|2026-11-14','person':'vikas','date':'2026-11-14','kg':73.2,'updatedAt':1760000000000+int(2e9)}
        row['updatedAt']=int(__import__('time').time()*1000)
        await A.evaluate(IDB_PUT,['weights',row])
        await sync_now(A); await sync_now(B)
        wB=await B.evaluate(IDB_ALL,'weights')
        check('B received weight 73.2', any(w['kg']==73.2 for w in wB), str(len(wB)))

        # ---------- offline edits on both, then reconnect ----------
        await ctxB.set_offline(True)
        await B.evaluate(IDB_PUT,['weights',{'id':'vikas|2026-11-15','person':'vikas','date':'2026-11-15','kg':73.5,'updatedAt':int(__import__('time').time()*1000)}])
        await sync_now(B)
        check('B shows offline', 'Offline' in await status(B), await status(B))
        await A.evaluate(IDB_PUT,['weights',{'id':'vikas|2026-11-16','person':'vikas','date':'2026-11-16','kg':73.9,'updatedAt':int(__import__('time').time()*1000)}])
        await sync_now(A)
        await ctxB.set_offline(False)
        await B.wait_for_timeout(1500); await sync_now(B); await sync_now(A)
        wA=sorted(w['kg'] for w in await A.evaluate(IDB_ALL,'weights')); wB=sorted(w['kg'] for w in await B.evaluate(IDB_ALL,'weights'))
        check('both phones converged after offline edits', wA==wB==[73.2,73.5,73.9], f'{wA} {wB}')

        # ---------- delete propagates ----------
        await A.evaluate(IDB_DEL,['weights','vikas|2026-11-15'])
        await sync_now(A); await sync_now(B)
        wB=sorted(w['kg'] for w in await B.evaluate(IDB_ALL,'weights'))
        check('delete propagated to B', wB==[73.2,73.9], str(wB))

        # ---------- LWW: both edit title, later wins ----------
        await B.get_by_role('button',name='Settings').click(); await B.wait_for_timeout(400)
        await B.get_by_text('Edit workouts and meals').click(); await B.wait_for_timeout(500)
        await B.get_by_role('tab',name='Mon',exact=True).click(); await B.get_by_label('Session title').fill('Chest Day B-wins'); await B.wait_for_timeout(300)
        await B.wait_for_timeout(3500)
        await sync_now(B) if await B.get_by_role('button',name='Sync now').count() else None
        # reset on A to coach plan -> should win (newer) and revert B
        await A.get_by_role('button',name='Settings').click(); await A.wait_for_timeout(400)
        await sync_now(A)
        await A.get_by_text('Edit workouts and meals').click(); await A.wait_for_timeout(500)
        await A.get_by_role('button',name='Reset to coach plan').click(); await A.wait_for_timeout(300)
        await A.get_by_role('button',name='Reset',exact=True).click(); await A.wait_for_timeout(500)
        await A.wait_for_timeout(3500)
        # B: go back to settings to sync
        await B.get_by_role('button',name='Back').click(); await B.wait_for_timeout(400)
        await sync_now(B)
        await B.get_by_role('button',name='Back').click(); await B.wait_for_timeout(300)
        await B.get_by_role('button',name='Plan',exact=True).click(); await B.wait_for_timeout(500)
        await B.get_by_role('tab',name=re.compile(r'^Mon \d')).first.click(); await B.wait_for_timeout(400)
        gone = (await B.get_by_text('Chest Day B-wins').count())==0 and (await B.get_by_text('Chest Day ZZ').count())==0
        check('reset-to-coach propagated (newest edit wins)', gone)
        await B.screenshot(path='/home/claude/qa/64-b-after-reset.png')

        errs=A.errs+B.errs
        check('no page errors', not errs, str(errs[:3]))
        await b.close()
    print('FAILS:',fails)
asyncio.run(main())
