"""Approved 0.4.5 refinement; browser/native mocks, not physical acceptance."""
from playwright.sync_api import sync_playwright
from ui_support import chromium,prepare,render,click
import json,traceback
results=[]
def case(name,fn):
 try:fn();results.append({'name':name,'result':'PASS'})
 except Exception:results.append({'name':name,'result':'FAIL','error':traceback.format_exc()[-1400:]})
with sync_playwright() as p:
 b=chromium(p)
 def fresh(settings=None,width=1920,height=1080):
  page=b.new_page(viewport={'width':width,'height':height});prepare(page,settings,True);render(page);page.wait_for_timeout(220);return page
 def geometry_navigation():
  for w,h in [(1920,1080),(3840,2160)]:
   page=b.new_page(viewport={'width':w,'height':h});prepare(page,{'previewMode':'selected'},True)
   page.evaluate("()=>{window.__rects=[];tizen.tvwindow.getVideoResolution=()=>({width:3840,height:2160});tizen.tvwindow.show=(ok,fail,rect)=>{window.__rects.push(rect);window.__calls.push('show');setTimeout(ok,5)}}")
   render(page);page.wait_for_timeout(450)
   hit=page.locator('#preview-hit');assert hit.get_attribute('aria-label')=='Open PC — HDMI 1'
   assert hit.evaluate('e=>e===document.activeElement')
   assert hit.evaluate('e=>getComputedStyle(e).backgroundColor')=='rgba(0, 0, 0, 0)'
   r=page.evaluate('window.__rects[0]');assert all(x.endswith('%') for x in r)
   x,y,ww,hh=[float(v[:-1])*(w if i%2==0 else h)/100 for i,v in enumerate(r)]
   frame=page.locator('#preview-media').bounding_box();pad=6*h/1080
   assert x>=frame['x']+pad-1 and y>=frame['y']+pad-1
   assert x+ww<=frame['x']+frame['width']-pad+1 and y+hh<=frame['y']+frame['height']-pad+1
   assert abs(ww/hh-16/9)<.001
   before=page.evaluate('window.__calls.slice()');page.keyboard.press('ArrowLeft');assert page.locator('.is-focused').get_attribute('data-zone')=='recent'
   page.keyboard.press('ArrowRight');assert hit.evaluate('e=>e===document.activeElement')
   page.keyboard.press('ArrowDown');assert page.locator('.is-focused').get_attribute('data-zone')=='favourites'
   page.keyboard.press('ArrowUp');page.keyboard.press('ArrowUp');assert page.locator('.is-focused').get_attribute('data-action')=='settings'
   page.keyboard.press('ArrowDown');assert page.evaluate('window.__calls')==before
   page.keyboard.press('Enter');page.wait_for_timeout(120)
   assert page.evaluate('LauncherPlatform.videoStatus().owner')=='fullscreen'
   assert not page.locator('#toast').inner_text().startswith(('Opening','Waiting'))
   page.close()
 case('Selectable preview uses inset normalised bounds and opens only on OK at both viewport sizes',geometry_navigation)
 def focus():
  page=fresh({'previewMode':'off'});tiles=page.locator('#favourites .app-card');tiles.first.focus();page.wait_for_timeout(170)
  page.keyboard.press('ArrowRight');page.keyboard.press('ArrowRight');page.keyboard.press('ArrowRight');page.wait_for_timeout(180)
  frame=page.locator('#focus-frame').bounding_box();target=tiles.nth(3).locator('.logo').bounding_box()
  assert abs(frame['x']-target['x'])<2 and abs(frame['width']-target['width'])<2
  assert page.locator('#focus-frame').count()==1
  page.close()
 case('Rapid focus moves retarget one selection frame without delaying navigation',focus)
 def settings():
  page=fresh({'previewMode':'off'});assert not page.locator('#page-title').is_visible();click(page,'settings')
  for row in [page.locator('#settings-list .setting-row').last,page.locator('#settings-list .setting-row').first]:
   row.focus();page.wait_for_timeout(100);r=row.bounding_box();outer=page.locator('#settings-list').bounding_box()
   assert r['y']>=outer['y']+6 and r['y']+r['height']<=outer['y']+outer['height']-6
  click(page,'setting-profiles');assert 'No presets saved' in page.locator('#modal-text').inner_text()
  page.get_by_role('button',name='Save current Home',exact=True).click();page.locator('.dialog-input').fill('Night');page.get_by_role('button',name='Save',exact=True).click()
  assert page.evaluate('JSON.parse(localStorage.getItem("cinematic-tv-v1")).profiles[0].name')=='Night'
  page.close()
 case('Settings edge rows stay inside padding and profiles explain their empty/save states',settings)
 def undo():
  page=fresh({'favouriteIds':['app:native.0','app:native.1','app:native.3'],'recent':[{'id':'app:native.0','at':1}]});click(page,'apps')
  tile=page.locator('#apps-grid [data-itemid="app:native.0"]');tile.focus();page.keyboard.down('Enter');page.wait_for_timeout(220);page.keyboard.up('Enter');page.get_by_role('button',name='Hide from All Apps',exact=True).click()
  undo=page.locator('#undo-action');assert undo.is_visible() and not undo.evaluate('e=>e===document.activeElement')
  undo.focus();page.keyboard.press('Enter');assert page.locator('#apps-grid [data-itemid="app:native.0"]').count()==1
  page.keyboard.press('Escape');tile=page.locator('#favourites [data-itemid="app:native.1"]');tile.focus();page.keyboard.down('Enter');page.wait_for_timeout(220);page.keyboard.up('Enter');page.get_by_role('button',name='Remove from Home',exact=True).click()
  undo.focus();page.keyboard.press('Enter');assert page.locator('#favourites .app-card').nth(1).get_attribute('data-itemid')=='app:native.1'
  page.close()
 case('Undo hide and remove restores only the changed choice and original pin position',undo)
 def expiry():
  page=fresh();page.clock.install();click(page,'apps');tile=page.locator('#apps-grid .app-card').first;tile.focus();page.keyboard.down('Enter');page.wait_for_timeout(220);page.keyboard.up('Enter');page.get_by_role('button',name='Hide from All Apps',exact=True).click()
  page.locator('#undo-action').focus();page.clock.fast_forward(10010);assert page.locator('#undo-action').is_hidden();assert page.locator('.is-focused').is_visible();page.close()
 case('Undo expires after ten seconds with a safe focus destination',expiry)
 def reduced():
  page=fresh({'reducedMotion':True});page.locator('#favourites .app-card').first.focus();assert page.locator('#focus-frame').evaluate('e=>getComputedStyle(e).transitionDuration')=='0s'
  click(page,'settings');click(page,'setting-dimming');assert page.locator('#ambient-shade').get_attribute('style')=='opacity: 0;';page.close()
 case('Reduced motion disables the moving frame and dimming remains independently switchable',reduced)
 def wallpaper_decode():
  page=fresh({'reducedMotion':False});click(page,'settings');before=page.locator('body > .backdrop').first.get_attribute('style')
  page.evaluate("()=>{window.__images=[];window.Image=class{constructor(){this.naturalWidth=1920;this.naturalHeight=1080}set src(v){this.url=v;window.__images.push(this)}decode(){return new Promise(resolve=>{this.decoded=resolve})}}}")
  def custom(name):
   click(page,'setting-custom');page.locator('.dialog-input').fill('https://images.example.com/'+name+'.jpg');page.get_by_role('button',name='Save',exact=True).click()
  custom('one');assert page.locator('body > .backdrop').first.get_attribute('style')==before
  page.evaluate('window.__images[0].onload()');page.wait_for_timeout(20);assert page.locator('body > .backdrop').first.get_attribute('style')==before
  page.evaluate('window.__images[0].decoded()');page.wait_for_timeout(50)
  assert page.locator('#wallpaper-next').get_attribute('style').endswith('opacity: 1;')
  assert page.locator('body > .backdrop').first.get_attribute('style')==before
  page.wait_for_timeout(550);first=page.locator('body > .backdrop').first.get_attribute('style');assert 'one.jpg' in first
  custom('broken');page.evaluate('window.__images[1].onerror()');assert page.locator('body > .backdrop').first.get_attribute('style')==first
  page.emulate_media(reduced_motion='reduce');custom('two');page.evaluate('window.__images[2].onload()');page.evaluate('window.__images[2].decoded()');page.wait_for_timeout(30)
  assert 'two.jpg' in page.locator('body > .backdrop').first.get_attribute('style');assert 'opacity: 0' in page.locator('#wallpaper-next').get_attribute('style')
  custom('pending');custom('two');page.evaluate('window.__images[3].onload()');page.evaluate('window.__images[3].decoded()');page.wait_for_timeout(30)
  assert 'two.jpg' in page.locator('body > .backdrop').first.get_attribute('style'), 'Late decode replaced a newer wallpaper choice'
  page.close()
 case('Wallpaper waits for decode crossfades once retains good image on failure and honours OS reduced motion',wallpaper_decode)
 def undo_replacement():
  page=fresh();click(page,'apps')
  for id in ['app:native.0','app:native.1']:
   tile=page.locator('#apps-grid [data-itemid="'+id+'"]');tile.focus();page.keyboard.down('Enter');page.wait_for_timeout(220);page.keyboard.up('Enter');page.get_by_role('button',name='Hide from All Apps',exact=True).click()
  page.locator('#undo-action').focus();page.keyboard.press('Enter')
  hidden=page.evaluate('JSON.parse(localStorage.getItem("cinematic-tv-v1")).hiddenAppIds');assert 'app:native.0' in hidden and 'app:native.1' not in hidden
  page.close()
 case('A new hide replaces the undo transaction without restoring the earlier hidden app',undo_replacement)

 b.close()
print(json.dumps(results,indent=2));assert all(x['result']=='PASS' for x in results)
