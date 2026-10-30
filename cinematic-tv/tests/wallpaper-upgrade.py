"""Real file-origin loading and v1 IndexedDB migration; no TV acceptance claim."""
import json,os
from playwright.sync_api import sync_playwright
from ui_support import ROOT,server,click
with sync_playwright() as p:
 opts={'headless':True,'chromium_sandbox':True}
 if os.getenv('SANDBOXED_CHROMIUM_CHANNEL'):opts['channel']=os.getenv('SANDBOXED_CHROMIUM_CHANNEL')
 browser=p.chromium.launch(**opts)
 page=browser.new_page(viewport={'width':1920,'height':1080});page.set_default_timeout(4000)
 page.route('https://**/*',lambda r:r.abort())
 page.add_init_script("localStorage.setItem('cinematic-tv-v1',JSON.stringify({version:1,setupDone:true,wallpaper:'curated',previewMode:'off',reducedMotion:true}))")
 page.goto((ROOT/'src/index.html').as_uri(),wait_until='load');page.wait_for_timeout(250)
 assert page.evaluate('typeof LauncherWallpaperData')=='object','Packaged data must load without local Fetch support'
 click(page,'settings');click(page,'setting-wallpaper');page.wait_for_timeout(300)
 assert 'Catalogue unavailable' not in page.locator('.wallpaper-manager-status').inner_text()
 # Leaving a nested panel via the rail must restore ordinary Appearance content.
 page.locator('[data-action="wallpaper-next"]').focus();page.keyboard.press('ArrowLeft');page.keyboard.press('ArrowDown');page.keyboard.press('ArrowUp');page.keyboard.press('ArrowRight')
 assert page.locator('.settings-group:not([hidden]) h2').inner_text()=='Appearance'
 page.close()
 with server() as origin:
  page=browser.new_page(viewport={'width':1920,'height':1080});page.route('https://**/*',lambda r:r.abort())
  page.goto(origin+'/assets/',wait_until='load')
  page.evaluate('''async()=>{
   const blob=await(await fetch('wallpaper.jpg')).blob();
   await new Promise((resolve,reject)=>{const req=indexedDB.open('cinematic-tv-wallpaper',1);req.onupgradeneeded=()=>req.result.createObjectStore('images');req.onerror=()=>reject(req.error);req.onsuccess=()=>{const db=req.result,tx=db.transaction('images','readwrite');tx.objectStore('images').put({blob,day:'2026-01-01',at:1,title:'Original saved photo',credit:'Original Photographer · CC BY 4.0',source:'https://commons.wikimedia.org/wiki/File:Original.jpg'},'daily');tx.oncomplete=()=>{db.close();resolve()}}});
   localStorage.setItem('cinematic-tv-v1',JSON.stringify({version:1,setupDone:true,wallpaper:'daily',previewMode:'off',reducedMotion:true}));
  }''')
  page.goto(origin,wait_until='load');page.wait_for_timeout(600)
  result=page.evaluate('''async()=>{const rows=await LauncherWallpapers.browserCacheV2(indexedDB).readAll();let legacy;try{legacy=await LauncherWallpapers.browserCache(indexedDB).read()}catch(e){return{error:e.name,rows:rows.length}};return{ids:rows.map(r=>r.id),legacyCredit:legacy?.credit,background:document.querySelector('body > .backdrop').style.backgroundImage,usage:await LauncherWallpapers.browserCacheV2(indexedDB).usage()}}''')
  assert result.get('ids')==['legacy-daily'],result
  assert result['legacyCredit']=='Original Photographer · CC BY 4.0'
  assert 'blob:' in result['background'] and result['usage']['count']==1
  assert result['usage']['bytes']>=(ROOT/'src/assets/wallpaper.jpg').stat().st_size
  page.close()
 browser.close()
print(json.dumps({'result':'PASS','file_origin_catalogue':True,'category_panel_restore':True,'v1_offline_photo_preserved':True,'legacy_reader_after_upgrade':True}))
