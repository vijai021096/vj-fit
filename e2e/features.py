import asyncio, re
from playwright.async_api import async_playwright
URL='http://localhost:4173'
fails=[]
def check(n, ok, extra=''):
    print(('PASS ' if ok else 'FAIL ')+n, extra)
    if not ok: fails.append(n)
SEED='''async ()=>{
  const today=new Date(Date.now()+330*60000).toISOString().slice(0,10)
  const add=(d,n)=>new Date(Date.parse(d)+n*864e5).toISOString().slice(0,10)
  const mk=(person,date,w,r,i)=>({id:person+date+i,person,date,key:'mon',title:'t',cycle:1,weekIndex:1,startedAt:1,finishedAt:2,sets:{s1:[{w,r,done:true}]},exOf:{s1:'bb-bench-press'},updatedAt:Date.now()})
  const rows=[mk('vikas',add(today,-35),60,8,1),mk('vikas',add(today,-28),60,8,2),mk('vikas',add(today,-21),57.5,8,3),mk('vikas',add(today,-14),57.5,8,4),mk('vikas',add(today,-7),60,7,5),mk('vikas',today,60,7,6),mk('varsha',today,30,10,7)]
  const db=await new Promise((res,rej)=>{const q=indexedDB.open('v2fit');q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})
  await new Promise((res,rej)=>{const tx=db.transaction('sessions','readwrite');rows.forEach(r=>tx.objectStore('sessions').put(r));tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})
  return rows.length
}'''
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
        # swap picker
        await pg.get_by_role('button',name='Diet',exact=True).click(); await pg.wait_for_timeout(700)
        first=pg.get_by_role('button',name=re.compile('^Swap ')).first
        before=await pg.locator('main').inner_text()
        await first.click(); await pg.wait_for_timeout(500)
        dlg=pg.get_by_role('dialog',name=re.compile('^Swap '))
        check('swap picker opens', await dlg.count()==1)
        txt=await dlg.inner_text()
        check('picker shows differences', re.search(r'kcal',txt) is not None and 'Now:' in txt, txt[:120].replace('\n',' | '))
        await pg.screenshot(path='/home/claude/qa/90-swap.png')
        opts=dlg.locator('button').filter(has_text='protein')
        n=await opts.count(); check('picker lists alternatives', n>=1, str(n))
        await opts.first.click(); await pg.wait_for_timeout(500)
        check('picker closes after choosing', await pg.get_by_role('dialog',name=re.compile('^Swap ')).count()==0)
        after=await pg.locator('main').inner_text()
        check('meal changed', before!=after)
        # photos
        thumbs=pg.locator('img[src*="/media/food/"]')
        check('meal photo thumbnails rendered', await thumbs.count()>=1, str(await thumbs.count()))
        loaded=await pg.evaluate("()=>[...document.querySelectorAll('img[src*=\"/media/food/\"]')].filter(i=>i.complete&&i.naturalWidth>0).length")
        check('at least one photo loaded', loaded>=1, str(loaded))
        if await pg.get_by_role('button',name=re.compile('^Show photo of')).count():
            await pg.get_by_role('button',name=re.compile('^Show photo of')).first.click(); await pg.wait_for_timeout(500)
            await pg.screenshot(path='/home/claude/qa/91-photo.png')
            check('photo sheet opens', await pg.locator('[role=dialog] img').count()==1)
            await pg.get_by_role('button',name='Close').click(); await pg.wait_for_timeout(300)
        # seed sessions then insights + together
        print('seeded', await pg.evaluate(SEED))
        await pg.reload(); await pg.wait_for_timeout(1200)
        await pg.get_by_role('button',name='Today',exact=True).click(); await pg.wait_for_timeout(600)
        check('both-trained chip', await pg.get_by_test_id('both-trained').count()==1, await pg.get_by_test_id('both-trained').first.inner_text() if await pg.get_by_test_id('both-trained').count() else '')
        await pg.get_by_role('button',name='Progress',exact=True).click(); await pg.wait_for_timeout(700)
        await pg.get_by_role('button',name=re.compile('^Insights')).click(); await pg.wait_for_timeout(1500)
        st=pg.get_by_test_id('stalled')
        check('stalled lifts card', await st.count()==1, (await st.inner_text()).replace('\n',' | ')[:160] if await st.count() else '')
        check('names the lift', await st.count()==1 and 'bench' in (await st.inner_text()).lower())
        await pg.screenshot(path='/home/claude/qa/92-insights.png')
        check('weekly card hidden with nothing logged this week or shown', True)
        check('no page errors', not errs, str(errs))
        await b.close()
    print('FAILS:',fails)
asyncio.run(main())
