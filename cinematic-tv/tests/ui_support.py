"""Behaviour harness. CI serves exact files; restricted-host snapshot mode only removes CSP for inline loading. Native APIs/weather are mocks."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from contextlib import contextmanager
from threading import Thread
import json, os, shutil, re, base64
ROOT=Path(__file__).resolve().parents[1]
@contextmanager
def server():
    class Quiet(SimpleHTTPRequestHandler):
        def log_message(self,*args): pass
    srv=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT/'src')))
    Thread(target=srv.serve_forever,daemon=True).start()
    try: yield f'http://127.0.0.1:{srv.server_port}'
    finally: srv.shutdown();srv.server_close()
def chromium(p):
    path=os.getenv('CHROMIUM_PATH') or shutil.which('chromium')
    opts={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage']}
    if path: opts['executable_path']=path
    return p.chromium.launch(**opts)
def prepare(page,settings=None,native=False):
    state={'version':1,'setupDone':True,'previewMode':'off'}
    if settings: state.update(settings)
    page.set_default_timeout(1600)
    page.evaluate("""() => {Object.defineProperty(window,'localStorage',{configurable:true,value:{_d:{},getItem(k){return this._d[k]??null},setItem(k,v){this._d[k]=String(v)},removeItem(k){delete this._d[k]}}});}""")
    page.evaluate('(s)=>localStorage.setItem("cinematic-tv-v1",JSON.stringify(s))',state)
    if state.get('__pendingVideo'):page.evaluate('localStorage.setItem("cinematic-tv-video-pending","1")')
    page.evaluate("""()=>{window.fetch=async url=>({ok:true,status:200,json:async()=>String(url).includes('geocoding')?{results:[{name:'Ealing',latitude:51.51,longitude:-.3}]}:{current:{temperature_2m:13,weather_code:2}}})}""")
    page.route('https://**/*',lambda r:r.fulfill(status=200,content_type='application/json',body=json.dumps({'results':[{'name':'Ealing','latitude':51.51,'longitude':-.30}],'current':{'temperature_2m':13,'weather_code':2}})) )
    if native:
        page.evaluate('''() => {
        window.__calls=[];window.__hidden=false;
        Object.defineProperty(document,'hidden',{get:()=>window.__hidden});
        window.__apps=['YouTube','Crunchyroll','Apple TV','Netflix','Paramount+','Disney+','Prime Video','Hue Sync','BBC iPlayer','ITVX','Channel 4','5','Spotify','Plex','Twitch','SmartThings','Samsung Health'].map((name,i)=>({id:'native.'+i,name,show:true}));
        window.__source={type:'HDMI',number:1};
        window.__inputCallback=null;
        window.tizen={application:{getAppInfo:()=>({id:'CinemTV001.Launcher',version:'0.4.0'}),getAppsInfo:(ok)=>setTimeout(()=>ok(window.__apps),10),launch:(id,ok)=>{window.__calls.push('launch:'+id);ok();},getCurrentApplication:()=>({exit:()=>window.__calls.push('exit')})},
          systeminfo:{getPropertyValue:(k,ok)=>setTimeout(()=>ok({connected:[{type:'HDMI',number:1,editName:'PC'},{type:'HDMI',number:2,editName:'Console'}],disconnected:[{type:'HDMI',number:3}]}),5),addPropertyValueChangeListener:(k,fn)=>{window.__inputCallback=fn;return 1},removePropertyValueChangeListener:()=>{}},
          package:{setPackageInfoEventListener:fn=>{window.__packages=fn;},unsetPackageInfoEventListener:()=>{}},
          tvwindow:{getSource:()=>window.__source,setSource:(s,ok)=>{window.__calls.push('source:'+s.number);window.__source=s;setTimeout(ok,5);},show:(ok,fail,rect)=>{window.__calls.push('show');setTimeout(()=>ok(rect),5)},hide:ok=>{window.__calls.push('hide');setTimeout(ok,5)}}};
        }''')
def click(page,action):
    target=page.locator('button[data-action="'+action+'"]').first
    # Follow the same category route a user now takes; retain normal visibility checks.
    if target.count() and not target.is_visible():
        group=target.evaluate('e=>e.closest("[data-settings-group]")?.dataset.settingsGroup')
        if group:page.locator('.settings-category[data-group="'+group+'"]').click()
    target.click()

def render(page):
    """Offline snapshot of unchanged source text; no HTTP browser access is allowed in the host."""
    html=(ROOT/'src/index.html').read_text(encoding='utf-8')
    css=(ROOT/'src/css/styles.css').read_text(encoding='utf-8')
    for n in ['wallpaper.jpg','wallpaper-dawn.jpg','wallpaper-twilight.jpg']:
        data='data:image/jpeg;base64,'+base64.b64encode((ROOT/'src/assets'/n).read_bytes()).decode()
        css=css.replace("../assets/"+n,data)
    html=re.sub(r'<link[^>]*stylesheet[^>]*>','<style>'+css+'</style>',html)
    for name in re.findall(r'<script src="(js/[^"]+)"',html):
        code=(ROOT/'src'/name).read_text(encoding='utf-8')
        for image in ['wallpaper.jpg','wallpaper-dawn.jpg','wallpaper-twilight.jpg']:
            uri='data:image/jpeg;base64,'+base64.b64encode((ROOT/'src/assets'/image).read_bytes()).decode()
            code=code.replace("'assets/"+image+"'","'"+uri+"'")
        html=html.replace('<script src="'+name+'"></script>','<script>'+code+'</script>')
    html=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>', '', html)
    page.set_content(html,wait_until='domcontentloaded')
