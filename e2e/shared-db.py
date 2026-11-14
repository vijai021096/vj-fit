import asyncio, re, time
from playwright.async_api import async_playwright
URL='http://localhost:4173'; KEY='test-household-key-1234'
fails=[]
def check(n, ok, extra=''):
    print(('PASS ' if ok else 'FAIL ')+n, extra)
    if not ok: fails.append(n)
async def phone(b,name):
    ctx=await b.new_context(viewport={'width':430,'height':932},is_mobile=True,has_touch=True,reduced_motion='reduce')
    pg=await ctx.new_page(); pg.errs=[]; pg.on('pageerror',lambda e: pg.errs.append(f'{name}: {e}'))
    await pg.goto(URL); await pg.wait_for_timeout(800)
    await pg.get_by_text('I understand').click(); await pg.wait_for_timeout(300)
    return ctx,pg
async def settings(pg):
    await pg.get_by_role('button',name='Settings').click(); await pg.wait_for_timeout(500)
    if await pg.get_by_role('tab',name='Data').count(): await pg.get_by_role('tab',name='Data').click(); await pg.wait_for_timeout(300)
async def status(pg):
    return await pg.get_by_test_id('sync-status').inner_text()
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        ctxA,A=await phone(b,'A')
        await A.get_by_text('Start as Vikas').click(); await A.get_by_text('Build my plan').click(); await A.wait_for_timeout(700)
        await A.get_by_role('button',name='Got it').click(); await A.wait_for_timeout(300)
        if await A.get_by_role('dialog',name='Whose phone is this?').count(): await A.get_by_role('button',name='I’m Vikas').click(); await A.wait_for_timeout(300)
        # wrong key first
        await settings(A)
        await A.get_by_label('Household key').fill('definitely-not-the-key-123')
        await A.get_by_role('button',name='Connect',exact=True).click(); await A.wait_for_timeout(1200)
        check('wrong key is rejected with a message', await A.get_by_role('alert').count()>0, await A.get_by_role('alert').first.inner_text() if await A.get_by_role('alert').count() else '')
        await A.get_by_label('Household key').fill(KEY)
        await A.get_by_role('button',name='Connect',exact=True).click(); await A.wait_for_timeout(2500)
        check('A connected', 'Up to date' in await status(A), await status(A))
        check('no pairing UI left', await A.get_by_text('Add another phone').count()==0)
        await A.screenshot(path='/home/claude/qa/70-a-connected.png')
        await A.get_by_role('button',name='Back').click(); await A.wait_for_timeout(300)

        # A logs: weight via IDB, ticks a meal, water, steps
        await A.get_by_role('button',name='Diet',exact=True).click(); await A.wait_for_timeout(600)
        ticks=A.get_by_label(re.compile('as eaten'))
        n=await ticks.count(); check('A can tick meals today', n>0, str(n))
        if n:
            await ticks.nth(0).click(); await A.wait_for_timeout(300)
            if n>1: await ticks.nth(0).click(); await A.wait_for_timeout(300)
        await A.wait_for_timeout(3500)

        # B: fresh phone, joins from welcome screen with the key
        ctxB,B=await phone(b,'B')
        await B.get_by_text('Connect it here').click(); await B.wait_for_timeout(500)
        await B.get_by_label('Household key').fill(KEY)
        await B.get_by_role('button',name='Connect',exact=True).click(); await B.wait_for_timeout(3500)
        await B.reload(); await B.wait_for_timeout(1500)
        await B.get_by_text('Start as Vikas').click(); await B.wait_for_timeout(1000)
        if await B.get_by_role('button',name='Got it').count(): await B.get_by_role('button',name='Got it').click(); await B.wait_for_timeout(300)
        if await B.get_by_role('dialog',name='Whose phone is this?').count(): await B.get_by_role('button',name='I’m Vikas').click(); await B.wait_for_timeout(300)
        check('B skipped onboarding — Vikas profile came from the shared DB', await B.get_by_role('button',name='Settings').count()==1)
        await settings(B)
        check('B connected', 'Up to date' in await status(B), await status(B))
        await B.get_by_role('button',name='Back').click(); await B.wait_for_timeout(300)

        # B sees A's meal ticks in Insights
        await B.get_by_role('button',name='Progress',exact=True).click(); await B.wait_for_timeout(700)
        await B.get_by_role('button',name=re.compile('^Insights')).click(); await B.wait_for_timeout(1200)
        txt=await B.get_by_test_id('insight-tiles').inner_text()
        print('B tiles:', txt.replace('\n',' | '))
        m=re.search(r'EATEN / DAY\s*\n?\s*([\d,]+)',txt,re.I)
        check('B Insights shows calories eaten from A’s ticks', bool(m) and int(m.group(1).replace(',',''))>0, txt.replace('\n',' | '))
        await B.screenshot(path='/home/claude/qa/71-b-insights.png',full_page=False)
        check('side-by-side comparison renders', await B.get_by_test_id('compare').count()==1)

        # B logs for Varsha; A sees Varsha's data
        await B.get_by_role('button',name='Back').first.click(); await B.wait_for_timeout(1000)
        await B.get_by_role('tab',name='Varsha').first.click(); await B.wait_for_timeout(600)
        if await B.get_by_text('Save and switch').count():
            await B.get_by_text('Save and switch').click(); await B.wait_for_timeout(900)
            if await B.get_by_role('button',name='Got it').count(): await B.get_by_role('button',name='Got it').click()
        print('B varsha onboarded:', await B.evaluate("()=>JSON.parse(localStorage.getItem('v2fit-store')).state.profiles.varsha.onboarded"), 'onboarding visible:', await B.get_by_text('Build my plan').count())
        await B.screenshot(path='/home/claude/qa/72-b-varsha.png')
        await B.wait_for_timeout(3500)
        await settings(A) if await A.get_by_role('button',name='Settings').count() else None
        await A.get_by_role('button',name='Sync now').click(); await A.wait_for_timeout(2000)
        prof=await A.evaluate("()=>JSON.parse(localStorage.getItem('v2fit-store')).state.profiles.varsha.onboarded")
        check('A received Varsha’s profile created on B', prof is True, str(prof))
        errs=A.errs+B.errs
        check('no page errors', not errs, str(errs[:3]))
        await b.close()
    print('FAILS:',fails)
asyncio.run(main())
