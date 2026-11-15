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
        await pg.get_by_role('button',name='Start',exact=True).click(); await pg.wait_for_timeout(1500)
        await pg.get_by_role('button',name=re.compile('Start lifting')).click(); await pg.wait_for_timeout(1200)
        check('session open', await pg.get_by_text(re.compile('^Next:')).count()>=1)
        svgs=await pg.locator('div.fixed svg[aria-label^="Body map"]').count()
        check('front and back both shown in session', svgs==2, svgs)
        check('no Front/Back toggle in session', await pg.locator('div.fixed button', has_text=re.compile('^(Front|Back)$')).count()==0)
        check('no page errors', not errs, errs)
        await pg.screenshot(path='/home/claude/qa/103-session.png')
        await b.close()
    print('FAILS:',fails)
asyncio.run(main())
