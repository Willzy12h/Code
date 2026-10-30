"""Exact local-origin app and CSP; storage/decoder are real, external image responses controlled."""
from pathlib import Path
import json,os,time
from playwright.sync_api import sync_playwright
from ui_support import server,ROOT
with server() as origin,sync_playwright() as p:
 opts={'headless':True,'chromium_sandbox':True}
 if os.getenv('SANDBOXED_CHROMIUM_CHANNEL'):opts['channel']=os.getenv('SANDBOXED_CHROMIUM_CHANNEL')
 browser=p.chromium.launch(**opts)
 page=browser.new_page(viewport={'width':1920,'height':1080});errors=[]
 def wait_async(expression,arg=None):
  # Playwright's RAF predicate treats a returned Promise as truthy. Evaluate awaits it.
  deadline=time.monotonic()+10
  while time.monotonic()<deadline:
   if page.evaluate(expression,arg):return
   page.wait_for_timeout(50)
  raise AssertionError('Asynchronous browser condition did not become true')
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.route('https://api.open-meteo.com/**',lambda r:r.fulfill(status=200,content_type='application/json',body='{"current":{"temperature_2m":13,"weather_code":2}}'))
 page.route('https://api.github.com/**',lambda r:r.fulfill(status=404,body='{}'))
 page.route('https://upload.wikimedia.org/**',lambda r:r.fulfill(status=200,content_type='image/jpeg',body=(ROOT/'src/assets/wallpaper.jpg').read_bytes()))
 page.clock.install()
 page.add_init_script("if(!localStorage.getItem('cinematic-tv-v1'))localStorage.setItem('cinematic-tv-v1',JSON.stringify({version:1,setupDone:true,wallpaper:'curated',previewMode:'off'}))")
 page.goto(origin,wait_until='networkidle');page.wait_for_function("()=>document.querySelector('#favourites .library-card')")
 page.locator('[data-action="settings"]').click();page.locator('.settings-category[data-group="appearance"]').click();page.locator('[data-action="setting-wallpaper"]').click()
 assert page.locator('.settings-group:not([hidden]) h2').inner_text()=='Wallpapers'
 # Drive the idle schedule, using actual JPEG decoding and the real browser database.
 page.clock.fast_forward(31000)
 wait_async("async()=>{let rows=await LauncherWallpapers.browserCacheV2(indexedDB).readAll();return rows.length===1&&rows[0].bootUri?.startsWith('data:image/jpeg;base64,')}")
 # Three seeds plus the newly prepared image: do not assume its catalogue position.
 for i in range(4):
  before=page.evaluate("async()=>(await LauncherWallpapers.browserCacheV2(indexedDB).getMeta()).current")
  page.locator('[data-action="wallpaper-next"]').click()
  wait_async("async previous=>{const m=await LauncherWallpapers.browserCacheV2(indexedDB).getMeta();return m.current&&m.current!==previous}",before)
  if page.evaluate("document.querySelector('body > .backdrop').style.backgroundImage.includes('blob:')"):break
 page.wait_for_function("()=>document.querySelector('body > .backdrop').style.backgroundImage.includes('blob:')")
 assert page.evaluate("JSON.parse(localStorage.getItem('cinematic-tv-wallpaper-boot')).uri.startsWith('data:image/jpeg;base64,')")
 page.locator('[data-action="setting-wallpaper-credits"]').click()
 catalogue=json.loads((ROOT/'src/assets/wallpapers/catalogue.json').read_text(encoding='utf-8'))
 current_id=page.evaluate("async()=>(await LauncherWallpapers.browserCacheV2(indexedDB).getMeta()).current")
 current=next(x for x in catalogue['images'] if x['id']==current_id)
 assert current['author'] in page.locator('#modal-text').inner_text()
 assert current['license'] in page.locator('#modal-text').inner_text()
 page.keyboard.press('Escape')
 page.route('https://upload.wikimedia.org/**',lambda r:r.abort())
 page.reload(wait_until='networkidle')
 page.wait_for_function("()=>document.querySelector('body > .backdrop').style.backgroundImage.includes('blob:')")
 page.locator('[data-action="settings"]').click();page.locator('.settings-category[data-group="appearance"]').click();page.locator('[data-action="setting-wallpaper"]').click()
 page.locator('[data-action="wallpaper-rotation"]').click();assert page.evaluate("JSON.parse(localStorage.getItem('cinematic-tv-v1')).wallpaperRotation") is False
 page.locator('[data-action="wallpaper-topic"][data-topic="abstract"]').click();assert 'abstract' not in page.evaluate("JSON.parse(localStorage.getItem('cinematic-tv-v1')).wallpaperTopics")
 # Real IndexedDB transactions: both limits, protected entries, aborted replacement.
 result=page.evaluate('''async()=>{
  const cache=LauncherWallpapers.browserCacheV2(indexedDB),raw=await (await fetch('assets/wallpapers/catalogue.json')).json(),item=raw.images[0],jpeg=await (await fetch('assets/wallpaper.jpg')).blob();
  const blob=new Blob([jpeg,new Uint8Array(4*1024*1024-jpeg.size)],{type:'image/jpeg'});
  await cache.clearDownloaded();
  for(let i=0;i<8;i++)await cache.commit({...item,id:'test-'+i,blob,at:i},['test-0']);
  const before=(await cache.readAll()).map(x=>x.id).sort(),usage=await cache.usage();
  const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value,...args){if(value?.id==='test-fail')throw new DOMException('quota','QuotaExceededError');return put.call(this,value,...args)};
  let rejected=false;try{await cache.commit({...item,id:'test-fail',blob,at:99},['test-0'])}catch(e){rejected=true}finally{IDBObjectStore.prototype.put=put}
  const after=(await cache.readAll()).map(x=>x.id).sort();await cache.clearDownloaded();return{before,after,usage,rejected};
 }''')
 assert result['usage']=={'count':6,'bytes':24*1024*1024}
 assert 'test-0' in result['before'] and result['before']==result['after'] and result['rejected']
 page.keyboard.press('Escape');assert page.locator('.settings-group:not([hidden]) h2').inner_text()=='Appearance','Back leaves embedded panel before closing Settings'
 page.keyboard.press('Escape');page.locator('.home-footer [data-action="inputs"]').click()
 assert page.locator('#home').is_visible() and page.locator('#inputs').is_visible()
 assert page.locator('#inputs').bounding_box()['width']<1920*.5
 # An active policy probe in sandboxed Chromium must reject remote and inline code.
 blocked=page.evaluate('''async()=>{
  window.__inlineExecuted=false;const script=document.createElement('script');script.textContent='window.__inlineExecuted=true';document.head.append(script);
  let denied=false;try{await fetch('https://unapproved.example.invalid/test')}catch(e){denied=true}
  return{inline:window.__inlineExecuted,denied};
 }''')
 assert blocked=={'inline':False,'denied':True};assert not errors,errors
 print(json.dumps({'result':'PASS','scope':'unchanged-origin/sandboxed browser; real IndexedDB/decoder, controlled external images; not TV acceptance','download_decode_boot_offline_reload':True,'cache':result['usage'],'abort_preserves_cache':True,'embedded_back':True,'inputs_overlay':True,'active_CSP':blocked,'errors':errors},indent=2))
 browser.close()
