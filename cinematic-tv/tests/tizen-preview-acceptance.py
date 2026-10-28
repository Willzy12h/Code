"""Browser acceptance using an asynchronous Samsung/Tizen API mock; NOT a physical TV test."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import base64,re,json
root=Path(__file__).parents[1]
html=(root/'src/index.html').read_text()
css=(root/'src/css/styles.css').read_text()
for name in ('wallpaper.jpg','wallpaper-twilight.jpg','wallpaper-dawn.jpg'):
    data='data:image/jpeg;base64,'+base64.b64encode((root/'src/assets'/name).read_bytes()).decode()
    css=css.replace("url('../assets/"+name+"')", "url('"+data+"')")
    html=html.replace("'assets/"+name+"'", "'"+data+"'")
html=re.sub(r'<link[^>]*stylesheet[^>]*>', '<style>'+css+'</style>',html)
for name in ('model','platform','app'):
    script=(root/'src/js'/ (name+'.js')).read_text()
    html=html.replace('<script src="js/'+name+'.js"></script>','<script>'+script+'</script>')
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1920,'height':1080},device_scale_factor=1)
    errors=[]
    page.on('pageerror', lambda e:errors.append(str(e)))
    page.evaluate("""() => {
      window.calls=[];window._current={type:'HDMI',number:2};
      const settings={version:1,previewMode:'selected',recent:[{id:'input:HDMI:1',name:'PC',at:Date.now()}],focusDefault:'recent',city:'London'};
      Object.defineProperty(window,'localStorage',{configurable:true,value:{_data:{},getItem(k){return this._data[k]||null;},setItem(k,v){this._data[k]=v;},removeItem(k){delete this._data[k];}}});
      window.localStorage.setItem('cinematic-tv-v1',JSON.stringify(settings));
      window.fetch=(u)=>Promise.resolve({ok:true,json:()=>Promise.resolve({current:{temperature_2m:13,weather_code:1}})});
      const sources={connected:[{type:'HDMI',number:1,editName:'PC'}],disconnected:[{type:'HDMI',number:2},{type:'HDMI',number:3},{type:'HDMI',number:4}]};
      const asyncOk=(fn)=>setTimeout(fn,10);
      window.tizen={
        application:{getAppInfo(){return{id:'CinemTV001.Launcher'};},getAppsInfo(ok){asyncOk(()=>ok(['YouTube','Crunchyroll','Apple TV','Netflix','Paramount+','Disney+','Prime Video','Hue Sync'].map((name,i)=>({id:'native.'+i,name,show:true}))));},launch(id,ok){calls.push('app:'+id);asyncOk(ok);},getCurrentApplication(){return{exit(){calls.push('exit')}}}},
        systeminfo:{getPropertyValue(k,ok){asyncOk(()=>ok(sources));},addPropertyValueChangeListener(){return 1;},removePropertyValueChangeListener(){}},
        tvwindow:{getSource(){return window._current;},setSource(s,ok){calls.push('source:'+s.number);asyncOk(()=>{window._current=s;ok();});},show(ok,fail,rect,type,z){calls.push('show:'+rect.join(':'));if(type!=='MAIN'||z!=='FRONT')throw Error('Invalid TVWindow arguments');asyncOk(ok);},hide(ok){calls.push('hide');asyncOk(ok);}}
      };
    }""")
    page.set_content(html,wait_until='domcontentloaded')
    page.wait_for_timeout(420)
    assert page.locator('#recent-list button').count()>=1
    assert page.locator('.is-focused').first.get_attribute('data-itemid')=='input:HDMI:1'
    assert 'show:' in '|'.join(page.evaluate('calls'))
    assert page.locator('#preview').get_attribute('class').find('is-live')>=0
    assert page.locator('#preview-indicator').inner_text()=='● Live HDMI'
    page.keyboard.press('ArrowDown')
    page.wait_for_timeout(120)
    assert 'YouTube' in page.locator('#preview-title').inner_text()
    assert page.evaluate('window._current.number')==2, 'preview should restore prior video source'
    assert page.locator('#preview').get_attribute('class').find('is-live')<0
    page.keyboard.press('ArrowUp')
    page.wait_for_timeout(240)
    assert page.evaluate('window._current.number')==1
    page.keyboard.press('Enter')
    page.wait_for_timeout(150)
    assert page.evaluate('window._current.number')==1
    assert any(x.startswith('show:0px:0px:1920px:1080px') for x in page.evaluate('calls')),'explicit fullscreen HDMI should show'
    page.keyboard.press('Escape')
    page.wait_for_timeout(200)
    assert page.locator('#page-title').inner_text()=='Home'
    assert not errors, errors
    print(json.dumps({'result':'PASS','preview_displayed':True,'restore_on_focus_change':True,'fullscreen_opened':True,'events':page.evaluate('calls'),'page_js_errors':errors},indent=2))
    browser.close()
