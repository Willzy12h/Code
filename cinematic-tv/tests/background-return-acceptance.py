"""Optional return UI and worker integration at an unchanged served origin; TV APIs mocked."""
from ui_support import server,prepare,click
from playwright.sync_api import sync_playwright
import json,os
with server() as url,sync_playwright() as p:
 launch={'headless':True,'chromium_sandbox':True}
 # Ubuntu's packaged Chrome has a supported AppArmor profile; keep sandbox enabled.
 if os.getenv('SANDBOXED_CHROMIUM_CHANNEL'):launch['channel']=os.environ['SANDBOXED_CHROMIUM_CHANNEL']
 browser=p.chromium.launch(**launch)
 page=browser.new_page(viewport={'width':1920,'height':1080});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 # Reuse native mocks as initialization scripts, leaving served source and CSP intact.
 class InitPage:
  def evaluate(self,code,arg=None):page.add_init_script('('+code+')('+('' if arg is None else json.dumps(arg))+')')
  def route(self,*args):page.route(*args)
  def set_default_timeout(self,t):page.set_default_timeout(t)
 prepare(InitPage(),native=True)
 page.add_init_script("window.__fg='youtube';window.webapis={appcommon:{getForegroundAppId:()=>window.__fg}};")
 page.goto(url,wait_until='domcontentloaded',timeout=10000);page.wait_for_timeout(300)
 click(page,'settings');click(page,'setting-startup')
 assert page.locator('#return-status').inner_text()=='Automatic return: Off'
 assert page.locator('[data-action=setting-startup] .setting-value').inner_text()=='Return: Off'
 page.get_by_role('button',name='Turn automatic return on',exact=True).click()
 page.get_by_role('button',name='Turn automatic return off',exact=True).wait_for()
 assert page.evaluate("localStorage.getItem('cinematic-tv-return-enabled')")=='1'
 assert page.locator('#return-status').inner_text()=='Automatic return: On'
 assert page.locator('[data-action=setting-startup] .setting-value').inner_text()=='Return: On'
 page.evaluate("()=>{window.__hidden=true;document.dispatchEvent(new Event('visibilitychange'));}")
 page.wait_for_timeout(850)
 assert not page.evaluate("window.__calls.includes('launch:CinemTV001.Launcher')")
 page.evaluate("window.__fg='com.samsung.tv.csfs'")
 page.wait_for_timeout(1100)
 assert page.evaluate("window.__calls.filter(x=>x==='launch:CinemTV001.Launcher').length")==1
 page.evaluate("()=>{window.__hidden=false;document.dispatchEvent(new Event('visibilitychange'));}")
 page.get_by_role('button',name='Open Samsung Home (pause return)',exact=True).click();page.wait_for_timeout(150)
 assert page.evaluate("window.__calls.includes('launch:com.samsung.tv.csfs')")
 before=page.evaluate('window.__calls.length')
 page.evaluate("()=>{window.__hidden=true;document.dispatchEvent(new Event('visibilitychange'));}");page.wait_for_timeout(1000)
 assert page.evaluate('window.__calls.length')==before
 page.evaluate("()=>{window.__hidden=false;document.dispatchEvent(new Event('visibilitychange'));}")
 click(page,'setting-startup');page.get_by_role('button',name='Turn automatic return off',exact=True).click()
 assert page.evaluate("localStorage.getItem('cinematic-tv-return-enabled')")=='0'
 page.evaluate("()=>{window.__hidden=true;document.dispatchEvent(new Event('visibilitychange'));}");page.wait_for_timeout(1000)
 # Regression: a failed fullscreen cleanup cannot be masked by stopPreview=true.
 page.evaluate("()=>{window.__hidden=false;document.dispatchEvent(new Event('visibilitychange'));}")
 page.get_by_role('button',name='Turn automatic return on',exact=True).click()
 page.get_by_role('button',name='Turn automatic return off',exact=True).wait_for()
 page.evaluate("""()=>{LauncherPlatform.leaveFullscreen=()=>Promise.resolve(false);
 LauncherPlatform.stopPreview=()=>Promise.resolve(true);
 LauncherPlatform.videoStatus=()=>({owner:'fullscreen',pending:0,blocked:true,operation:'Failed hide'});
 window.__calls=[];window.__fg='com.samsung.tv.csfs';window.__hidden=true;document.dispatchEvent(new Event('visibilitychange'));}""")
 page.wait_for_timeout(1300)
 assert not page.evaluate("window.__calls.includes('launch:CinemTV001.Launcher')"),'Return ignored failed HDMI cleanup'
 assert page.evaluate("localStorage.getItem('cinematic-tv-return-enabled')")=='0'
 assert not errors,errors
 print(json.dumps({'result':'PASS','checks':['default-off','enable','worker return from Samsung Home','no return over YouTube','pause escape','disable','failed HDMI cleanup blocks return'],'native_tv_apis':'mocked'}))
 browser.close()
