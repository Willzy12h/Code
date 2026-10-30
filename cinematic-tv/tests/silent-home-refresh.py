"""Home metadata refresh must retain artwork nodes and an in-flight native preview."""
from playwright.sync_api import sync_playwright
from ui_support import chromium,prepare,render
import json
with sync_playwright() as p:
 b=chromium(p)
 page=b.new_page(viewport={'width':1920,'height':1080});prepare(page,{'pcPort':'HDMI 1','previewMode':'selected'},True);render(page);page.wait_for_timeout(450)
 page.evaluate("window.__tile=document.querySelector('#favourites .app-card');window.__recent=document.querySelector('#recent-list .recent-item');window.__before=__calls.slice();__packages.onupdated({})")
 page.wait_for_timeout(350)
 assert page.evaluate("__tile===document.querySelector('#favourites .app-card')"),'Unchanged favourites artwork was rebuilt'
 assert page.evaluate("__recent===document.querySelector('#recent-list .recent-item')"),'Unchanged recent artwork was rebuilt'
 assert page.evaluate('__calls')==page.evaluate('__before'),'Metadata refresh restarted healthy native video'
 page.evaluate("()=>{__hidden=true;document.dispatchEvent(new Event('visibilitychange'))}");page.wait_for_timeout(60)
 page.evaluate("()=>{__hidden=false;document.dispatchEvent(new Event('visibilitychange'))}");page.wait_for_timeout(400)
 assert page.evaluate("__tile===document.querySelector('#favourites .app-card')")
 assert page.locator('#preview.is-live').count()==1
 page.close()
 page=b.new_page(viewport={'width':1920,'height':1080});prepare(page,{'pcPort':'HDMI 1','previewMode':'selected'},True)
 page.evaluate("()=>{tizen.tvwindow.show=(ok,fail,rect)=>{__calls.push('show');setTimeout(()=>ok(rect),220)}}")
 render(page);page.wait_for_function("__calls.includes('show')");page.evaluate('__packages.onupdated({})');page.wait_for_timeout(600)
 assert page.evaluate("__calls.filter(x=>x==='show').length")==1,'Refresh replaced an in-flight native show'
 assert not page.evaluate("__calls.includes('hide')"),'Refresh caused a native-plane flash'
 assert page.locator('#preview.is-live').count()==1
 page.close();b.close()
print(json.dumps({'result':'PASS','unchanged_artwork_retained':True,'resume_preserves_tiles':True,'inflight_preview_not_restarted':True}))
