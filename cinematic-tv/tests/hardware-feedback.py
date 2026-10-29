"""S95H feedback regressions. Browser/mock results are not physical-TV acceptance."""
from playwright.sync_api import sync_playwright
from ui_support import chromium,prepare,render,click
import json

results=[]
def case(name,fn):
    try: fn();results.append({'name':name,'result':'PASS'})
    except Exception as e:results.append({'name':name,'result':'FAIL','error':str(e)[:700]})

with sync_playwright() as p:
    browser=chromium(p)
    def fresh(settings=None,native=False):
        page=browser.new_page(viewport={'width':1920,'height':1080})
        prepare(page,settings,native);render(page);page.wait_for_timeout(220);return page
    def catalogue_cost():
        page=browser.new_page(viewport={'width':1920,'height':1080})
        prepare(page,{'previewMode':'off'},True)
        page.evaluate('''() => {
          window.__infoCalls=0;
          tizen.application.getAppInfo=()=>{window.__infoCalls++;return{id:'CinemTV001.Launcher'}};
          window.__apps=Array.from({length:500},(_,i)=>({id:'user.'+i,name:'App '+i,show:true,iconPath:''}));
        }''')
        render(page);page.wait_for_timeout(200)
        assert page.evaluate('window.__infoCalls')<=2, 'Native self-info queried once per installed app'
        before=page.evaluate('window.__infoCalls');click(page,'settings');click(page,'setting-refresh');page.wait_for_timeout(150)
        assert page.evaluate('window.__infoCalls')-before<=1
        page.close()
    case('Large catalogue reads native self identity once per refresh',catalogue_cost)
    def footer():
        page=fresh({'previewMode':'off'})
        page.locator('.home-footer [data-action="apps"]').focus()
        for action in ['inputs','quick-switch','edit']:
            page.keyboard.press('ArrowRight')
            assert page.locator('.is-focused').get_attribute('data-action')==action
        for action in ['quick-switch','inputs','apps']:
            page.keyboard.press('ArrowLeft')
            assert page.locator('.is-focused').get_attribute('data-action')==action
        page.close()
    case('Footer horizontal navigation stays on All apps Inputs Previous Edit Home',footer)
    def persistent_pc():
        page=browser.new_page(viewport={'width':1920,'height':1080})
        prepare(page,{'previewMode':'selected','recent':[{'id':'input:HDMI:1','name':'PC','at':1000}]},True)
        page.evaluate("()=>{window.__rects=[];tizen.tvwindow.getVideoResolution=()=>({width:3840,height:2160});tizen.tvwindow.show=(ok,fail,rect)=>{window.__calls.push('show');window.__rects.push(rect);setTimeout(ok,5)}}")
        render(page);page.wait_for_timeout(450)
        shows=page.evaluate("window.__calls.filter(x=>x==='show').length")
        assert shows==1
        page.locator('#favourites .app-card').first.focus();page.wait_for_timeout(200)
        assert page.locator('#preview.is-live').count()==1
        assert page.locator('#preview-title').inner_text()=='PC'
        assert page.evaluate("window.__calls.filter(x=>x==='show').length")==shows, 'App focus restarted the same HDMI preview'
        assert 'live hdmi' not in page.locator('#preview').inner_text().lower()
        assert 'live preview' not in page.locator('#preview').inner_text().lower()
        r=page.evaluate('window.__rects[0].map(parseFloat)')
        assert abs(r[2]/r[3]-16/9)<.01
        assert r[2]>=1920*.44 and r[3]>=1080*.44, 'HDMI picture is still too small'
        media=page.locator('#preview-media').bounding_box();caption=page.locator('#preview .preview-bottom').bounding_box()
        assert caption['y']>=media['y']+media['height']-1, 'Caption overlaps the picture'
        assert page.locator('#preview-title').bounding_box()['height']<=1080*.03, 'HDMI title takes too much picture space'
        click(page,'settings');page.wait_for_timeout(80)
        assert page.evaluate("window.__calls.includes('hide')")
        page.close()
    case('PC preview stays clean and proportional while browsing and stops for menus',persistent_pc)
    def stable_refresh():
        page=fresh({'previewMode':'selected'},True);page.wait_for_timeout(250)
        before=page.evaluate("window.__calls.filter(x=>x==='show'||x==='hide')")
        page.evaluate("window.__packages.onupdated({})");page.wait_for_timeout(450)
        assert page.evaluate("window.__calls.filter(x=>x==='show'||x==='hide')")==before, 'Catalogue refresh restarted the live video plane'
        page.evaluate("window.dispatchEvent(new Event('resize'))");page.wait_for_timeout(300)
        assert page.evaluate("window.__calls.filter(x=>x==='show'||x==='hide')")==before, 'Unchanged viewport resize restarted the live video plane'
        assert page.locator('#preview.is-live').count()==1
        click(page,'settings');page.wait_for_timeout(80)
        assert page.evaluate("window.__calls.filter(x=>x==='hide').length")>=1, 'Leaving Home failed to clean up preserved video'
        page.close()
    case('Unchanged catalogue and viewport refresh preserve the active video plane',stable_refresh)

    def settings_preview():
        page=fresh({'previewMode':'off'},True);click(page,'settings')
        assert page.locator('[data-action="setting-layout"]').count()==0
        preview=page.locator('#settings-home-preview')
        assert preview.is_visible()
        assert preview.locator('[id]').count()==0
        assert preview.locator('.navitem').count()==0
        before=preview.locator('.backdrop').get_attribute('style')
        click(page,'setting-wallpaper');click(page,'setting-wallpaper')
        assert preview.locator('.backdrop').get_attribute('style')!=before
        assert preview.locator('button:not([disabled])').count()==0
        assert not page.evaluate("window.__calls.includes('show')")
        page.close()
    case('Appearance settings show an inert Home preview instead of ineffective layout choices',settings_preview)
    def icon_focus():
        page=browser.new_page(viewport={'width':1920,'height':1080})
        prepare(page,{'previewMode':'off'},True)
        page.evaluate("(url)=>window.__apps[1].iconPath=url", 'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%22256%22%20height=%22256%22%3E%3Crect%20width=%22256%22%20height=%22256%22%20fill=%22red%22/%3E%3C/svg%3E')
        render(page);page.wait_for_timeout(200)
        tile=page.locator('#favourites .app-card').nth(1);tile.focus();page.wait_for_timeout(260)
        image=tile.locator('img');logo=tile.locator('.logo')
        assert image.bounding_box()['width']/logo.bounding_box()['width']>.98, 'Native artwork does not reach the rounded tile edge'
        scale=logo.evaluate("e=>new DOMMatrix(getComputedStyle(e).transform).a")
        assert scale>=1.06, 'Focus does not clearly lift the selected tile'
        assert image.evaluate("e=>getComputedStyle(e).objectFit")=='contain'
        youtube=page.locator('#favourites .app-card').first
        assert youtube.locator('svg').count()==1 and youtube.locator('img').count()==0, 'YouTube native artwork replaced the consistent mark'
        pc=page.locator('#recent-list .recent-item').first
        assert pc.locator('.input-mark svg').count()==1, 'PC input still uses a text-box glyph'
        assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'), 'Home overflows the viewport'
        page.close()
    case('Native icons fill favourites and selected tiles have a clear bounded lift',icon_focus)
    def weather_retry():
        page=browser.new_page(viewport={'width':1920,'height':1080})
        prepare(page,{'previewMode':'off'},True)
        page.evaluate("window.fetch=async()=>({ok:false,status:429})")
        render(page);page.wait_for_timeout(100);click(page,'settings');click(page,'setting-diagnostics')
        assert '429' in page.locator('#modal-text').inner_text()
        page.get_by_role('button',name='Close',exact=True).click()
        page.evaluate("window.fetch=async()=>({ok:true,status:200,json:async()=>({current:{temperature_2m:13,weather_code:2}})})")
        click(page,'setting-weather-refresh');page.wait_for_timeout(80)
        assert '13°C' in page.locator('.masthead #weather-info').inner_text()
        page.close()
    case('Weather diagnostics retain HTTP failure and Refresh weather retries successfully',weather_retry)
    def daily_wallpaper():
        page=browser.new_page(viewport={'width':1920,'height':1080})
        prepare(page,{'previewMode':'off','wallpaper':'daily'})
        page.evaluate('''() => {
          const original=window.fetch;
          window.fetch=async url=>{
            if(String(url).startsWith('https://commons.wikimedia.org/'))return{ok:true,json:async()=>({query:{pages:{1:{title:'File:Landscape.jpg',imageinfo:[{thumburl:'https://thumb.wikimedia.org/test.png',descriptionurl:'https://commons.wikimedia.org/wiki/File:Landscape.jpg',extmetadata:{Artist:{value:'Photographer'},LicenseShortName:{value:'CC BY-SA 4.0'}}}]}}}})};
            if(String(url).startsWith('https://thumb.wikimedia.org/'))return new Response(Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/m1sAAAAASUVORK5CYII='),c=>c.charCodeAt(0)),{headers:{'content-type':'image/png'}});
            return original(url);
          };
        }''')
        render(page)
        page.wait_for_function("document.querySelector('.backdrop').style.backgroundImage.includes('blob:')")
        click(page,'settings');click(page,'setting-wallpaper-credits')
        assert 'Photographer' in page.locator('#modal-text').inner_text()
        assert 'CC BY-SA 4.0' in page.locator('#modal-text').inner_text()
        page.close()
    case('Daily photo is decoded locally and shows photographer and licence attribution',daily_wallpaper)
    browser.close()
print(json.dumps(results,indent=2))
assert all(x['result']=='PASS' for x in results),'S95H feedback regressions failed'
