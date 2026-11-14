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
        pg=await ctx.new_page()
        await pg.goto(URL); await pg.wait_for_timeout(800)
        await pg.get_by_text('I understand').click(); await pg.wait_for_timeout(300)
        await pg.get_by_text('Start as Vikas').click(); await pg.get_by_text('Build my plan').click(); await pg.wait_for_timeout(700)
        await pg.get_by_role('button',name='Got it').click(); await pg.wait_for_timeout(600)
        await pg.get_by_role('button',name='I’m Vikas').click(); await pg.wait_for_timeout(400)
        await pg.get_by_role('button',name='Library',exact=True).click(); await pg.wait_for_timeout(1200)
        imgs=await pg.locator('main img[src^="/media/hf/"]').count()
        check('library thumbs use our posters',imgs>5,imgs)
        await pg.screenshot(path='/home/claude/qa/95-lib.png')
        await pg.get_by_role('button',name=re.compile('^Back Squat')).first.click(); await pg.wait_for_timeout(900)
        svgs=await pg.locator('div.fixed svg[aria-label^="Body map"]').count()
        check('both body views on detail',svgs==2,svgs)
        check('no flip button on detail',await pg.get_by_role('button',name=re.compile('Show (front|back)')).count()==0)
        pass
        await pg.screenshot(path='/home/claude/qa/96-detail.png')
        await b.close()
    print('FAILS:',fails)
asyncio.run(main())
