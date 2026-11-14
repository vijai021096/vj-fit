import asyncio
from playwright.async_api import async_playwright
URL='http://localhost:4173'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        ctx=await b.new_context(viewport={'width':430,'height':932},is_mobile=True,has_touch=True,reduced_motion='reduce')
        pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(800)
        await pg.get_by_text('I understand').click(); await pg.get_by_text('Start as Vikas').click(); await pg.get_by_text('Build my plan').click(); await pg.wait_for_timeout(700)
        await pg.get_by_role('button',name='Got it').click(); await pg.wait_for_timeout(400)
        await pg.get_by_role('button',name='I’m Vikas').click(); await pg.wait_for_timeout(400)
        await pg.get_by_role('button',name='Library',exact=True).click(); await pg.wait_for_timeout(600)
        await pg.get_by_text('Dumbbell Curl',exact=True).first.click(); await pg.wait_for_timeout(1500)
        v=pg.locator('video')
        print('video elements:', await v.count())
        if await v.count():
            print('src:', await v.first.get_attribute('src'), 'readyState:', await v.first.evaluate('e=>e.readyState'), 'size:', await v.first.evaluate('e=>[e.videoWidth,e.videoHeight]'))
        await pg.screenshot(path='/home/claude/qa/90-video.png')
        print('errors:', errs)
        await b.close()
asyncio.run(main())
