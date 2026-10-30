"""Browser-only acceptance of launcher navigation and preferences; not TV hardware certification."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re,base64,json
from ui_support import ROOT as root, chromium, prepare, render, click
errors=[]
with sync_playwright() as p:
    browser=chromium(p)
    page=browser.new_page(viewport={'width':1920,'height':1080},device_scale_factor=1)
    page.on('pageerror',lambda e:errors.append(str(e)))
    prepare(page)
    render(page)
    page.wait_for_timeout(180)
    assert page.locator('#favourites .app-card').count()==8
    assert page.locator('#recent-list .navitem').count()==4
    assert page.locator('#preview-hit.is-focused').get_attribute('aria-label')=='Open PC — HDMI 1'
    page.screenshot(path=str(root/'home-v0.2.0.png'),full_page=True)
    # Key navigation must reach native launcher-settings control from Home.
    page.keyboard.press('ArrowUp')
    assert page.locator('.is-focused').get_attribute('data-action')=='settings','Settings must be D-pad accessible'
    page.keyboard.press('Enter')
    assert page.locator('#page-title').inner_text()=='Launcher Settings'
    before=page.locator('button[data-action="setting-glow"] .setting-value').inner_text()
    click(page,'setting-glow')
    assert page.locator('.is-focused').get_attribute('data-action')=='setting-glow','Settings must restore focus on change'
    assert page.locator('button[data-action="setting-glow"] .setting-value').inner_text()!=before
    click(page,'setting-wallpaper')
    assert page.locator('.settings-group:not([hidden]) h2').inner_text()=='Wallpapers'
    assert page.locator('[data-action="wallpaper-rotation"]').is_visible()
    click(page,'wallpaper-back')
    click(page,'setting-unit')
    assert page.locator('button[data-action="setting-unit"] .setting-value').inner_text()=='°F'
    page.screenshot(path=str(root/'settings-v0.2.0.png'),full_page=True)
    # Explicit weather search and selection, without GPS.
    click(page,'setting-city')
    page.locator('.dialog-input').fill('Ealing')
    page.locator('#modal-actions button').filter(has_text='Save').click()
    page.wait_for_timeout(50)
    assert page.locator('#modal-title').inner_text()=='Choose weather location'
    page.locator('#modal-actions button').filter(has_text='Ealing').click()
    assert page.locator('button[data-action="setting-city"] .setting-value').inner_text()=='Ealing'
    # Modify favourites; pin PC and keep it visible on Home.
    page.keyboard.press('Escape')
    page.locator('button[data-action="edit"]').first.click()
    assert page.locator('#edit-grid .edit-action').count()==9
    page.locator('button[data-action="editinput"]').click()
    page.locator('#modal-actions button').filter(has_text='PC').click()
    assert page.locator('#edit-grid .edit-action').count()==10
    page.keyboard.press('Escape')
    assert page.locator('#favourites .app-card').count()==9
    assert page.locator('#favourites .app-card[data-itemid]').last.get_attribute('data-itemid')=='input:HDMI:1'
    page.screenshot(path=str(root/'home-pinned-pc.png'),full_page=True)
    # Edit home -> move pinned app left using remote, commit, and preserve order.
    page.locator('button[data-action="edit"]').first.click()
    page.locator('#edit-grid .edit-action').last.nth(0) # no action, sanity
    page.locator('#edit-grid button[data-itemid="input:HDMI:1"]').click()
    page.locator('#modal-actions button').filter(has_text=re.compile('^Move$')).click()
    assert page.locator('.edit-action.moving').count()==1
    page.keyboard.press('ArrowLeft')
    page.keyboard.press('Enter')
    assert page.locator('#edit-grid button[data-itemid="input:HDMI:1"]').count()==1
    page.keyboard.press('Escape')
    assert page.locator('#favourites .app-card[data-itemid]').nth(6).get_attribute('data-itemid')=='input:HDMI:1'
    # All apps: search, hide an app, then explicitly show hidden and restore.
    page.locator('button[data-action="apps"]').first.click()
    assert page.locator('#apps-grid .app-card').count()==17
    page.locator('button[data-action="search-apps"]').click()
    page.locator('.dialog-input').fill('Plex')
    page.locator('#modal-actions button').filter(has_text='Save').click()
    assert page.locator('#apps-grid .app-card').count()==1
    page.locator('#apps-grid .app-card').first.focus()
    page.keyboard.down('Enter');page.wait_for_timeout(220);page.keyboard.up('Enter')
    assert page.locator('#modal-title').inner_text()=='Plex'
    page.locator('#modal-actions button').filter(has_text='Hide from All Apps').click()
    assert page.locator('#apps-grid .app-card').count()==0
    page.keyboard.press('Escape')
    page.locator('button[data-action="settings"]').click()
    click(page,'setting-hidden')
    page.keyboard.press('Escape')
    page.locator('button[data-action="apps"]').first.click()
    assert page.locator('#apps-grid .app-card').count()==1
    assert page.locator('#apps-grid .app-card.hidden-app').count()==1
    page.screenshot(path=str(root/'all-apps-v0.2.0.png'),full_page=True)
    assert not errors,errors
    print(json.dumps({'result':'PASS','home_favourites_after_pin':9,'app_catalogue':17,'settings_count':page.locator('#settings-list .setting-row').count(),'browser_js_errors':errors},indent=2))
    browser.close()

