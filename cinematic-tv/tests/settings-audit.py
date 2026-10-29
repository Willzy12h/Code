"""Exercise every launcher setting on controlled native mocks, never TV system settings."""
from playwright.sync_api import sync_playwright
from ui_support import chromium,prepare,render,click
import json
results=[];available=set();covered=set()
with sync_playwright() as p:
    browser=chromium(p)
    def state(page):return page.evaluate('JSON.parse(localStorage.getItem("cinematic-tv-v1"))')
    def button(page,name):page.get_by_role('button',name=name,exact=True).click()
    def audit(action,fn):
        page=browser.new_page(viewport={'width':1920,'height':1080});errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        try:
            prepare(page,{'previewMode':'off'},True);render(page);page.wait_for_timeout(100);click(page,'settings')
            available.update(page.locator('#settings-list button').evaluate_all('(items)=>items.map(x=>x.dataset.action)'))
            covered.add(action);fn(page);assert not errors,errors
            results.append({'setting':action,'result':'PASS'})
        except Exception as e:results.append({'setting':action,'result':'FAIL','error':str(e)[:600]})
        finally:page.close()
    def toggle(action,key,want):
        def run(page):click(page,action);assert state(page)[key]==want,(key,state(page).get(key))
        audit(action,run)
    for action,key,want in [
      ('setting-focus','focusDefault','pc'),('setting-recent','recentCount',5),
      ('setting-quick','quickSwitch',False),('setting-network','showNetwork',True),
      ('setting-weather','showWeather',False),('setting-clock','showClock',False),
      ('setting-unit','tempUnit','fahrenheit'),('setting-adaptive','adaptiveWeather',True),
      ('setting-effects','reducedEffects',True),('setting-glow','glow','white'),
      ('setting-motion','reducedMotion',True),('setting-hold','longPressMs',250),
      ('setting-disconnected','hideDisconnected',False),('setting-hidden','showHidden',True)
    ]:toggle(action,key,want)
    def setup(page):click(page,'setting-setup');button(page,'Use recommended setup');assert state(page)['setupDone'] and state(page)['previewMode']=='off'
    audit('setting-setup',setup)
    def startup(page):
        click(page,'setting-startup');text=page.locator('#modal-text').inner_text()
        assert 'Autorun Last App' in text and 'Turn it off' in text and 'depends' in text
        button(page,'Exit Cinematic TV');page.wait_for_timeout(40);assert page.evaluate("window.__calls.includes('exit')")
    audit('setting-startup',startup)
    def profiles(page):
        click(page,'setting-profiles');button(page,'Save current Home');page.locator('.dialog-input').fill('Evening');button(page,'Save')
        assert state(page)['profiles'][0]['name']=='Evening'
        click(page,'setting-glow');click(page,'setting-profiles');button(page,'Use Evening');assert state(page)['glow']=='blue'
    audit('setting-profiles',profiles)
    def pc(page):
        click(page,'setting-pc');button(page,'PC · HDMI 1')
        assert state(page)['pcPort']=='HDMI 1' and state(page)['inputNames']['HDMI 1']=='PC' and 'input:HDMI:1' in state(page)['favouriteIds']
        assert not page.evaluate("window.__calls.some(x=>x.startsWith('source:'))")
    audit('setting-pc',pc)
    def preview(page):
        click(page,'setting-preview');button(page,'Enable');assert state(page)['previewMode']=='selected'
        click(page,'setting-preview');assert state(page)['previewMode']=='off'
    audit('setting-preview',preview)
    def policy(page):
        click(page,'setting-preview-policy');button(page,'Keep current source only');assert state(page)['autoPreviewCurrentOnly']
        click(page,'setting-preview-policy');button(page,'Allow temporary switch');assert not state(page)['autoPreviewCurrentOnly']
        click(page,'setting-preview-policy');assert state(page)['autoPreviewCurrentOnly']
        assert not page.evaluate("window.__calls.some(x=>x.startsWith('source:'))")
    audit('setting-preview-policy',policy)
    def recover(page):click(page,'setting-video-reset');page.wait_for_timeout(50);assert 'recovered' in page.locator('#toast').inner_text() and state(page)['previewMode']=='off'
    audit('setting-video-reset',recover)
    def weather(page):click(page,'setting-weather-refresh');page.wait_for_timeout(40);assert '13°C' in page.locator('#weather-info').inner_text()
    audit('setting-weather-refresh',weather)
    def city(page):
        click(page,'setting-city');page.locator('.dialog-input').fill('Ealing');button(page,'Save');button(page,'Ealing')
        assert state(page)['city']=='Ealing' and state(page)['latitude']==51.51
    audit('setting-city',city)
    def wallpaper(page):
        for want in ['daily','twilight','dawn','dark','auto','scenic']:
            click(page,'setting-wallpaper');assert state(page)['wallpaper']==want
    audit('setting-wallpaper',wallpaper)
    def credits(page):click(page,'setting-wallpaper-credits');assert 'Wikimedia' in page.locator('#modal-text').inner_text()
    audit('setting-wallpaper-credits',credits)
    def custom(page):
        click(page,'setting-custom');page.locator('.dialog-input').fill('https://images.example.com/wall.jpg');button(page,'Save')
        assert state(page)['wallpaper']=='custom' and state(page)['customWallpaperUrl']=='https://images.example.com/wall.jpg'
    audit('setting-custom',custom)
    def rename(page):
        click(page,'setting-rename');page.locator('#modal-actions button').filter(has_text='HDMI 1').first.click()
        page.locator('.dialog-input').fill('Desktop');button(page,'Save');assert state(page)['inputNames']['HDMI 1']=='Desktop'
    audit('setting-rename',rename)
    def edit_home(page):page.locator('#settings-list [data-action="edit"]').click();assert page.locator('#page-title').inner_text()=='Edit Home' and page.locator('#edit-grid .edit-action').count()>8
    audit('edit',edit_home)
    def search(page):click(page,'setting-search');page.locator('.dialog-input').fill('YouTube');button(page,'Save');assert page.locator('#apps-grid .app-card').count()==1
    audit('setting-search',search)
    def refresh(page):click(page,'setting-refresh');page.wait_for_timeout(100);click(page,'setting-diagnostics');assert 'Checked successfully' in page.locator('#modal-text').inner_text()
    audit('setting-refresh',refresh)
    def diagnostics(page):click(page,'setting-diagnostics');assert 'App viewport: 1920×1080' in page.locator('#modal-text').inner_text()
    audit('setting-diagnostics',diagnostics)
    def icons(page):click(page,'setting-icons');button(page,'PC');button(page,'Console');assert state(page)['inputIcons']['HDMI 1']=='console'
    audit('setting-icons',icons)
    def about(page):click(page,'setting-about');assert page.locator('#modal-title').inner_text().startswith('Cinematic TV 0.4.');assert 'No updater' in page.locator('#modal-text').inner_text()
    audit('setting-about',about)
    def export(page):
        with page.expect_download() as download:click(page,'setting-log-export')
        data=json.loads(open(download.value.path(),encoding='utf-8').read());assert data['hardwareVerified'] is False and data['video']['owner']=='none'
    audit('setting-log-export',export)
    def reset_section(page):
        before=state(page)['favouriteIds'];click(page,'setting-glow');click(page,'setting-resets');button(page,'Appearance only');button(page,'Reset')
        assert state(page)['glow']=='blue' and state(page)['favouriteIds']==before
    audit('setting-resets',reset_section)
    def backup(page):
        click(page,'setting-backup')
        with page.expect_download() as download:button(page,'Download backup')
        data=json.loads(open(download.value.path(),encoding='utf-8').read());assert data['format']=='cinematic-tv-preferences' and 'recent' not in data['settings']
        click(page,'setting-backup');button(page,'Show JSON text');assert json.loads(page.locator('.dialog-input').input_value())['version']==2;button(page,'Cancel')
        fixture={'format':'cinematic-tv-preferences','version':2,'settings':{'version':1,'city':'Leeds','previewMode':'selected','recent':[{'id':'app:private','at':1}]}}
        click(page,'setting-backup');button(page,'Paste JSON text');page.locator('.dialog-input').fill(json.dumps(fixture));button(page,'Save')
        assert state(page)['city']=='Leeds' and state(page)['previewMode']=='off' and state(page)['recent']==[]
        click(page,'setting-backup')
        with page.expect_file_chooser() as chooser:button(page,'Import file')
        fixture['settings']['city']='York';chooser.value.set_files({'name':'preferences.json','mimeType':'application/json','buffer':json.dumps(fixture).encode()})
        page.wait_for_timeout(80);assert state(page)['city']=='York' and state(page)['previewMode']=='off'
    audit('setting-backup',backup)
    def reset(page):
        click(page,'setting-reset');button(page,'Cancel');assert state(page)['setupDone']
        click(page,'setting-reset');button(page,'Reset');page.wait_for_timeout(80)
        assert state(page)['city']=='London' and state(page)['previewMode']=='selected' and state(page)['recent']==[]
    audit('setting-reset',reset)
    browser.close()
uncovered=sorted(available-covered)
print(json.dumps({'settings_found':len(available),'settings_exercised':len(covered),'uncovered':uncovered,'results':results},indent=2))
assert not uncovered and all(x['result']=='PASS' for x in results),'Launcher settings audit failed'
