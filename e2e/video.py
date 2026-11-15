import asyncio, re
from playwright.async_api import async_playwright
URL='http://localhost:4173'
fails=[]
def check(n, ok, extra=''):
    print(('PASS ' if ok else 'FAIL ')+n, extra)
    if not ok: fails.append(n)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=['--autoplay-policy=document-user-activation-required'])
        ctx=await b.new_context(viewport={'width':430,'height':932},is_mobile=True,has_touch=True,reduced_motion='reduce')
        # Simulate iOS refusing autoplay: play() rejects until the user taps. Also keep the video from erroring on codecs.
        await ctx.add_init_script("""
          window.__plays=0; window.__tapped=false
          const orig=HTMLMediaElement.prototype.play
          HTMLMediaElement.prototype.play=function(){window.__plays++; if(!window.__tapped) return Promise.reject(new DOMException('blocked','NotAllowedError')); return Promise.resolve()}
          document.addEventListener('click',()=>{},true)
        """)
        pg=await ctx.new_page(); errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(800)
        await pg.get_by_text('I understand').click(); await pg.wait_for_timeout(300)
        await pg.get_by_text('Start as Vikas').click(); await pg.get_by_text('Build my plan').click(); await pg.wait_for_timeout(700)
        await pg.get_by_role('button',name='Got it').click(); await pg.wait_for_timeout(600)
        await pg.get_by_role('button',name='I’m Vikas').click(); await pg.wait_for_timeout(400)
        await pg.get_by_role('button',name='Library',exact=True).click(); await pg.wait_for_timeout(800)
        await pg.get_by_role('button',name=re.compile('^Back Squat')).first.click(); await pg.wait_for_timeout(1500)
        vids=await pg.locator('div.fixed video').count()
        plays=await pg.evaluate('window.__plays')
        check('video element rendered with a clip', vids==1, vids)
        check('code calls play() itself', plays>=1, plays)
        muted=await pg.evaluate("document.querySelector('div.fixed video').muted")
        check('muted forced in code', muted is True)
        check('play button appears when autoplay is blocked', await pg.get_by_test_id('play-demo').count()==1)
        await pg.evaluate('window.__tapped=true')
        await pg.get_by_test_id('play-demo').click(); await pg.wait_for_timeout(500)
        check('tapping it plays and hides the button', await pg.get_by_test_id('play-demo').count()==0)
        check('no page errors', not errs, errs)
        await b.close()
    print('FAILS:',fails)
asyncio.run(main())
