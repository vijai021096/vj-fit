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
        # one picture exists (a 1x1 webp stand-in), everything else 404s: the page must show exactly that one and leave no gaps
        PX=bytes.fromhex('524946461a000000574542505650384c0d0000002f00000010071011118888fe0700')
        await ctx.route('**/media/routine/arm-circles.webp', lambda r: r.fulfill(status=200, content_type='image/webp', body=PX))
        await pg.goto(URL); await pg.wait_for_timeout(800)
        await pg.get_by_text('I understand').click(); await pg.wait_for_timeout(300)
        await pg.get_by_text('Start as Vikas').click(); await pg.get_by_text('Build my plan').click(); await pg.wait_for_timeout(700)
        await pg.get_by_role('button',name='Got it').click(); await pg.wait_for_timeout(600)
        await pg.get_by_role('button',name='I’m Vikas').click(); await pg.wait_for_timeout(600)
        check('buttons on Today', await pg.get_by_test_id('routine-buttons').count()==1)
        await pg.get_by_role('button',name='Warm-up',exact=True).first.click(); await pg.wait_for_timeout(700)
        check('warm-up shown with drills', await pg.get_by_test_id('warm-routine').count()==1 and 'Arm circles' in await pg.get_by_test_id('warm-routine').inner_text())
        imgs=await pg.get_by_test_id('routine-image').count()
        check('only existing pictures render (others stay hidden)', imgs==1, imgs)
        await pg.get_by_role('tab',name='Cool-down').click(); await pg.wait_for_timeout(500)
        t=await pg.get_by_test_id('cool-routine').inner_text()
        check('cool-down shown with stretches', 'Doorway chest stretch' in t and "Child’s pose" in t, t[:80])
        await pg.get_by_test_id('cool-routine').get_by_role('button',name='Start',exact=True).click(); await pg.wait_for_timeout(1500)
        check('stretch timer runs', await pg.get_by_role('button',name='Pause').count()==1)
        await pg.screenshot(path='/home/claude/qa/105-routines.png')
        check('no page errors', not errs, errs)
        await b.close()
    print('FAILS:',fails)
asyncio.run(main())
