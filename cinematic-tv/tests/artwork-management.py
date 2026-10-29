"""Artwork, hidden consumer apps and sparse recents; no physical-TV acceptance."""
import json,traceback
from playwright.sync_api import sync_playwright
from ui_support import chromium,prepare,render,click
results=[]
def case(name,fn):
 try:fn();results.append({'name':name,'result':'PASS'})
 except Exception as e:results.append({'name':name,'result':'FAIL','error':traceback.format_exc()[-1000:]})
with sync_playwright() as p:
 browser=chromium(p)
 def fresh(settings=None):
  page=browser.new_page(viewport={'width':1920,'height':1080});prepare(page,settings,True);render(page);page.wait_for_timeout(100);return page
 def artwork():
  page=fresh();cards=page.locator('#favourites .app-card')
  for index in [0,1,2,3,4]:
   assert cards.nth(index).locator('svg').count()==1, 'Common favourite lacks local vector artwork'
   assert cards.nth(index).locator('img').count()==0
  page.close()
 case('Known favourites use local vectors with no native padded icon',artwork)
 def native_fallback():
  page=browser.new_page(viewport={'width':1920,'height':1080});prepare(page,{'favouriteIds':['app:native.1']},True)
  page.evaluate("(url)=>{window.__apps[1].name='constructor';window.__apps[1].iconPath=url}", 'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2220%22%20height=%2220%22%3E%3Crect%20width=%2220%22%20height=%2220%22%20fill=%22red%22/%3E%3C/svg%3E')
  render(page);page.wait_for_timeout(100)
  card=page.locator('#favourites .app-card');assert card.locator('img.native-icon').count()==1 and card.locator('svg').count()==0
  page.close()
 case('Unknown app names including prototype keys retain native artwork fallback',native_fallback)

 def hide_restore():
  page=fresh({'favouriteIds':['app:native.0','app:native.12'],'recent':[{'id':'app:native.12','name':'Spotify','at':1}]})
  click(page,'apps');tile=page.locator('#apps-grid [data-itemid="app:native.12"]');tile.focus();page.keyboard.down('Enter');page.wait_for_timeout(230);page.keyboard.up('Enter')
  page.get_by_role('button',name='Hide from All Apps',exact=True).click()
  assert page.locator('#apps-grid [data-itemid="app:native.12"]').count()==0
  assert page.evaluate('JSON.parse(localStorage.getItem("cinematic-tv-v1")).favouriteIds.includes("app:native.12")')
  page.evaluate('window.__packages.onupdated({})');page.wait_for_timeout(350)
  assert page.locator('#apps-grid [data-itemid="app:native.12"]').count()==0
  click(page,'manage-hidden');assert page.locator('#modal-title').inner_text()=='Hidden apps'
  page.get_by_role('button',name='Restore Spotify',exact=True).click()
  assert 'No installed apps are hidden' in page.locator('#modal-text').inner_text()
  page.get_by_role('button',name='Done',exact=True).click()
  assert page.locator('#apps-grid [data-itemid="app:native.12"]').count()==1
  assert not page.evaluate('window.__calls.some(x=>x.startsWith("launch:"))')
  page.close()
 case('Hide and restore a consumer app without uninstalling launching or losing its pin',hide_restore)
 def restore_all():
  page=fresh({'hiddenAppIds':['app:native.0','app:native.1','app:org.tizen.volume']});click(page,'settings');click(page,'setting-manage-hidden')
  assert page.get_by_role('button',name='Restore YouTube',exact=True).count()==1
  assert 'volume' not in page.locator('#modal-text').inner_text().lower()
  page.get_by_role('button',name='Restore all listed',exact=True).click()
  assert page.evaluate('JSON.stringify(JSON.parse(localStorage.getItem("cinematic-tv-v1")).hiddenAppIds)')=='["app:org.tizen.volume"]'
  page.get_by_role('button',name='Done',exact=True).click();click(page,'setting-manage-hidden')
  assert 'No installed apps are hidden' in page.locator('#modal-text').inner_text()
  page.close()
 case('Restore all only restores installed consumer entries and preserves unavailable hidden IDs',restore_all)
 def remote_restore():
  page=fresh({'hiddenAppIds':['app:native.0','app:native.1']});click(page,'apps');click(page,'manage-hidden')
  assert page.locator('#modal-actions .is-focused').inner_text()=='Restore Crunchyroll'
  page.keyboard.press('ArrowRight');assert page.locator('#modal-actions .is-focused').inner_text()=='Restore YouTube'
  page.keyboard.press('Enter');assert page.evaluate('JSON.parse(localStorage.getItem("cinematic-tv-v1")).hiddenAppIds.includes("app:native.0")') is False
  page.keyboard.press('Escape');assert page.locator('#apps [data-action="manage-hidden"].is-focused').count()==1
  page.close()
 case('D-pad restore and Back return focus to hidden-app management',remote_restore)

 def recents():
  for count in [0,1,2,6]:
   items=[{'id':'app:native.'+str(i),'name':'App','at':i+1} for i in range(count)]
   page=fresh({'recent':items,'recentCount':6})
   panel=page.locator('#home .recents-shell').bounding_box();spot=page.locator('#home .spotlight').bounding_box()
   if count in [1,2]:assert panel['height']<spot['height']*.55, 'Sparse recents still stretch to preview height'
   assert panel['y']+panel['height']<=spot['y']+spot['height']+1
   assert page.locator('#recent-list .recent-item').count()==(count or 2)
   for row in page.locator('#recent-list .recent-item').all():assert row.bounding_box()['height']>=60
   page.close()
 case('Zero one two and six recent entries fit compact readable rows without shrinking the preview',recents)
 def empty_recents():
  page=browser.new_page(viewport={'width':1920,'height':1080});prepare(page,{'favouriteIds':[]},True)
  page.evaluate("()=>{window.__apps=[];tizen.systeminfo.getPropertyValue=(k,ok)=>ok({connected:[],disconnected:[]});}")
  render(page);page.wait_for_timeout(100)
  assert page.locator('#recent-list .recent-item').count()==0
  assert page.locator('#recent-list .empty-placeholder').is_visible()
  assert page.locator('#home .recents-shell').bounding_box()['height']<page.locator('#home .spotlight').bounding_box()['height']*.4
  assert page.get_by_role('button',name='Add favourite apps',exact=True).is_visible()
  page.close()
 case('No history or connected sources has a compact readable empty state',empty_recents)

 browser.close()
print(json.dumps(results,indent=2));assert all(x['result']=='PASS' for x in results)
