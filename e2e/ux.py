import asyncio, re
from playwright.async_api import async_playwright
URL='http://localhost:4173'
fails=[]
def check(n, ok, extra=''):
    print(('PASS ' if ok else 'FAIL ')+n, extra)
    if not ok: fails.append(n)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        ctx=await b.new_context(viewport={'width':430,'height':932},is_mobile=True,has_touch=True,reduced_motion='reduce')
        pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(800)
        await pg.get_by_text('I understand').click(); await pg.wait_for_timeout(300)
        await pg.get_by_text('Start as Vikas').click(); await pg.get_by_text('Build my plan').click(); await pg.wait_for_timeout(700)
        await pg.get_by_role('button',name='Got it').click(); await pg.wait_for_timeout(600)
        # who-owns-this-phone
        check('asks whose phone this is', await pg.get_by_role('dialog',name='Whose phone is this?').count()==1)
        await pg.get_by_role('button',name='I’m Vikas').click(); await pg.wait_for_timeout(400)
        check('me stored locally', await pg.evaluate("()=>JSON.parse(localStorage.getItem('v2fit-store')).state.me")=='vikas')
        await pg.screenshot(path='/home/claude/qa/80-today.png')
        # viewing the other person shows a banner
        await pg.get_by_role('tab',name='Varsha').first.click(); await pg.wait_for_timeout(600)
        if await pg.get_by_text('Save and switch').count():
            await pg.get_by_text('Save and switch').click(); await pg.wait_for_timeout(900)
            if await pg.get_by_role('button',name='Got it').count(): await pg.get_by_role('button',name='Got it').click()
        check('banner when viewing the other person', await pg.get_by_test_id('viewing-banner').count()==1)
        await pg.screenshot(path='/home/claude/qa/81-banner.png')
        await pg.get_by_role('button',name='Back to mine').click(); await pg.wait_for_timeout(400)
        check('banner gone on own profile', await pg.get_by_test_id('viewing-banner').count()==0)
        # ate something else
        await pg.get_by_role('button',name='Diet',exact=True).click(); await pg.wait_for_timeout(600)
        await pg.get_by_role('button',name='I ate something else').click(); await pg.wait_for_timeout(400)
        await pg.get_by_role('button',name='Samosa').click()
        await pg.get_by_role('button',name='Add to today').click(); await pg.wait_for_timeout(500)
        check('extra row shown', await pg.get_by_test_id('extra-row').count()==1, await pg.get_by_test_id('extra-row').first.inner_text())
        txt=await pg.locator('main').inner_text()
        check('calories bar includes the samosa', re.search(r'260\s*/\s*[\d,]+\s*kcal',txt) is not None, '')
        await pg.screenshot(path='/home/claude/qa/82-extra.png')
        # insights
        await pg.get_by_role('button',name='Progress',exact=True).click(); await pg.wait_for_timeout(700)
        await pg.get_by_role('button',name=re.compile('^Insights')).click(); await pg.wait_for_timeout(1200)
        tiles=await pg.get_by_test_id('insight-tiles').inner_text()
        m=re.search(r'EATEN / DAY\s*\n?\s*([\d,]+)',tiles,re.I)
        check('Insights counts the extra', bool(m) and int(m.group(1).replace(',',''))==260, tiles.replace('\n',' | '))
        check('plain-language summary shown', await pg.get_by_test_id('summary').count()==1, (await pg.get_by_test_id('summary').inner_text()).replace('\n',' | ') if await pg.get_by_test_id('summary').count() else '')
        await pg.screenshot(path='/home/claude/qa/83-insights.png')
        await pg.get_by_role('button',name='Back',exact=True).first.click(); await pg.wait_for_timeout(500)
        # settings tabs + hide weight
        await pg.get_by_role('button',name='Settings').click(); await pg.wait_for_timeout(500)
        check('settings starts on You tab', await pg.get_by_text('Whose phone is this?').count()==1)
        await pg.get_by_role('tab',name='Data').click(); await pg.wait_for_timeout(300)
        check('Data tab holds shared data + backup', await pg.get_by_text('Shared data').count()>0 and await pg.get_by_text('Backup',exact=True).count()>0)
        await pg.get_by_role('tab',name='Plan').click(); await pg.wait_for_timeout(300)
        check('Plan tab holds the editor', await pg.get_by_text('Edit workouts and meals').count()==1)
        await pg.get_by_role('tab',name='You').click(); await pg.wait_for_timeout(300)
        await pg.get_by_role('switch',name='Hide my weight').click(); await pg.wait_for_timeout(300)
        await pg.get_by_role('tab',name='Varsha').last.click(); await pg.wait_for_timeout(300)
        await pg.get_by_role('button',name='Back',exact=True).first.click(); await pg.wait_for_timeout(300)
        await pg.get_by_role('tab',name='Vikas').first.click(); await pg.wait_for_timeout(500)
        await pg.get_by_role('button',name='Progress',exact=True).click(); await pg.wait_for_timeout(700)
        check('hidden weight is not shown to the other phone', await pg.get_by_text('keep their weight private').count()==1)
        await pg.get_by_role('button',name='Today',exact=True).click(); await pg.wait_for_timeout(500)
        check('no weigh-in card for hidden person', await pg.get_by_text('Quick weigh-in').count()==0)
        check('no page errors', not errs, str(errs[:3]))
        await b.close()
    print('FAILS:',fails)
asyncio.run(main())
