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
  assert duration<=.085, f'Favourites transition still {duration}s'
  transform=card.locator('.logo').evaluate('e=>new DOMMatrix(getComputedStyle(e).transform).a');assert 1<transform<=1.045
  before=page.evaluate('__calls.slice()')
  for i in range(40):page.keyboard.press('ArrowRight' if i%2==0 else 'ArrowLeft')
  assert page.locator('#favourites .is-focused').count()==1;assert page.evaluate('__calls')==before
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
 b.close()
print(json.dumps({'result':'PASS','scope':'1080p/4K exact publisher image loads, proportions, rapid retargeting, bounded Quick Lift; native calls mocked'}))
