"""Reported S95H artwork and selection regressions; browser evidence only."""
from playwright.sync_api import sync_playwright
from ui_support import chromium,prepare,render,click
import json
with sync_playwright() as p:
 b=chromium(p)
 for width,height in [(1920,1080),(3840,2160)]:
  page=b.new_page(viewport={'width':width,'height':height});prepare(page,{},True);page.evaluate("__apps.push({id:'native.sounds',name:'BBC Sounds',show:true})");render(page);page.wait_for_timeout(400)
  card=page.locator('#favourites .app-card').first;card.focus();page.wait_for_timeout(130)
  duration=float(card.locator('.logo').evaluate('e=>getComputedStyle(e).transitionDuration').removesuffix('s'))
  assert duration<=.055, f'Favourites transition still {duration}s'
  transform=card.locator('.logo').evaluate('e=>new DOMMatrix(getComputedStyle(e).transform).a');assert 1<transform<=1.025
  row=page.locator('#favourites');cards=row.locator('.app-card')
  assert row.evaluate('e=>e.scrollWidth<=e.clientWidth+1')
  first=cards.first.bounding_box();second=cards.nth(1).bounding_box()
  assert (second['x']-first['x'])/width<=.092,'Favourites spacing still excessive'
  page.evaluate("()=>{window.__scrolls=0;window.__rects=0;const rect=Element.prototype.getBoundingClientRect;Element.prototype.getBoundingClientRect=function(...a){window.__rects++;return rect.apply(this,a)};const original=Element.prototype.scrollIntoView;Element.prototype.scrollIntoView=function(...a){window.__scrolls++;return original.apply(this,a)}}")
  before=page.evaluate('__calls.slice()')
  for i in range(40):page.keyboard.press('ArrowRight' if i%2==0 else 'ArrowLeft')
  assert page.locator('#favourites .is-focused').count()==1;assert page.evaluate('__calls')==before
  assert page.evaluate('__scrolls')==0,'Fixed Favourites forces scroll/layout work on each key'
  assert page.evaluate('__rects')==0,'Fixed Favourites performs synchronous JavaScript rectangle reads'
  page.evaluate("()=>{const before=document.activeElement;document.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));if(document.activeElement===before)throw Error('Selection waits for a timer or animation')}")
  click(page,'apps')
  for name in ['YouTube','Prime Video','BBC iPlayer','BBC Sounds','Channel 4','SmartThings','Samsung Health']:
   tile=page.locator('#apps-grid .app-card').filter(has=page.get_by_text(name,exact=True)).first
   img=tile.locator('img.publisher-icon');assert img.count()==1,name
   assert img.evaluate('e=>e.complete&&e.naturalWidth>=512&&getComputedStyle(e).objectFit==="contain"'),name
  youtube=page.locator('#apps-grid .app-card').filter(has=page.get_by_text('YouTube',exact=True)).first
  youtube.locator('img').evaluate("e=>e.src='https://cinematic-fixture.invalid/assets/unavailable.png'")
  youtube.locator('.name-fallback').wait_for(state='visible')
  assert youtube.locator('.name-fallback').inner_text()=='YouTube'
  page.evaluate("document.body.classList.add('reduced-motion')");card=page.locator('#favourites .app-card').first;card.focus()
  assert card.locator('.logo').evaluate('e=>getComputedStyle(e).transitionDuration')=='0s'
  assert card.locator('.logo').evaluate('e=>getComputedStyle(e).transform')=='none'
  page.close()
 for count in [9,10]:
  page=b.new_page(viewport={'width':1920,'height':1080});prepare(page,{'favouriteIds':['app:native.'+str(i) for i in range(count)]},True);render(page);page.wait_for_timeout(400)
  row=page.locator('#favourites');assert row.get_attribute('data-fitted')==('true' if count==9 else 'false')
  if count==9:assert row.evaluate('e=>e.scrollWidth<=e.clientWidth+1')
  else:
   page.locator('#favourites .app-card').last.focus()
   assert row.evaluate('e=>e.scrollLeft>0'),'Long customised rows must retain scroll access'
  page.close()
 b.close()
print(json.dumps({'result':'PASS','scope':'1080p/4K exact publisher image loads, proportions, rapid retargeting, bounded Quick Lift; native calls mocked'}))
