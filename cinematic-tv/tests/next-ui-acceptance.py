"""Approved next UI regressions. Native API stubs are not hardware acceptance."""
from playwright.sync_api import sync_playwright
from ui_support import chromium,prepare,render,click
import json,traceback
results=[]
with sync_playwright() as p:
 b=chromium(p)
 def case(name,fn):
  try:fn();results.append({'name':name,'result':'PASS'})
  except Exception:results.append({'name':name,'result':'FAIL','error':traceback.format_exc()[-1300:]})
 def fresh(settings=None,w=1920,h=1080):
  page=b.new_page(viewport={'width':w,'height':h});prepare(page,settings,True);render(page);page.wait_for_timeout(400);return page
 def seven():
  page=fresh();assert page.locator('#favourites .app-card .name').all_text_contents()==['YouTube','Crunchyroll','Apple TV','Netflix','Paramount+','Disney+','Prime Video','All apps']
  page.locator('#favourites .app-card').nth(6).focus();page.keyboard.press('ArrowRight');assert page.locator('.is-focused').get_attribute('data-action')=='apps'
  page.keyboard.press('Enter');assert page.locator('#apps').is_visible();page.keyboard.press('Escape');assert page.locator('#favourites [data-action="apps"]').evaluate('e=>e===document.activeElement')
  page.locator('.home-footer [data-action="apps"]').focus();page.keyboard.press('Enter');page.keyboard.press('Escape')
  assert page.locator('.home-footer [data-action="apps"]').evaluate('e=>e===document.activeElement')
  page.close()
 case('Seven apps followed by library with Back focus restoration',seven)
 def frame():
  for w,h in [(1920,1080),(3840,2160)]:
   page=fresh(None,w,h);click(page,'apps');cards=page.locator('#apps-grid .app-card');cards.first.focus();page.keyboard.press('ArrowDown');assert cards.nth(6).evaluate('e=>e===document.activeElement')
   page.wait_for_timeout(150);art=cards.nth(6).locator('.logo');assert float(art.evaluate('e=>getComputedStyle(e).borderTopWidth')[:-2])>=3
   assert page.locator('#focus-frame').is_hidden();assert page.locator('.is-focused').count()==1;page.close()
 case('All Apps column navigation and local selection edge at 1080p and 4K',frame)
 def fastpath():
  page=fresh({'pcPort':'HDMI 1','previewMode':'selected'});page.evaluate('()=>{window.__reads=0;const old=tizen.tvwindow.getSource;tizen.tvwindow.getSource=(...a)=>{window.__reads++;return old(...a)}}')
  before=page.evaluate('__calls.slice()');page.locator('#favourites .app-card').first.focus()
  for i in range(40):page.keyboard.press('ArrowRight' if i%2==0 else 'ArrowLeft')
  assert page.evaluate('__reads')==0;assert page.evaluate('__calls')==before;page.close()
 case('Healthy favourite movement performs no native source queries or plane operations',fastpath)
 def static_pc():
  page=fresh({'pcPort':'HDMI 1','previewMode':'off'})
  page.locator('#favourites .app-card').nth(3).focus()
  assert page.locator('#preview-title').inner_text()=='PC'
  assert page.locator('#preview-art .monitor-mock').count()==1
  assert page.locator('#preview-art .hero-logo').count()==0
  page.close()
 case('Preview Off retains the PC frame while browsing apps',static_pc)
 b.close()
print(json.dumps(results,indent=2));raise SystemExit(any(x['result']=='FAIL' for x in results))
