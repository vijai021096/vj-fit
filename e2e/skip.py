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
        await pg.get_by_role('button',name='I’m Vikas').click(); await pg.wait_for_timeout(600)
        check('skip button visible', await pg.get_by_test_id('skip-today').count()==1)
        await pg.screenshot(path='/home/claude/qa/100-skip-btn.png')
        await pg.get_by_test_id('skip-today').click(); await pg.wait_for_timeout(500)
        check('reasons listed', await pg.get_by_test_id('skip-reasons').get_by_role('button').count()==5)
        await pg.get_by_role('button',name='Travelling').click(); await pg.wait_for_timeout(900)
        check('skipped card shown with reason', await pg.get_by_test_id('skipped-card').count()==1 and 'Travelling' in await pg.get_by_test_id('skipped-card').inner_text())
        check('start button replaced', await pg.get_by_test_id('skip-today').count()==0)
        check('ring says Skipped', await pg.get_by_role('button',name=re.compile('Workout: Skipped')).count()==1)
        await pg.screenshot(path='/home/claude/qa/101-skipped.png')
        await pg.reload(); await pg.wait_for_timeout(1500)
        check('survives reload', await pg.get_by_test_id('skipped-card').count()==1)
        await pg.get_by_role('button',name='Undo').click(); await pg.wait_for_timeout(700)
        check('undo restores', await pg.get_by_test_id('skip-today').count()==1 and await pg.get_by_test_id('skipped-card').count()==0)
        check('no page errors', not errs, errs)
        await b.close()
    print('FAILS:',fails)
asyncio.run(main())
