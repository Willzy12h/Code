"""Behavioural regressions and QoL acceptance. NOT Samsung hardware tests."""
from playwright.sync_api import sync_playwright
from ui_support import server,chromium,prepare,click,ROOT,render
import json, traceback
results=[]
def case(name,fn):
    try:fn();results.append({'name':name,'result':'PASS'})
    except Exception as e:results.append({'name':name,'result':'FAIL','error':str(e)[:700]})
with server() as url, sync_playwright() as p:
    browser=chromium(p)
    def fresh(settings=None,native=False):
        page=browser.new_page(viewport={'width':1920,'height':1080})
        prepare(page,settings,native);render(page);page.wait_for_timeout(180);return page
    def static_caption():
        page=fresh()
        monitor=page.locator('#preview-art .monitor-mock').bounding_box()
        media=page.locator('#preview-media').bounding_box()
        assert monitor and media
        assert monitor['y']>=media['y'] and monitor['y']+monitor['height']<=media['y']+media['height']
        assert page.locator('#preview-art .art-caption').inner_text()==''
        page.close()
    case('Static PC artwork stays contained with no instructional caption',static_caption)
    def setup_remote():
        page=fresh({'setupDone':False},True)
        for key in ['ArrowUp','ArrowRight','ArrowDown','ArrowLeft','ArrowUp']:
            page.keyboard.press(key)
            assert page.locator('#modal-actions .is-focused').count()==1, 'Remote focus escaped the welcome dialog'
            assert page.evaluate('document.querySelector("#modal-actions").contains(document.activeElement)')
        page.keyboard.press('Enter')
        assert page.locator('#confirm.hidden').count()==1
        assert page.evaluate('JSON.parse(localStorage.getItem("cinematic-tv-v1")).setupDone') is True
        assert page.evaluate('JSON.parse(localStorage.getItem("cinematic-tv-v1")).previewMode')=='off'
        page.close()
    case('Welcome dialog traps remote focus and accepts OK without a pointer',setup_remote)
    def held_setting():
        page=fresh();page.keyboard.press('ArrowUp');page.keyboard.down('Enter');page.wait_for_timeout(230);page.keyboard.up('Enter')
        assert page.locator('#page-title').inner_text()=='Launcher Settings';page.close()
    case('Held OK on Settings still activates it on release',held_setting)
    def setup():
        page=fresh({'setupDone':False});assert page.locator('#modal-title').inner_text()=='Welcome to Cinematic TV'
        page.get_by_role('button',name='Use recommended setup',exact=True).click()
        assert page.evaluate('JSON.parse(localStorage.getItem("cinematic-tv-v1")).setupDone') is True
        assert page.locator('#favourites .app-card').count()==8;page.close()
    case('First-run setup preserves an explicit preview-off preference',setup)
    def extras():
        page=fresh();click(page,'settings');click(page,'setting-profiles')
        page.get_by_role('button',name='Save current Home',exact=True).click();page.locator('.dialog-input').fill('Entertainment');page.get_by_role('button',name='Save',exact=True).click()
        assert 'Entertainment' in page.evaluate('localStorage.getItem("cinematic-tv-v1")')
        click(page,'setting-wallpaper')
        click(page,'setting-network');assert page.locator('#network-status').is_visible()
        click(page,'setting-resets');page.get_by_role('button',name='Appearance only',exact=True).click()
        page.get_by_role('button',name='Reset',exact=True).click()
        assert page.evaluate('JSON.parse(localStorage.getItem("cinematic-tv-v1")).wallpaper')=='scenic'
        page.close()
    case('Profiles, network indicator and granular resets work',extras)
    def duplicate_launch():
        page=fresh(native=True);tile=page.locator('#favourites .app-card').first;tile.focus()
        page.keyboard.press('Enter');page.keyboard.press('Enter');page.wait_for_timeout(40)
        assert page.evaluate('window.__calls.filter(x=>x.startsWith("launch:")).length')==1
        assert not page.locator('.toast').inner_text().startswith(('Opening','Waiting'))
        page.close()
    case('Double OK sends one launch request',duplicate_launch)
    def quick_switch():
        page=fresh({'recent':[{'id':'app:native.0','name':'YouTube','at':20},{'id':'input:HDMI:1','name':'PC','at':10}]},True)
        click(page,'quick-switch');page.wait_for_timeout(60)
        assert page.evaluate('window.__calls.includes("show")');page.close()
    case('Quick Switch opens previous available source',quick_switch)
    def focus_refresh():
        page=fresh(native=True);click(page,'settings');page.locator('[data-action="setting-glow"]').focus()
        page.evaluate('window.__inputCallback({})');page.wait_for_timeout(300)
        assert page.locator('.is-focused').get_attribute('data-action')=='setting-glow'
        click(page,'setting-city');page.locator('.dialog-input').fill('Ealing')
        page.evaluate('window.__inputCallback({})');page.wait_for_timeout(300)
        assert page.locator('.dialog-input').input_value()=='Ealing'
        page.close()
    case('Hotplug refresh preserves setting focus and text editing',focus_refresh)
    def numeric_keys():
        page=fresh();before=page.locator('.is-focused').get_attribute('data-itemid')
        page.evaluate("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Unidentified',keyCode:40,bubbles:true}))")
        after=page.locator('.is-focused').get_attribute('data-itemid');assert after!=before
        page.close()
    case('Directional keyCode fallback supports television remotes',numeric_keys)
    def native_keys():
        page=fresh(native=True)
        assert page.evaluate("(()=>{const e=new KeyboardEvent('keydown',{key:'Settings',keyCode:10133,cancelable:true,bubbles:true});document.dispatchEvent(e);return !e.defaultPrevented})()")
        assert page.evaluate("(()=>{const e=new KeyboardEvent('keydown',{key:'Home',keyCode:10072,cancelable:true,bubbles:true});document.dispatchEvent(e);return !e.defaultPrevented})()")
        page.close()
    case('Samsung Settings and Home keys remain untouched',native_keys)
    def remote_preview_safety():
        page=fresh({'previewMode':'selected','recent':[{'id':'input:HDMI:2','at':10,'name':'Console'}]},True);page.wait_for_timeout(300)
        assert page.evaluate('!window.__calls.includes("source:2")')
        assert page.locator('#preview-title').inner_text()=='PC';assert page.evaluate('window.__source.number')==1;page.close()
    case('Highlighting a different HDMI input does not silently switch source by default',remote_preview_safety)
    def backup_download():
        page=fresh();click(page,'settings');click(page,'setting-backup')
        with page.expect_download() as d:page.get_by_role('button',name='Download backup',exact=True).click()
        assert d.value.suggested_filename.endswith('.json');page.close()
    case('Backup is a real JSON download',backup_download)
    def hdmi_recovery():
        page=fresh({'previewMode':'selected','__pendingVideo':True},True)
        assert page.evaluate('JSON.parse(localStorage.getItem("cinematic-tv-v1")).previewMode')=='off';page.close()
    case('Interrupted preview is disabled on the next start',hdmi_recovery)
    def backspace_edit():
        page=fresh();click(page,'settings');click(page,'setting-city');page.locator('.dialog-input').fill('EalingX');page.keyboard.press('Backspace')
        assert page.locator('.dialog-input').input_value()=='Ealing';page.close()
    case('Backspace edits a text field instead of closing its dialog',backspace_edit)
    def late_launch():
        page=fresh(native=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.clock.install();page.evaluate("()=>{tizen.application.launch=(id,ok)=>{window.__lateAccepted=ok};}")
        page.locator('#favourites .app-card').first.click();page.clock.run_for(8100)
        page.evaluate('window.__lateAccepted()')
        assert not errors,errors
        assert not page.locator('body.launch-pending').count();page.close()
    case('A late launch acknowledgement cannot crash a timed-out launch',late_launch)
    def discovery_failure():
        page=browser.new_page(viewport={'width':1920,'height':1080});prepare(page,{'favouriteIds':None},True)
        page.evaluate("()=>{tizen.application.getAppsInfo=(ok,fail)=>fail(new Error('Unavailable'));}")
        render(page);page.wait_for_timeout(180);click(page,'settings');click(page,'setting-pc')
        page.get_by_role('button',name='PC · HDMI 1',exact=True).click()
        assert page.locator('#favourites [data-itemid="input:HDMI:1"]').count()==1;page.close()
    case('PC can be pinned when app discovery fails on first start',discovery_failure)
    def recovery_keyboard():
        page=fresh();page.evaluate('window.LauncherRecovery.rescue()')
        assert page.locator('#recovery-banner').is_visible()
        # Capture a click before reload to prove remote Enter activates the recovery control.
        page.evaluate("()=>{document.querySelector('#recovery-banner button').onclick=()=>{window.__rescued=true};}")
        page.keyboard.press('Enter');assert page.evaluate('window.__rescued===true');page.close()
    case('Recovery button works using remote Enter',recovery_keyboard)
    def stale_location():
        page=fresh();page.evaluate("()=>{const original=window.fetch;window.fetch=url=>String(url).includes('geocoding')?new Promise(resolve=>window.__locationResponse=resolve):original(url)}")
        click(page,'settings');click(page,'setting-city');page.locator('.dialog-input').fill('Ealing');page.get_by_role('button',name='Save',exact=True).click()
        page.keyboard.press('Escape');assert page.locator('#home').is_visible() and not page.locator('#page-title').is_visible()
        page.evaluate("()=>{window.__locationResponse({ok:true,json:async()=>({results:[{name:'Ealing',latitude:51.51,longitude:-.3}]})})}")
        page.wait_for_timeout(50);assert page.locator('#confirm.hidden').count()==1;page.close()
    case('Late location search cannot replace a different page',stale_location)
    browser.close()
print(json.dumps(results,indent=2))
assert all(x['result']=='PASS' for x in results), 'Readiness browser tests failed'
