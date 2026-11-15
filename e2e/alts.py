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
        await pg.get_by_role('button',name='I’m Vikas').click(); await pg.wait_for_timeout(400)
        await pg.get_by_role('button',name='Diet',exact=True).click(); await pg.wait_for_timeout(1500)
        n=await pg.get_by_test_id('meal-alts').count()
        check('alternatives shown on cards', n>=4, n)
        check('two per card at most', await pg.get_by_test_id('meal-alts').first.get_by_test_id('meal-alt').count()<=2)
        check('swap button still there', await pg.get_by_role('button',name=re.compile('^Swap')).count()>=4)
        await pg.screenshot(path='/home/claude/qa/102-alts.png')
        card=pg.locator('div.card',has=pg.get_by_test_id('meal-alts')).first
        before=await card.inner_text()
        alt=card.get_by_test_id('meal-alt').first
        altname=(await alt.inner_text()).split('\n')[0].strip()
        await alt.click(); await pg.wait_for_timeout(900)
        after=await pg.locator('div.card',has_text=altname).first.inner_text()
        check('tapping an alternative swaps it in', altname[:12] in after.split('Or have instead')[0], altname)
        check('no page errors', not errs, errs)
        await b.close()
    print('FAILS:',fails)
asyncio.run(main())
