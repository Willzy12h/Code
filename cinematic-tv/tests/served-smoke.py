"""Real-origin smoke test with unchanged HTML/CSS/JS and CSP. Native hardware is NOT emulated.
Run --required in CI. Restricted hosts must report blocked navigation, never substitute a pass.
"""
import argparse,json
from playwright.sync_api import sync_playwright
from ui_support import server,chromium
args=argparse.ArgumentParser();args.add_argument('--required',action='store_true');opt=args.parse_args()
with server() as url, sync_playwright() as p:
    browser=chromium(p);page=browser.new_page(viewport={'width':1920,'height':1080});errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.route('https://api.open-meteo.com/**',lambda r:r.fulfill(status=200,content_type='application/json',body='{"current":{"temperature_2m":13,"weather_code":2}}'))
    try:
        page.goto(url,wait_until='networkidle',timeout=10000)
    except Exception as e:
        print(json.dumps({'result':'BLOCKED','reason':str(e)[:350],'required':opt.required}));browser.close()
        raise SystemExit(1 if opt.required else 0)
    assert page.locator('#modal-title').inner_text()=='Welcome to Cinematic TV'
    page.get_by_role('button',name='Use recommended setup',exact=True).click()
    assert page.locator('#favourites .app-card').count()==8
    page.keyboard.press('ArrowUp');page.keyboard.press('Enter')
    assert page.locator('#page-title').inner_text()=='Launcher Settings'
    assert not errors,errors
    print(json.dumps({'result':'PASS','origin':'local HTTP','csp':'unchanged source policy','javascript_errors':errors}));browser.close()
