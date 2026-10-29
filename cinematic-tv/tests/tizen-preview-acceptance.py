"""Asynchronous native HDMI mock acceptance. Not a TV, emulator, audio or CSP test."""
from playwright.sync_api import sync_playwright
from ui_support import chromium,prepare,render
import json
with sync_playwright() as p:
    browser=chromium(p);page=browser.new_page(viewport={'width':1920,'height':1080});errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    prepare(page,{'previewMode':'selected','autoPreviewCurrentOnly':False,'recent':[{'id':'input:HDMI:1','name':'PC','at':1000}]},True)
    page.evaluate("()=>{window.__source={type:'HDMI',number:2};window.__rects=[];tizen.tvwindow.show=(ok,fail,rect,type,z)=>{if(type!=='MAIN'||z!=='FRONT')throw Error('Unexpected native plane arguments');window.__rects.push(rect);window.__calls.push('show');setTimeout(ok,5)};}")
    render(page);page.wait_for_timeout(400)
    assert page.locator('.is-focused').get_attribute('data-itemid')=='input:HDMI:1'
    assert page.locator('#preview.is-live').count()==1
    assert page.locator('#preview-indicator').is_hidden()
    page.locator('#favourites .app-card').first.focus();page.wait_for_timeout(80)
    assert page.locator('#preview-title').inner_text()=='PC'
    assert page.evaluate('window.__source.number')==1
    assert page.locator('#preview.is-live').count()==1
    page.locator('button[data-action="settings"]').click();page.wait_for_timeout(80)
    assert page.evaluate('window.__source.number')==2
    page.keyboard.press('Escape')
    page.locator('#recent-list .navitem').first.focus();page.wait_for_timeout(240)
    assert page.evaluate('window.__source.number')==1
    page.keyboard.press('Enter');page.wait_for_timeout(100)
    assert page.evaluate("window.__rects.some(x=>x.join(',')==='0px,0px,1920px,1080px')")
    page.keyboard.press('Escape');page.wait_for_timeout(200)
    assert page.locator('#page-title').inner_text()=='Home'
    assert not errors,errors
    print(json.dumps({'result':'PASS','mode':'snapshot + native mocks','preview_displayed':True,'source_restored':True,'explicit_fullscreen_opened':True,'javascript_errors':errors},indent=2))
    browser.close()
