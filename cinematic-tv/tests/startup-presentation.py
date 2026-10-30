"""Cold-start presentation; mocked discovery, real image decode, no physical-TV claim."""
from playwright.sync_api import sync_playwright
from ui_support import chromium,prepare,render,click
import json
with sync_playwright() as p:
 b=chromium(p);page=b.new_page(viewport={'width':1920,'height':1080});prepare(page,{'pcPort':'HDMI 1','previewMode':'selected','favouriteIds':['app:native.0','app:native.1','input:HDMI:1']},True)
 page.evaluate("()=>{localStorage.setItem('cinematic-tv-apps-v2',JSON.stringify(__apps));window.__discoveryPainted=null;tizen.application.getAppsInfo=ok=>{__discoveryPainted=!!document.querySelector('#favourites .app-card');ok(__apps)};tizen.systeminfo.getPropertyValue=(k,ok)=>{window.__finishInputs=()=>ok({connected:[{type:'HDMI',number:1,editName:'PC'}],disconnected:[]})}}")
 render(page);page.wait_for_function('__discoveryPainted!==null')
 assert page.evaluate('__discoveryPainted') is True,'Native app discovery starts before the cached Home is drawn'
 assert 'disconnected' not in page.locator('#preview-art').inner_text().lower(),'Unknown startup input is falsely disconnected'
 assert 'Not connected' not in page.locator('#preview-meta').inner_text()
 assert page.locator('#preview-title').inner_text()=='PC'
 assert page.evaluate('__calls')==[],'Unverified cached input must not operate native video'
 page.locator('#favourites .app-card').first.focus();page.keyboard.press('ArrowRight')
 assert page.locator('#favourites .is-focused .name').inner_text()=='Crunchyroll','Input handling blocked on discovery'
 page.evaluate("window.__appTile=document.querySelector('#favourites .app-card');__finishInputs()")
 page.wait_for_timeout(400)
 assert page.evaluate("__appTile===document.querySelector('#favourites .app-card')"),'Input discovery rebuilt unchanged app artwork'
 assert page.locator('#preview.is-live').count()==1
 assert page.evaluate("__calls.filter(x=>x==='show').length")==1
 assert not page.evaluate("__calls.includes('hide')")
 assert page.locator('#wallpaper-next').count()==0,'Startup wallpaper creates a full-screen crossfade layer'
 click(page,'settings');click(page,'setting-wallpaper');click(page,'wallpaper-source');click(page,'wallpaper-source');page.locator('#wallpaper-next').wait_for(state='attached')
 assert page.locator('#wallpaper-next').count()==1,'Later wallpaper changes lost their crossfade'
 assert page.locator('#wallpaper-next').evaluate('e=>e.style.opacity')=='1'
 page.close()
 page=b.new_page(viewport={'width':1920,'height':1080});prepare(page,{'pcPort':'HDMI 1','previewMode':'selected'},True)
 page.evaluate("()=>{localStorage.setItem('cinematic-tv-apps-v2',JSON.stringify(__apps));tizen.systeminfo.getPropertyValue=(k,ok)=>setTimeout(()=>ok({connected:[],disconnected:[{type:'HDMI',number:1,editName:'PC'}]}),60)}")
 render(page);page.wait_for_timeout(250)
 assert page.locator('#preview-art .art-caption').inner_text()=='HDMI is disconnected','A confirmed disconnection must still be reported'
 assert page.evaluate('__calls')==[]
 page.close()
 page=b.new_page(viewport={'width':1920,'height':1080});prepare(page,{'pcPort':'HDMI 1','previewMode':'selected'},True)
 page.evaluate("()=>{localStorage.setItem('cinematic-tv-apps-v2',JSON.stringify(__apps));tizen.systeminfo.getPropertyValue=(k,ok,fail)=>fail(new Error('Unavailable'))}")
 render(page);page.wait_for_function("document.querySelector('#preview-meta').textContent.includes('Status unavailable')")
 page.locator('#preview-hit').click()
 assert 'unavailable' in page.locator('#toast').inner_text().lower()
 assert 'not connected' not in page.locator('#toast').inner_text().lower()
 assert page.evaluate('__calls')==[]
 page.close();b.close()
print(json.dumps({'result':'PASS','cached_home_before_discovery':True,'unknown_is_not_disconnected':True,'early_remote_response':True,'input_update_preserves_app_tiles':True,'initial_wallpaper_no_crossfade':True,'later_crossfade_retained':True,'real_disconnect_retained':True}))
