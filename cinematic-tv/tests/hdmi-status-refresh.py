"""Cached boot/recovery HDMI status must follow discovery without enabling preview."""
import json
from playwright.sync_api import sync_playwright
from ui_support import chromium,prepare,render
with sync_playwright() as p:
 b=chromium(p)
 for interrupted in [False,True]:
  page=b.new_page(viewport={'width':1920,'height':1080});prepare(page,{'previewMode':'selected' if interrupted else 'off','pcPort':'HDMI 1'},True)
  page.evaluate("localStorage.setItem('cinematic-tv-apps-v2',JSON.stringify(__apps))")
  if interrupted:page.evaluate("localStorage.setItem('cinematic-tv-video-pending','1')")
  render(page);page.wait_for_timeout(400)
  assert page.locator('#preview-title').inner_text()=='PC','Cached disconnected placeholder survived real discovery'
  assert page.locator('#preview-meta').inner_text()=='HDMI 1 · Connected'
  assert page.locator('#preview-art .art-caption').inner_text()!='HDMI is disconnected'
  assert page.evaluate('JSON.parse(localStorage.getItem("cinematic-tv-v1")).previewMode')=='off'
  assert page.evaluate('__calls')==[], 'Status refresh must not enable or operate native preview'
  page.evaluate("()=>{tizen.systeminfo.getPropertyValue=(k,ok)=>ok({connected:[],disconnected:[{type:'HDMI',number:1,editName:'PC'}]});__inputCallback({})}")
  page.wait_for_timeout(400)
  assert page.locator('#preview-meta').inner_text()=='HDMI 1 · Not connected'
  page.evaluate("()=>{tizen.systeminfo.getPropertyValue=(k,ok)=>ok({connected:[{type:'HDMI',number:1,editName:'PC'}],disconnected:[]});__inputCallback({})}")
  page.wait_for_timeout(400)
  assert page.locator('#preview-meta').inner_text()=='HDMI 1 · Connected'
  assert page.locator('#preview-art .art-caption').inner_text()!='HDMI is disconnected'
  assert page.evaluate('__calls')==[]
  page.close()
 b.close()
print(json.dumps({'result':'PASS','cached_boot_status':True,'recovery_remains_off':True,'disconnect_reconnect_status':True,'native_source_operations':0}))
