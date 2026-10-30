/* Cinematic TV v0.4 — remote-first Samsung TV launcher. */
(function(w,doc){
  'use strict';
  var M=w.LauncherModel,P=w.LauncherPlatform,F=w.LauncherFeatures,U=w.LauncherPresentation,VERSION='0.5.0';
  var STORAGE='cinematic-tv-v1', APP_CACHE='cinematic-tv-apps-v2', WEATHER_CACHE='cinematic-tv-weather-v1';
  function storageGet(key){try{return localStorage.getItem(key);}catch(e){return null;}}
  var state=M.load(storageGet(STORAGE)),page='home',filter='All',searchTerm='',selected=null,modalOpen=false,modalReturn=null;
  var catalog=[],inputList=[],appById={},inputById={},hiddenBack=false,editingFromApps=false,fullscreenInput=false;
  var toastTimer,previewTimer,previewGeneration=0,refreshGeneration=0,refreshThrottle=0,enterDown=false,enterLong=false,enterTimer=null;
  var inputMode=false,movingId=null,movingOriginal=null,diagnostics={status:'Not checked',error:'',lastCheck:0};
  var eventLog=[],launching=null,launchTimer=null,launchGeneration=0,refreshDeferred=false,hasCatalogue=false,wallpaperGeneration=0,firstDataRender=true,previewingId=null;
  var weatherController=null,weatherCode=null,locationRequest=0,unwatchApps=null,unwatchInputs=null,watchTimer=null,viewFocus={};
  var wallpaperManager=null,wallpaperCache=null,wallpaperBooting=false,curatedUri='',curatedRecord=null,curatedStats={count:0,bytes:0};
  var dailyClient=null,dailyRecord=null,dailyObjectUrl='',wallpaperStatus='Bundled wallpaper',weatherStatus='Not checked',weatherError='';
  try{var imageDb=null;try{imageDb=w.indexedDB;}catch(e){}dailyClient=w.LauncherWallpapers.create(w.fetch.bind(w),w.LauncherWallpapers.browserCache(imageDb));}catch(e){}
  var previewValidated=false,libraryReturn=null,settingsGroup='home',settingsPanel='',settingsPreviewKey='',inputReturn='home';
  var previewItem=null,undoRecord=null,undoTimer=null,solarData=null,wallpaperCurrent='',wallpaperPending='',wallpaperPaintToken=0,wallpaperFadeCommit=null;
  var weatherTime=0,weatherInFlight=false,weatherRequest=0,iconLoads={},viewportWidth=w.innerWidth,viewportHeight=w.innerHeight;
  var q=function(s){return doc.querySelector(s);};
  var qa=function(s){return Array.prototype.slice.call(doc.querySelectorAll(s));};
  function el(tag,cls,text){var e=doc.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
  var returnWorker=null,returnSetup=0,returnCleanup=Promise.resolve(true);
  var returnMode=w.LauncherReturn.create({now:Date.now,hidden:function(){return doc.hidden;},
    foreground:function(){return P.foregroundId();},
    launch:function(ok,fail){var token=returnSetup;returnCleanup.then(function(clean){
      if(token!==returnSetup||!returnMode.status().enabled||returnMode.status().paused){ok();return;}
      if(!clean){fail();return;}
      try{if(!doc.hidden||P.foregroundId()!=='com.samsung.tv.csfs'){ok();return;}
        var id=P.currentId();if(!id){fail();return;}P.launch(id,ok,fail);
      }catch(e){fail();}
    },fail);},
    stop:function(){if(returnWorker){returnWorker.terminate();returnWorker=null;}},
    fault:function(reason){setReturnPreference(false);logEvent('Background return',reason);},
    log:function(detail){logEvent('Background return',detail);}
  });
  function setReturnPreference(on){try{localStorage.setItem('cinematic-tv-return-enabled',on?'1':'0');return true;}catch(e){return false;}}
  function startReturnWorker(){
    if(returnWorker||!returnMode.status().enabled||returnMode.status().paused)return;
    try{returnWorker=new Worker('js/return-worker.js');returnWorker.onmessage=function(){returnMode.tick();};
      returnWorker.onerror=function(){returnMode.disable('Background worker failed; return disabled');};
    }catch(e){returnMode.disable('Background worker unavailable; return disabled');}
  }
  function configureReturn(on){
    var token=++returnSetup;returnMode.disable();setReturnPreference(false);
    if(!on)return Promise.resolve(false);
    return P.prepareReturn().then(function(available){
      if(token!==returnSetup)return false;
      if(!available||!P.currentId()){returnMode.disable('Foreground API unavailable; return disabled');return false;}
      if(!setReturnPreference(true))return false;
      returnMode.enable();startReturnWorker();return returnMode.status().enabled;
    });
  }
  function openSamsungHome(){
    ++returnSetup;returnMode.pause();
    stopVideoPreview().then(function(clean){
      if(!clean){toast('HDMI cleanup is unconfirmed; press Samsung Home');return;}
      P.launch('com.samsung.tv.csfs',function(){},function(){toast('Press the remote Home button; automatic return is paused');});
    });
  }
  function save(){try{localStorage.setItem(STORAGE,JSON.stringify(state));}catch(e){toast('Settings could not be saved');}}
  function toast(message){var t=q('#toast');t.textContent=message;t.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(function(){t.classList.remove('visible');},2300);}
  function logEvent(event,detail){
    eventLog.push({time:new Date().toISOString(),event:F.redact(event),detail:F.redact(detail)});
    if(eventLog.length>40)eventLog.shift();
  }
  function clearUndo(){
    clearTimeout(undoTimer);var b=q('#undo-action'),focused=selected===b;undoRecord=null;b.hidden=true;b.classList.remove('is-focused');
    if(focused){selected=null;setFocus(q('#'+page+' .navitem')||q('.masthead .navitem'));}
  }
  function offerUndo(type,item,index){
    clearUndo();undoRecord={type:type,id:item.id,index:index,expires:Date.now()+10000};var b=q('#undo-action');
    b.textContent='Undo '+(type==='hide'?'hide':'remove')+' · '+itemName(item);b.setAttribute('aria-label',b.textContent);b.hidden=false;
    undoTimer=setTimeout(clearUndo,10000);
  }
  function performUndo(){if(!undoRecord||Date.now()>=undoRecord.expires){clearUndo();return;}
    var record=undoRecord;state=U.undo(state,record);clearUndo();save();showPage(page,{itemId:record.id});toast('Change undone');
  }
  function motionReduced(){return state.reducedMotion||!!(w.matchMedia&&w.matchMedia('(prefers-reduced-motion: reduce)').matches);}
  function syncFocusFrame(){var frame=q('#focus-frame');if(frame)frame.hidden=true;}
  function updateDimming(){var shade=q('#ambient-shade');if(shade)shade.style.opacity=String(state.autoDimming?U.dimming(new Date(),solarData):0);}
  function paintWallpaper(uri,onCommit,onFail){
    if(uri===wallpaperCurrent){++wallpaperPaintToken;wallpaperPending='';if(wallpaperFadeCommit)wallpaperFadeCommit(true);if(onCommit)onCommit();return;}if(uri===wallpaperPending)return;
    wallpaperPending=uri;var token=++wallpaperPaintToken,image=new Image(),settled=false,timer;
    function fail(){if(settled)return;settled=true;clearTimeout(timer);if(token===wallpaperPaintToken){wallpaperPending='';wallpaperStatus='Image unavailable; keeping current wallpaper';}if(onFail)onFail();}
    timer=setTimeout(fail,6500);image.referrerPolicy='no-referrer';image.onerror=fail;
    image.onload=function(){
      var decoded;try{decoded=image.decode?image.decode():Promise.resolve();}catch(e){fail();return;}Promise.resolve(decoded).then(function(){
        if(settled)return;if(token!==wallpaperPaintToken){settled=true;clearTimeout(timer);if(onFail)onFail();return;}
        if(image.naturalWidth>8192||image.naturalHeight>8192){fail();return;}settled=true;clearTimeout(timer);wallpaperPending='';
        if(wallpaperFadeCommit)wallpaperFadeCommit();var wall=q('.backdrop'),next=q('#wallpaper-next');
        if(!next){next=el('div','backdrop wallpaper-next');next.id='wallpaper-next';next.setAttribute('aria-hidden','true');doc.body.insertBefore(next,q('.scrim'));}
        next.style.backgroundImage='url('+JSON.stringify(uri)+')';next.style.opacity='0';next.getBoundingClientRect();
        var finishTimer,finished=false;function finish(cancel){if(finished)return;finished=true;clearTimeout(finishTimer);if(!cancel){wall.style.backgroundImage='url('+JSON.stringify(uri)+')';wallpaperCurrent=uri;}next.style.transition='none';next.style.opacity='0';next.getBoundingClientRect();next.style.transition='';wallpaperFadeCommit=null;if(!cancel&&onCommit)onCommit();if(cancel&&onFail)onFail();if(page==='settings')settingsHomePreview();}
        if(motionReduced()){finish();return;}wallpaperFadeCommit=finish;next.style.opacity='1';finishTimer=setTimeout(finish,500);
      },fail);
    };image.src=uri;
  }
  function videoMarker(on){try{if(on)localStorage.setItem('cinematic-tv-video-pending','1');else localStorage.removeItem('cinematic-tv-video-pending');}catch(e){}}
  function stopVideoPreview(){previewValidated=false;
    return P.stopPreview().then(function(clean){
      if(clean!==false){var videoState=P.videoStatus();if(videoState.owner==='none'&&!videoState.pending&&!videoState.visible)videoMarker(false);return true;}
      state.previewMode='off';save();logEvent('HDMI cleanup','Recovery required');return false;
    },function(e){state.previewMode='off';save();logEvent('HDMI cleanup',e.message);return false;});
  }
  function captureFocus(){return selected?{itemId:selected.dataset.itemid,action:selected.dataset.action,zone:selected.dataset.zone}:null;}
  function refreshVisible(){
    if(modalOpen||inputMode||movingId||fullscreenInput||launching||doc.hidden){refreshDeferred=true;return;}
    refreshDeferred=false;var focus=firstDataRender&&page==='home'?null:captureFocus();firstDataRender=false;showPage(page,focus);
  }
  function flushRefresh(){if(refreshDeferred&&!modalOpen&&!movingId&&!inputMode&&!launching&&!fullscreenInput)refreshVisible();}
  function updateNetwork(){
    var n=q('#network-status');if(!n)return;n.hidden=!state.showNetwork;
    n.textContent=w.navigator.onLine===false?'Offline':'Network available';
    n.title='Browser network state; not an internet connectivity test';
  }
  function quickSwitch(){
    var previous=F.previousItem(state.recent,lookup);
    if(!previous){toast('No previous available app or input yet');return;}
    activate(previous);
  }
  function clearLaunch(){clearTimeout(launchTimer);launchTimer=null;launching=null;doc.body.classList.remove('launch-pending');}
  function cancelLaunch(){
    var was=launching;++launchGeneration;clearLaunch();
    if(was&&was.kind==='input'){P.leaveFullscreen().then(function(){stopVideoPreview();});}
    // A submitted application launch cannot be cancelled using the public API.
    if(was&&was.kind==='app')toast('Launch request already submitted; use Samsung Home if needed');
  }
  function launchFailed(message){++launchGeneration;clearLaunch();logEvent('Launch failed',message);toast(message);flushRefresh();}
  function profilesMenu(){
    var actions=state.profiles.map(function(p){return{label:'Use '+p.name,fn:function(){clearUndo();state=F.applyProfile(state,p);save();applyAppearance();showPage('home');}};});
    actions.push({label:'Save current Home',fn:function(){textDialog('Save Home profile','Name this favourites and appearance preset','',function(name){
      if(!name)return;var p=F.snapshotProfile(state,name),found=state.profiles.findIndex(function(x){return x.name.toLowerCase()===p.name.toLowerCase();});
      if(found>=0)state.profiles[found]=p;else if(state.profiles.length<8)state.profiles.push(p);else{toast('Up to eight profiles can be saved');return;}
      save();showPage('settings',{action:'setting-profiles'});toast('Home profile saved');
    },32);}});
    if(state.profiles.length)actions.push({label:'Delete a profile',fn:function(){modal('Delete Home profile','Only the saved preset is removed.',state.profiles.map(function(p,i){return{label:p.name,fn:function(){state.profiles.splice(i,1);save();showPage('settings',{action:'setting-profiles'});}};}).concat([{label:'Cancel',fn:function(){}}]));}});
    actions.push({label:'Cancel',fn:function(){}});modal('Home profiles',(state.profiles.length?'Saved favourites and appearance presets.':'No presets saved. Save current Home to create an optional favourites and appearance preset.')+' Weather, history and HDMI preview are not changed.',actions);
  }
  function inputIconMenu(){
    modal('Input icons','Choose an HDMI shortcut.',inputList.filter(function(i){return i.port.indexOf('HDMI')===0;}).map(function(item){return{label:itemName(item),fn:function(){
      modal('Icon for '+item.port,'This changes the launcher only.',['pc','console','streamer','receiver','generic'].map(function(icon){return{label:icon.charAt(0).toUpperCase()+icon.slice(1),fn:function(){state.inputIcons[item.port]=icon;save();showPage('settings',{action:'setting-icons'});}};}).concat([{label:'Cancel',fn:function(){}}]));
    }};}).concat([{label:'Cancel',fn:function(){}}]));
  }
  function choosePC(){
    modal('Choose PC input','Choose the actual port. No source is switched.',inputList.filter(function(i){return i.port.indexOf('HDMI')===0;}).map(function(i){return{label:itemName(i)+' · '+i.port,fn:function(){
      state.pcPort=i.port;state.inputNames[i.port]='PC';state.inputIcons[i.port]='pc';if(state.favouriteIds===null)state.favouriteIds=[];if((state.favouriteIds||[]).indexOf(i.id)<0)state.favouriteIds.push(i.id);save();showPage('home');
    }};}).concat([{label:'Cancel',fn:function(){}}]));
  }
  function maybeSetup(force){
    if(!force&&state.setupDone)return;
    modal('Welcome to Cinematic TV','Your apps, recent sources and scenic Home. Samsung Settings stay on the remote. The current PC source can stay visible while you browse. Preview can be disabled in Launcher Settings.',[
      {label:'Use recommended setup',fn:function(){state.setupDone=true;save();showPage('home');}},
      {label:'Choose favourite apps',fn:function(){state.setupDone=true;save();editingFromApps=true;showPage('apps');}},
      {label:'Later',fn:function(){state.setupDone=true;save();showPage('home');}}
    ]);
  }
  function granularReset(){
    var options=[['appearance','Appearance only'],['inputs','Input names and icons'],['history','Recent history'],['hidden','Hidden apps'],['weather','Weather choices'],['favourites','Favourite apps']];
    modal('Reset a section','Other launcher settings and Samsung settings are preserved.',options.map(function(pair){return{label:pair[1],fn:function(){
      modal('Reset '+pair[1].toLowerCase()+'?','This change affects Cinematic TV only.',[
        {label:'Reset',fn:function(){clearUndo();state=F.resetSection(state,pair[0]);if(state.favouriteIds===null)state.favouriteIds=M.initialFavourites(catalog);save();applyAppearance();showPage('settings',{action:'setting-resets'});}},
        {label:'Cancel',fn:function(){}}
      ]);
    }};}).concat([{label:'Cancel',fn:function(){}}]));
  }
  function downloadJSON(name,text){
    try{
      var blob=new Blob([text],{type:'application/json'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download=name;
      doc.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);
      toast('Download requested; use JSON text if this TV does not support file downloads');
    }catch(e){toast('Downloads unavailable; use the JSON text option');}
  }
  function importFile(){
    var input=el('input');input.type='file';input.accept='.json,application/json';input.hidden=true;doc.body.appendChild(input);
    input.onchange=function(){var file=input.files&&input.files[0];input.remove();if(!file)return;
      if(file.size>65536){toast('Backup must be smaller than 64 KiB');return;}
      var reader=new FileReader();reader.onload=function(){importChoices(String(reader.result));};reader.onerror=function(){toast('Backup file could not be read');};reader.readAsText(file);
    };
    input.click();setTimeout(function(){if(input.isConnected)input.remove();},60000);
  }
  function diagnosticsExport(){
    var status=P.videoStatus();
    downloadJSON('cinematic-tv-diagnostics.json',JSON.stringify({version:VERSION,mode:P.isTV?'Tizen TV':'Browser demo',
      appCount:catalog.length,inputCount:inputList.length,network:w.navigator.onLine===false?'Offline':'Network available',
      catalogue:diagnostics.status,weather:{status:weatherStatus,error:weatherError},wallpaper:{mode:state.wallpaper,status:wallpaperStatus},viewport:{width:w.innerWidth,height:w.innerHeight},video:{owner:status.owner,visible:status.visible,blocked:status.blocked,pending:status.pending,error:F.redact(status.lastError)},
      events:F.sanitiseDiagnostic(eventLog),hardwareVerified:false},null,2));
  }
  function checkUpdates(){
    toast('Checking public releases…');
    requestJSON('https://api.github.com/repos/Willzy12h/Code/releases/latest',6500).then(function(data){
      if(data.prerelease||data.draft||!data.tag_name){toast('No stable public release found');return;}
      toast(F.isNewer(data.tag_name,VERSION)?'New release '+M.safeText(data.tag_name,30)+' available on GitHub':'No newer stable public release found');
    }).catch(function(e){toast(e.message==='Request failed (404)'?'No stable public release published yet':'Could not check public releases; the network may be unavailable');});
  }
  function requestJSON(url,timeout,controller){
    controller=controller||(typeof AbortController==='function'?new AbortController():null);
    return new Promise(function(resolve,reject){
      var settled=false,timer=setTimeout(function(){if(settled)return;settled=true;if(controller)controller.abort();reject(new Error('Request timed out'));},timeout);
      fetch(url,controller?{signal:controller.signal}:{}).then(function(r){if(!r.ok)throw new Error('Request failed ('+r.status+')');return r.json();}).then(function(data){if(settled)return;settled=true;clearTimeout(timer);resolve(data);},function(e){if(settled)return;settled=true;clearTimeout(timer);reject(e);});
    });
  }

  function isDemo(){return !P.isTV;}
  function lookup(id){return appById[id]||inputById[id]||null;}
  function itemName(item){return item?(item.kind==='input'?(state.inputNames[item.port]||item.name||item.port):item.name):'';}
  function matchApp(name){return catalog.find(function(a){return a.name===name;});}
  function brandClass(name){name=M.nameOf(name).toLowerCase();var match=[['youtube','youtube'],['crunchyroll','crunchyroll'],['apple','apple-tv'],['netflix','netflix'],['paramount','paramount'],['disney','disney'],['prime','prime'],['hue','hue'],['spotify','spotify'],['plex','plex'],['iplayer','iplayer'],['bbc sounds','bbc-sounds'],['samsung health','samsung-health'],['twitch','twitch'],['itvx','itvx']];for(var i=0;i<match.length;i++)if(name===match[i][0]||name===({apple:'apple tv',paramount:'paramount+',disney:'disney+',prime:'prime video',hue:'hue sync',iplayer:'bbc iplayer'})[match[i][0]])return match[i][1];return'neutral';}
  function brandText(name){var words={'YouTube':'▶','Crunchyroll':'crunchyroll','Apple TV':'Apple TV','Netflix':'N','Paramount+':'Paramount+','Disney+':'Disney+','Prime Video':'prime video','Hue Sync':'hue','Plex':'PLEX','Spotify':'Spotify','BBC iPlayer':'BBC iPlayer','BBC Sounds':'BBC Sounds','ITVX':'itvx','5':'5','Channel 4':'4','Twitch':'Twitch','Samsung Health':'Samsung Health','SmartThings':'SmartThings'};return words[name]||String(name||'App').slice(0,17);}
  function logo(item){var name=itemName(item),l=el('div','logo '+brandClass(name));var word=el('span','logotext',item.kind==='input'?F.inputGlyph(state.inputIcons[item.port]):brandText(name));l.appendChild(word);
    if(item.kind==='input'){
      word.textContent='';word.classList.add('input-mark');
      var monitor=doc.createElementNS('http://www.w3.org/2000/svg','svg');monitor.setAttribute('viewBox','0 0 100 76');monitor.setAttribute('aria-hidden','true');
      var inputKind=state.inputIcons[item.port]||(/\b(pc|computer|desktop)\b/i.test(name)?'pc':'generic');
      var inputPaths={pc:'M14 8 H86 Q92 8 92 14 V52 Q92 58 86 58 H14 Q8 58 8 52 V14 Q8 8 14 8 Z M35 69 H65 M50 58 V69',console:'M28 23 H72 Q83 23 87 36 L93 56 Q96 68 84 66 L68 54 H32 L16 66 Q4 68 7 56 L13 36 Q17 23 28 23 Z M24 34 V48 M17 41 H31 M70 36 H71 M78 45 H79',streamer:'M18 15 H82 Q88 15 88 21 V55 Q88 61 82 61 H18 Q12 61 12 55 V21 Q12 15 18 15 Z M34 27 L65 38 L34 49 Z',receiver:'M14 18 H86 V59 H14 Z M24 29 H55 V38 H24 Z M70 30 A8 8 0 1 0 70 46 A8 8 0 1 0 70 30 M25 48 H47',generic:'M18 20 H82 V42 L69 57 H31 L18 42 Z M31 31 V40 M43 31 V40 M55 31 V40 M67 31 V40 M50 57 V69'};
      var outline=doc.createElementNS(monitor.namespaceURI,'path');outline.setAttribute('d',inputPaths[inputKind]||inputPaths.generic);outline.setAttribute('fill','none');outline.setAttribute('stroke','currentColor');outline.setAttribute('stroke-width','4');outline.setAttribute('stroke-linecap','round');outline.setAttribute('stroke-linejoin','round');monitor.appendChild(outline);word.appendChild(monitor);
    }
    if(item.kind==='app'){
      word.textContent=name;word.classList.add('name-fallback');var choice=w.LauncherAppArtwork.choice(item);
      if(choice.kind==='native'){
        var img=el('img','native-icon');img.alt='';img.decoding='async';
        img.onload=function(){if(!w.LauncherAppArtwork.fit(img.naturalWidth,img.naturalHeight)){img.onerror();return;}word.style.display='none';l.classList.add('has-native-art');};
        img.onerror=function(){img.remove();word.style.display='';l.classList.remove('has-native-art');};
        P.resolveIcon(choice.source,function(url){if(url)img.src=url;else img.onerror();});l.appendChild(img);
      }
    }
    return l;}
  function button(action,cls,item){var b=el('button','navitem '+(cls||''));b.type='button';if(action)b.dataset.action=action;if(item)b.dataset.itemid=item.id;return b;}
  function fallbackInput(id){var match=/^input:(HDMI|TV):(\d+)$/.exec(id);if(!match)return null;var port=match[1]+' '+match[2];return{id:id,kind:'input',port:port,name:port,connected:false,raw:null};}
  function favouriteItems(){return(state.favouriteIds||[]).map(function(id){return lookup(id)||fallbackInput(id);}).filter(Boolean);}
  function recentItems(){var out=[],used={};state.recent.forEach(function(r){var item=lookup(r.id);
    if(!item||used[r.id]||item.kind==='app'&&state.hiddenAppIds.indexOf(item.id)>=0)return;
    if(item.kind==='input'&&!item.connected&&state.hideDisconnected)return;
    used[item.id]=true;out.push(item);
  });
    if(!out.length)inputList.filter(function(i){return i.connected;}).forEach(function(i){if(!used[i.id]){out.push(i);used[i.id]=true;}});
    if(isDemo()&&out.length<4)['YouTube','Apple TV','Netflix'].forEach(function(n){var a=matchApp(n);if(a&&!used[a.id]){used[a.id]=true;out.push(a);}});
    return out.slice(0,state.recentCount);}
  function timeLabel(id){var r=state.recent.find(function(x){return x.id===id;});if(!r)return'Quick access';var mins=Math.max(0,Math.floor((Date.now()-r.at)/60000));if(mins<1)return'Just now';if(mins<60)return mins+' min ago';var hours=Math.floor(mins/60);if(hours<24)return hours+' hr ago';return Math.floor(hours/24)+' days ago';}
  function fillRecent(){var area=q('#recent-list');area.textContent='';recentItems().forEach(function(item){var b=button('','recent-item',item);b.dataset.zone='recent';b.appendChild(logo(item));var info=el('div','recent-copy');info.appendChild(el('span','name',itemName(item)));info.appendChild(el('span','meta',timeLabel(item.id)));b.appendChild(info);b.onclick=function(){activate(item);};area.appendChild(b);});
    if(!area.children.length)area.appendChild(el('div','empty-placeholder','Your recently opened apps will appear here.'));}
  function appCard(item,zone){var b=button('','app-card',item);b.dataset.zone=zone;b.appendChild(logo(item));b.appendChild(el('span','name',itemName(item)));if(item.kind==='app'&&state.hiddenAppIds.indexOf(item.id)>=0)b.classList.add('hidden-app');
    if(item.kind==='input'&&!item.connected)b.classList.add('unavailable');
    b.onclick=function(){if(page==='edit')editActions(item);else if(page==='apps'&&editingFromApps){toggleFavourite(item);refreshView('apps',b.dataset.itemid);return;}else activate(item);};return b;}
  function fillFavourites(){var area=q('#favourites');area.textContent='';favouriteItems().forEach(function(item){area.appendChild(appCard(item,'favourites'));});
    var library=button('apps','app-card library-card');library.dataset.zone='favourites';library.appendChild(el('div','logo library-logo','All apps'));library.appendChild(el('span','name','All apps'));area.appendChild(library);
    q('#favourites-count').textContent=(state.favouriteIds||[]).length>8?'Use ← → for more':'';
    if(!area.children.length){var b=button('apps','pill');b.textContent='Add favourite apps';area.appendChild(b);}}
  function fillApps(){var area=q('#apps-grid');area.textContent='';q('[data-action="manage-hidden"]').textContent='Hidden apps ('+catalog.filter(function(a){return state.hiddenAppIds.indexOf(a.id)>=0;}).length+')';var query=searchTerm.toLowerCase();catalog.filter(function(item){return(state.showHidden||state.hiddenAppIds.indexOf(item.id)<0)&&(filter==='All'||M.detectCategory(item.name)===filter)&&(!query||item.name.toLowerCase().indexOf(query)>=0);}).forEach(function(item){var card=appCard(item,'apps');if(state.favouriteIds&&(state.favouriteIds||[]).indexOf(item.id)>=0)card.title='Pinned to Home';area.appendChild(card);});
    qa('.filter[data-filter]').forEach(function(b){b.classList.toggle('active',b.dataset.filter===filter);});q('#search-status').textContent=searchTerm?'Search: '+searchTerm:'';
    if(!area.children.length)area.appendChild(el('div','empty-placeholder','No matching apps. Clear the search, enable hidden apps or refresh the catalogue.'));}
  function fillInputs(){var area=q('#input-grid');area.textContent='';inputList.forEach(function(item){var b=button('','input-card',item);b.dataset.zone='inputs';b.appendChild(el('span','input-icon',F.inputGlyph(state.inputIcons[item.port])));var body=el('div');body.appendChild(el('div','input-name',itemName(item)));body.appendChild(el('div','input-port',item.port));body.appendChild(el('div',item.connected?'connected':'disconnected',item.connected?'● Connected':'○ Not connected'));if((state.favouriteIds||[]).indexOf(item.id)>=0)body.appendChild(el('div','pinned-indicator','★ Pinned to Home'));b.appendChild(body);b.onclick=function(){activate(item);};area.appendChild(b);});
    if(!area.children.length)area.appendChild(el('div','empty-placeholder','No HDMI inputs have been reported by the television.'));}
  function fillEdit(){var area=q('#edit-grid');area.textContent='';favouriteItems().forEach(function(item){var b=button('','edit-action',item);b.dataset.zone='edit';if(item.id===movingId)b.classList.add('moving');b.appendChild(logo(item));var copy=el('div');copy.appendChild(el('div','',itemName(item)));copy.appendChild(el('div','meta',movingId===item.id?'← → Move · OK Save':'Hold OK / select to edit'));b.appendChild(copy);b.onclick=function(){if(movingId){finishMove(true);return;}editActions(item);};area.appendChild(b);});
    if(!movingId){var add=button('editadd','edit-action');add.appendChild(el('strong','','＋'));add.appendChild(el('span','','Add app'));area.appendChild(add);var pin=button('editinput','edit-action');pin.appendChild(el('strong','','▣'));pin.appendChild(el('span','','Pin HDMI'));area.appendChild(pin);}}
  function setting(label,description,value,action){var b=button(action,'setting-row');b.dataset.zone='settings';var wrap=el('div');wrap.appendChild(el('div','',label));wrap.appendChild(el('div','desc',description));b.appendChild(wrap);b.appendChild(el('span','setting-value',String(value)));return b;}
  function fillSettings(){var area=q('#settings-list');area.textContent='';
    var rows=[
      ['First-run setup','Review the initial choices without resetting anything','Open','setting-setup'],
      ['Automatic return and exit','Return after other apps, Samsung Home access and exit','Return: '+returnStatusLabel(),'setting-startup'],
      ['Home profiles','Save and switch favourites and appearance',state.profiles.length?state.profiles.length+' presets':'No presets saved','setting-profiles'],
      ['Switch input','Open a connected source in the compact input panel','Choose','setting-inputs'],
      ['Choose PC input','Name and pin the actual PC port without switching it','Choose','setting-pc'],
      ['Default Home selection','Last used, PC or first favourite',{recent:'Last used',pc:'PC',favourite:'Favourite'}[state.focusDefault],'setting-focus'],
      ['PC preview','Keep the current PC HDMI picture while browsing',state.previewMode==='off'?'Off':'On','setting-preview'],
      ['Preview source policy','Default: only preview the currently selected TV source',state.autoPreviewCurrentOnly?'Current source only':'Allow temporary switch','setting-preview-policy'],
      ['Recover HDMI','Attempt cleanup after a native API error','Retry','setting-video-reset'],
      ['Recent items','How many apps and inputs to show',state.recentCount,'setting-recent'],
      ['Quick Switch','Show a shortcut to the previous app/input',state.quickSwitch?'On':'Off','setting-quick'],
      ['Network indicator','Link state only; not an internet availability test',state.showNetwork?'On':'Off','setting-network'],
      ['Weather','Current conditions from Open-Meteo',state.showWeather?'On':'Off','setting-weather'],
      ['Refresh weather','Retry the weather service now',weatherStatus,'setting-weather-refresh'],
      ['Clock','Show the time on the Home header',state.showClock?'On':'Off','setting-clock'],
      ['Weather location','Choose town or postcode (no GPS)',state.city,'setting-city'],
      ['Temperature','Celsius or Fahrenheit',state.tempUnit==='celsius'?'°C':'°F','setting-unit'],
      ['Wallpaper','Cached 4K photographs, bundled pictures or an image link',state.wallpaper==='scenic'?'Scenic':state.wallpaper==='twilight'?'Twilight':state.wallpaper==='dawn'?'Dawn':state.wallpaper==='custom'?'Custom':state.wallpaper==='auto'?'Automatic':state.wallpaper==='daily'?'Daily photograph':state.wallpaper==='curated'?'Curated Wikimedia':'Dark','setting-wallpaper'],
      ['Wallpaper credits','Daily photograph source, photographer and licence','View','setting-wallpaper-credits'],
      ['Weather-adaptive wallpaper','Affects Automatic wallpaper only; uses existing weather data',state.adaptiveWeather?'On':'Off','setting-adaptive'],
      ['Reduced glass effects','Less blur for a lighter interface',state.reducedEffects?'On':'Off','setting-effects'],
      ['Custom wallpaper URL','HTTPS image; optional, online',state.customWallpaperUrl?'Configured':'Not set','setting-custom'],
      ['Automatic wallpaper dimming','Day, sunset and night at the saved weather location',state.autoDimming?'On':'Off','setting-dimming'],
      ['Selection glow','Blue or white focus outline',state.glow==='blue'?'Blue':'White','setting-glow'],
      ['Reduce motion','Minimal animation transitions',state.reducedMotion?'On':'Off','setting-motion'],
      ['Long-press OK','Edit shortcut rather than launch',state.longPressMs+' ms','setting-hold'],
      ['Disconnected inputs','Hide from recent activity only',state.hideDisconnected?'Hidden':'Shown','setting-disconnected'],
      ['Rename HDMI','Rename any input, even disconnected','Edit','setting-rename'],
      ['Include hidden apps','Show user-hidden entries in All Apps; services stay excluded',state.showHidden?'Shown':'Hidden','setting-hidden'],
      ['Manage favourites','Add, remove and reposition apps and inputs','Edit','edit'],
      ['Search installed apps','Find an app by name','Search','setting-search'],
      ['Refresh catalogue','Recheck applications and input state','Refresh','setting-refresh'],
      ['Diagnostic information','API access, catalogue status, hardware checks','View','setting-diagnostics'],
      ['Input icons','PC, console, streamer, receiver or generic','Choose','setting-icons'],
      ['About and updates','Cinematic TV '+VERSION+' · no automatic updates','Open','setting-about'],
      ['Export diagnostics','Redacted events; no DUID, certificate or watch history','Download','setting-log-export'],
      ['Reset a section','Preserve the rest of your configuration','Choose','setting-resets'],
      ['Backup preferences','Export or restore local launcher choices','Manage','setting-backup'],
      ['Manage hidden apps','Restore individual apps without changing Home pins',catalog.filter(function(a){return state.hiddenAppIds.indexOf(a.id)>=0;}).length,'setting-manage-hidden'],
      ['Reset launcher','Clear configuration and recent activity','Reset','setting-reset']
     ];
    var shell=q('#settings-shell');if(!shell){shell=el('div','settings-shell');shell.id='settings-shell';area.parentNode.insertBefore(shell,area);var rail=el('nav','settings-categories');rail.id='settings-categories';rail.setAttribute('aria-label','Settings categories');shell.appendChild(rail);shell.appendChild(area);}
    var rail=q('#settings-categories');rail.textContent='';w.LauncherSettings.groups.forEach(function(g){var tab=button('settings-group','settings-category');tab.dataset.group=g.id;tab.textContent=g.label;tab.setAttribute('aria-pressed',String(g.id===settingsGroup));rail.appendChild(tab);});
    w.LauncherSettings.groups.forEach(function(g){var section=el('section','settings-group');section.dataset.settingsGroup=g.id;section.hidden=g.id!==settingsGroup;section.appendChild(el('h2','settings-group-title',g.label));rows.filter(function(r){return g.actions.indexOf(r[3])>=0;}).forEach(function(r){var row=setting.apply(null,r);if(r[2]==='On'||r[2]==='Off'){row.setAttribute('role','switch');row.setAttribute('aria-checked',String(r[2]==='On'));row.classList.add('switch-row');}section.appendChild(row);});area.appendChild(section);});
    if(settingsPanel==='wallpaper')fillWallpaperPanel();

  }
  function wallpaperRow(label,value,action){return setting(label,'',value,action);}
  function fillWallpaperPanel(){
    var section=q('.settings-group[data-settings-group="appearance"]');section.textContent='';section.appendChild(el('h2','settings-group-title','Wallpapers'));
    section.appendChild(wallpaperRow('Back to Appearance','Back','wallpaper-back'));
    section.appendChild(wallpaperRow('Source',state.wallpaper==='curated'?'Curated Wikimedia':state.wallpaper,'wallpaper-source'));
    section.appendChild(wallpaperRow('Previous photograph','Previous','wallpaper-previous'));section.appendChild(wallpaperRow('Next photograph','Next','wallpaper-next'));
    section.appendChild(wallpaperRow('Hourly rotation',state.wallpaperRotation?'On':'Off','wallpaper-rotation'));
    section.appendChild(wallpaperRow('Automatic night dimming',state.autoDimming?'On':'Off','setting-dimming'));
    section.appendChild(el('div','wallpaper-topics-label','Include themes'));
    w.LauncherWallpaperCatalogue.TOPICS.forEach(function(topic){var row=wallpaperRow(topic.charAt(0).toUpperCase()+topic.slice(1),state.wallpaperTopics.indexOf(topic)>=0?'On':'Off','wallpaper-topic');row.dataset.topic=topic;row.setAttribute('role','switch');row.setAttribute('aria-checked',String(state.wallpaperTopics.indexOf(topic)>=0));section.appendChild(row);});
    section.appendChild(wallpaperRow('Image link',state.customWallpaperUrl?'Configured':'HTTPS image','setting-custom'));
    section.appendChild(wallpaperRow('Downloaded cache',curatedStats.count+' / 6 · '+(curatedStats.bytes/1048576).toFixed(1)+' / 24 MiB','wallpaper-cache'));
    section.appendChild(wallpaperRow('Clear downloaded images','Clear','wallpaper-clear'));
    section.appendChild(wallpaperRow('Photographer and licence','Credits','setting-wallpaper-credits'));
    var status=el('p','wallpaper-manager-status',wallpaperStatus);status.setAttribute('role','status');section.appendChild(status);
  }
  function decodeWallpaperRecord(record){return new Promise(function(resolve,reject){
    var url=URL.createObjectURL(record.blob),image=new Image(),done=false,timer=setTimeout(function(){finish(Error('Image decode timed out'));},8000);
    function finish(error){if(done)return;done=true;clearTimeout(timer);URL.revokeObjectURL(url);if(error)reject(error);else resolve(record);}
    image.onerror=function(){finish(Error('Image decode failed'));};image.onload=function(){Promise.resolve(image.decode?image.decode():undefined).then(function(){
      if(!record.legacy&&(image.naturalWidth<3840||image.naturalHeight<2160)||image.naturalWidth>8192||image.naturalHeight>8192){finish(Error('Image is not 4K suitable'));return;}
      try{var canvas=doc.createElement('canvas');canvas.width=384;canvas.height=216;var ctx=canvas.getContext('2d'),ratio=Math.max(384/image.naturalWidth,216/image.naturalHeight);ctx.drawImage(image,(384-image.naturalWidth*ratio)/2,(216-image.naturalHeight*ratio)/2,image.naturalWidth*ratio,image.naturalHeight*ratio);record.bootUri=canvas.toDataURL('image/jpeg',.65);record.bootBytes=record.bootUri.length*4;}catch(e){}
      finish();
    },function(){finish(Error('Image decode failed'));});};image.src=url;
  });}
  function presentCurated(record){return new Promise(function(resolve){
    if(state.wallpaper!=='curated'||doc.hidden){resolve(false);return;}
    var uri=record.blob?URL.createObjectURL(record.blob):record.bundled;if(!uri){resolve(false);return;}
    paintWallpaper(uri,function(){var old=curatedUri;curatedUri=uri;curatedRecord=record;
      if(old&&old.indexOf('blob:')===0&&old!==uri)URL.revokeObjectURL(old);
      try{if(record.bootUri&&record.bootUri.length<100000)localStorage.setItem('cinematic-tv-wallpaper-boot',JSON.stringify({id:record.id,uri:record.bootUri}));else if(record.bundled)localStorage.removeItem('cinematic-tv-wallpaper-boot');}catch(e){}
      resolve(true);
    },function(){if(record.blob)URL.revokeObjectURL(uri);resolve(false);});
  });}
  function startCurated(){
    if(wallpaperManager){wallpaperManager.configure(state);wallpaperManager.setVisible(!doc.hidden);if(curatedUri&&wallpaperCurrent!==curatedUri)paintWallpaper(curatedUri);return;}
    if(wallpaperBooting)return;wallpaperBooting=true;
    Promise.resolve(w.LauncherWallpaperData).then(function(raw){
      if(state.wallpaper!=='curated'||doc.hidden)return;
      var catalogue=w.LauncherWallpaperCatalogue.validate(raw);wallpaperCache=w.LauncherWallpapers.browserCacheV2(w.indexedDB);
      wallpaperManager=w.LauncherWallpaperManager.create({cache:wallpaperCache,catalogue:catalogue,fetcher:w.fetch.bind(w),now:Date.now,validateImage:decodeWallpaperRecord,onReady:presentCurated,onStatus:function(message,stats){wallpaperStatus=message;curatedStats=stats;var status=q('.wallpaper-manager-status');if(status)status.textContent=message;var value=q('[data-action="wallpaper-cache"] .setting-value');if(value)value.textContent=stats.count+' / 6 · '+(stats.bytes/1048576).toFixed(1)+' / 24 MiB';}});
      return wallpaperManager.start(state).then(function(){
        if(doc.hidden||state.wallpaper!=='curated')return;
        var last=Number(storageGet('cinematic-tv-catalogue-checked')||0);if(Date.now()-last<86400000)return;try{localStorage.setItem('cinematic-tv-catalogue-checked',String(Date.now()));}catch(e){}
        return w.LauncherWallpapers.catalogueData(w.fetch.bind(w),'https://api.github.com/repos/Willzy12h/Code/contents/cinematic-tv/src/assets/wallpapers/catalogue.json?ref=gpt%2Fcinematic-tv-v0.4.0').then(function(data){if(data.content&&data.encoding==='base64'){if(data.content.length>180000)throw Error('Catalogue too large');wallpaperManager.setCatalogue(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(data.content.replace(/\s/g,'')),function(c){return c.charCodeAt(0);}))));}},function(){logEvent('Wallpaper catalogue','Using bundled catalogue');});
      });
    }).catch(function(e){wallpaperStatus='Catalogue unavailable; bundled scenery retained';logEvent('Wallpaper',e.message);}).then(function(){wallpaperBooting=false;});
  }

  function applyAppearance(){
    doc.body.classList.toggle('reduced-motion',!!state.reducedMotion);doc.body.classList.toggle('white-glow',state.glow==='white');
    doc.body.classList.toggle('reduced-effects',state.reducedEffects);doc.body.dataset.layout='cinematic';
    q('#clock').style.display=state.showClock?'block':'none';q('#weather').style.display=state.showWeather?'flex':'none';
    var quick=q('[data-action="quick-switch"]');if(quick)quick.hidden=!state.quickSwitch;
    updateNetwork();
    updateDimming();
    if(wallpaperManager)wallpaperManager.setVisible(state.wallpaper==='curated'&&!doc.hidden);
    var wall=q('.backdrop'),images={scenic:'assets/wallpaper.jpg',twilight:'assets/wallpaper-twilight.jpg',dawn:'assets/wallpaper-dawn.jpg'};
    var selectedWallpaper=state.wallpaper==='auto'?F.wallpaperAt(new Date().getHours(),weatherCode,state.adaptiveWeather):state.wallpaper;
    if(!wallpaperCurrent){wallpaperCurrent=images.scenic;wall.style.backgroundImage='url('+JSON.stringify(images.scenic)+')';}
    var next=q('#wallpaper-next');if(selectedWallpaper==='dark'){++wallpaperPaintToken;wallpaperPending='';if(wallpaperFadeCommit)wallpaperFadeCommit();wall.style.display='none';if(next)next.style.display='none';return;}
    wall.style.display='';if(next)next.style.display='';var uri=selectedWallpaper==='custom'?M.safeUrl(state.customWallpaperUrl):images[selectedWallpaper]||images.scenic,token=++wallpaperGeneration;
    if(selectedWallpaper==='curated'){startCurated();return;}
    if(selectedWallpaper==='daily'){
      if(!dailyClient){wallpaperStatus='Daily image unavailable; keeping current wallpaper';return;}
      dailyClient.load().then(function(record){
        if(token!==wallpaperGeneration||state.wallpaper!=='daily'||record===dailyRecord&&dailyObjectUrl)return;
        var url=URL.createObjectURL(record.blob);paintWallpaper(url,function(){var old=dailyObjectUrl;dailyObjectUrl=url;dailyRecord=record;if(old&&old!==url)URL.revokeObjectURL(old);wallpaperStatus=record.cached?'Daily photograph · cached':'Daily photograph';},function(){URL.revokeObjectURL(url);});
      }).catch(function(e){if(token===wallpaperGeneration){wallpaperStatus=F.redact(e.message);logEvent('Wallpaper',e.message);}});return;
    }
    paintWallpaper(uri);
  }

  function updateClock(){q('#clock').textContent=new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});}
  function weatherGlyph(code){return code===0?'☀':code<=3?'☁':code>=51&&code<=67?'☂':code>=71&&code<=86?'❄':code>=95?'☈':'☁';}
  function formatWeather(data,stale){if(!data||!data.current||!Number.isFinite(data.current.temperature_2m))return false;
    var value=Math.round(data.current.temperature_2m);q('.weather-symbol').textContent=weatherGlyph(data.current.weather_code||0);
    q('#weather-info').textContent=value+(state.tempUnit==='fahrenheit'?'°F':'°C')+'  '+state.city+(stale?' · cached':'');return true;}
  function updateWeatherStatus(){var value=q('#settings-list [data-action="setting-weather-refresh"] .setting-value');if(value)value.textContent=state.showWeather?weatherStatus:'Off';}
  function refreshWeather(force){
    if(!state.showWeather&&!state.autoDimming){weatherStatus='Off';weatherError='';updateWeatherStatus();return;}if(doc.hidden)return;
    if(force&&weatherController){weatherController.abort();weatherRequest++;weatherInFlight=false;}
    if(weatherInFlight)return;
    var now=Date.now(),location=state.latitude+','+state.longitude+','+state.tempUnit,cached=null;
    try{cached=JSON.parse(storageGet(WEATHER_CACHE)||'null');}catch(e){}
    var cacheUsable=cached&&cached.location===location&&Number.isFinite(cached.at)&&now>=cached.at&&now-cached.at<6*60*60*1000;
    if(cacheUsable&&formatWeather(cached.data,true)){solarData=cached.data;updateDimming();weatherStatus='Cached';weatherError='';updateWeatherStatus();
      if(!force&&now-cached.at<30*60*1000){formatWeather(cached.data,false);weatherCode=cached.data.current.weather_code;return;}
    }else q('#weather-info').textContent='Loading weather…';
    if(!force&&now-weatherTime<12*60*1000)return;
    weatherTime=now;weatherInFlight=true;weatherStatus='Loading';weatherError='';updateWeatherStatus();var gen=++weatherRequest;
    weatherController=typeof AbortController==='function'?new AbortController():null;
    var url='https://api.open-meteo.com/v1/forecast?latitude='+encodeURIComponent(state.latitude)+'&longitude='+encodeURIComponent(state.longitude)+'&current=temperature_2m,weather_code&temperature_unit='+state.tempUnit+'&timezone=auto&daily=sunrise,sunset&timeformat=unixtime&forecast_days=3';
    requestJSON(url,6500,weatherController).then(function(data){
      if(gen!==weatherRequest||(!state.showWeather&&!state.autoDimming))return;
      if(!formatWeather(data,false))throw new Error('Weather response contains no valid current temperature');
      weatherStatus='Loaded';weatherError='';solarData=data;updateDimming();
      weatherCode=data.current.weather_code;try{localStorage.setItem(WEATHER_CACHE,JSON.stringify({location:location,at:Date.now(),data:data}));}catch(e){}
      if(state.wallpaper==='auto')applyAppearance();
    }).catch(function(e){if(gen===weatherRequest){weatherStatus=cacheUsable?'Cached':'Unavailable';weatherError=F.redact(e.message);if(cacheUsable)formatWeather(cached.data,true);else q('#weather-info').textContent='Weather unavailable';logEvent('Weather',e.message);}})
      .then(function(){if(gen===weatherRequest){weatherInFlight=false;weatherController=null;updateWeatherStatus();}});
  }
  function previewTarget(item){
    if(state.pcPort)return inputList.find(function(x){return x.port===state.pcPort;})||fallbackInput('input:HDMI:'+state.pcPort.split(' ')[1]);
    var pc=inputList.find(function(x){return x.connected&&x.port.indexOf('HDMI')===0&&/\b(pc|computer|desktop)\b/i.test(itemName(x));});
    if(pc)return pc;
    if(state.previewMode!=='selected')return item;
    var current=P.currentSource();
    return inputList.find(function(x){return x.connected&&x.raw&&current&&current.type==='HDMI'&&x.raw.type===current.type&&Number(x.raw.number)===Number(current.number);})||item;
  }
  function preview(item){if(!item||page!=='home'||fullscreenInput||modalOpen||launching)return;
    item=previewTarget(item);previewItem=item;var hit=q('#preview-hit');hit.disabled=item.kind!=='input';hit.setAttribute('aria-label',item.kind==='input'?'Open '+itemName(item)+' — '+item.port:'Select an HDMI input');
    if(state.previewMode==='off'&&item.id===previewingId&&!q('#preview').classList.contains('is-live'))return;
    if(state.previewMode==='selected'&&item.id===previewingId){
      var active=P.videoStatus();
      if(item.connected&&active.owner==='preview'&&active.visible&&!active.blocked&&!active.pending){
        if(!previewValidated){var check=P.currentSource();previewValidated=!!(check&&item.raw&&check.type===item.raw.type&&Number(check.number)===Number(item.raw.number));}
        if(previewValidated){q('#preview-title').textContent=itemName(item);q('#preview-meta').textContent=item.port;return;}
      }
    }
    previewingId=item.id;
    var gen=++previewGeneration;clearTimeout(previewTimer);stopVideoPreview();var area=q('#preview'),art=q('#preview-art');area.classList.remove('is-live');art.textContent='';art.className='preview-art';
    q('#preview-title').textContent=itemName(item);q('#preview-meta').textContent=item.kind==='input'?item.port+' · '+(item.connected?'Connected':'Not connected'):'Last used '+timeLabel(item.id)+' · OK to open';q('#preview-indicator').hidden=true;
    if(item.kind==='input'){
      art.classList.add('preview-pc');art.appendChild(el('div','monitor-mock'));
      var caption=el('span','art-caption','');art.appendChild(caption);
      if(!item.connected){caption.textContent='HDMI is disconnected';return;}
      if(state.previewMode==='off'||!P.isTV)return;
      var current=P.currentSource();
      if(state.autoPreviewCurrentOnly&&(!current||current.type!==item.raw.type||Number(current.number)!==Number(item.raw.number))){caption.textContent='';return;}

      previewTimer=setTimeout(function(){if(gen!==previewGeneration||page!=='home'||doc.hidden)return;
        var r=q('#preview-media').getBoundingClientRect(),rect=U.percentages(U.innerRect(r,w.innerWidth,w.innerHeight),w.innerWidth,w.innerHeight);
        videoMarker(true);P.preview(item.raw,rect,function(){if(gen!==previewGeneration||page!=='home'){stopVideoPreview();return;}previewValidated=true;area.classList.add('is-live');q('#preview-indicator').hidden=true;q('#preview-indicator').textContent='';q('#preview-meta').textContent=item.port;},
          function(message){if(gen===previewGeneration){caption.textContent='Preview unavailable';state.previewMode='off';save();logEvent('Preview failed',message);}});
      },115);
    }else{art.classList.add('art-'+brandClass(item.name));art.appendChild(el('div','orbit'));var big=logo(item);big.classList.add('hero-logo');art.appendChild(big);art.appendChild(el('span','art-caption',''));}
  }
  function fillHome(){fillRecent();fillFavourites();var r=recentItems(),fav=favouriteItems(),id=M.defaultSelection(state.focusDefault,r,inputList,fav,state.inputNames,state.pcPort);if(id)preview(lookup(id)||fallbackInput(id));}
  function allVisibleNav(){var items=qa((modalOpen?'#modal-actions .navitem':'#'+page+' .navitem'));
    if(!modalOpen)items=items.concat(qa('.masthead .navitem'),q('#undo-action').hidden?[]:[q('#undo-action')]);
    return items.filter(function(n){return n.offsetWidth>0&&!n.disabled;});}
  function focusByItem(id){if(!id)return null;return qa('#'+page+' .navitem').find(function(n){return n.dataset.itemid===id;})||null;}
  function focusByAction(action,zone){if(!action)return null;return qa('#'+page+' .navitem').find(function(n){return n.dataset.action===action&&(!zone||n.dataset.zone===zone);})||qa('.masthead .navitem').find(function(n){return n.dataset.action===action;})||null;}
  function focusFirst(){var node;if(page==='home'){
      var recent=recentItems(),fav=favouriteItems(),id=M.defaultSelection(state.focusDefault,recent,inputList,fav,state.inputNames,state.pcPort);
      node=state.focusDefault==='pc'&&previewItem&&previewItem.kind==='input'&&previewItem.connected?q('#preview-hit'):focusByItem(id);node=node||q('#recent-list .navitem')||q('#favourites .navitem')||q('#home .navitem');
    }else node=q('#'+page+' .navitem');if(node)setFocus(node);}
  function setFocus(node){if(!node||node.disabled||launching)return; if(selected===node)return; if(selected)selected.classList.remove('is-focused');selected=node;node.classList.add('is-focused');
    try{node.focus({preventScroll:true});}catch(e){node.focus();}
    if(node.scrollIntoView)try{node.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});}catch(e){}
    syncFocusFrame();
    if(page==='home'&&!modalOpen&&!movingId&&node.dataset.itemid){var item=lookup(node.dataset.itemid)||fallbackInput(node.dataset.itemid);if(item)preview(item);}}
  function selectSettingsGroup(id){var nested=!!settingsPanel;settingsPanel='';settingsGroup=id;if(nested){fillSettings();setFocus(q('.settings-category[data-group="'+id+'"]'));}qa('.settings-group').forEach(function(n){n.hidden=n.dataset.settingsGroup!==id;});qa('.settings-category').forEach(function(n){n.setAttribute('aria-pressed',String(n.dataset.group===id));});q('#settings-list').scrollTop=0;}
  function focusDirection(key){
    if(!modalOpen&&page==='settings'&&selected){
      if(selected.classList.contains('settings-category')){var tabs=qa('.settings-category'),i=tabs.indexOf(selected);if(key==='ArrowDown'||key==='ArrowUp'){var tab=tabs[Math.max(0,Math.min(tabs.length-1,i+(key==='ArrowDown'?1:-1)))];selectSettingsGroup(tab.dataset.group);setFocus(q('.settings-category[data-group="'+tab.dataset.group+'"]'));return;}if(key==='ArrowRight'){setFocus(q('.settings-group:not([hidden]) .navitem'));return;}}
      if(selected.closest('#settings-list')){if(key==='ArrowLeft'){setFocus(q('.settings-category[aria-pressed="true"]'));return;}if(key==='ArrowUp'||key==='ArrowDown'){var rows=qa('.settings-group:not([hidden]) .navitem').filter(function(n){return n.offsetWidth>0;}),at=rows.indexOf(selected);setFocus(rows[Math.max(0,Math.min(rows.length-1,at+(key==='ArrowDown'?1:-1)))]);return;}}
    }

    if(!modalOpen&&selected){
      var row=selected.closest('#favourites'),grid=selected.closest('#apps-grid');
      if(row&&(key==='ArrowLeft'||key==='ArrowRight')){var siblings=qa('#favourites .navitem');setFocus(siblings[w.LauncherNavigation.rowNeighbour(siblings.indexOf(selected),siblings.length,key)]);return;}
      if(grid){var cards=qa('#apps-grid .navitem'),idx=cards.indexOf(selected),dest=w.LauncherNavigation.gridNeighbour(idx,cards.length,6,key);if(key!=='ArrowUp'||idx>=6){setFocus(cards[dest]);return;}}
    }
    if(!modalOpen&&page==='home'&&selected){
      var hit=q('#preview-hit'),to=null;
      if(selected===hit){if(key==='ArrowLeft')to=q('#recent-list .navitem');if(key==='ArrowDown')to=q('#favourites .navitem');if(key==='ArrowUp')to=q('[data-action="settings"]');if(key==='ArrowRight'&&!q('#undo-action').hidden)to=q('#undo-action');if(to)setFocus(to);return;}
      if((selected.dataset.zone==='recent'&&key==='ArrowRight'||selected.dataset.zone==='favourites'&&key==='ArrowUp'||selected.dataset.action==='settings'&&key==='ArrowDown')&&!hit.disabled){setFocus(hit);return;}
    }
    if(!modalOpen&&page==='home'&&selected&&selected.closest('.home-footer')&&(key==='ArrowLeft'||key==='ArrowRight')){
      var footer=qa('.home-footer .navitem').filter(function(n){return n.offsetWidth>0&&!n.disabled;}),index=footer.indexOf(selected),next=index+(key==='ArrowRight'?1:-1);
      if(footer[next])setFocus(footer[next]);return;
    }
    var items=allVisibleNav();if(!items.length)return;if(!selected||items.indexOf(selected)<0){setFocus(items[0]);return;}
    function mid(n){var r=n.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};}
    var now=mid(selected),best=null,score=Infinity;items.forEach(function(n){if(n===selected)return;var to=mid(n),dx=to.x-now.x,dy=to.y-now.y;
      if((key==='ArrowRight'&&dx<=8)||(key==='ArrowLeft'&&dx>=-8)||(key==='ArrowDown'&&dy<=8)||(key==='ArrowUp'&&dy>=-8))return;
      var main=key==='ArrowRight'||key==='ArrowLeft'?Math.abs(dx):Math.abs(dy),cross=key==='ArrowRight'||key==='ArrowLeft'?Math.abs(dy):Math.abs(dx),s=main+cross*2.35;
      if(s<score){score=s;best=n;}});if(best)setFocus(best);}
  function settingsHomePreview(){
    var panel=q('#settings-home-preview');
    if(!panel){panel=el('aside','settings-home-preview');panel.id='settings-home-preview';panel.setAttribute('aria-hidden','true');panel.setAttribute('inert','');q('#app').appendChild(panel);}
    panel.hidden=page!=='settings';if(panel.hidden)return;var key=JSON.stringify([state.favouriteIds,state.wallpaper,state.autoDimming,state.reducedEffects,state.glow,wallpaperCurrent]);if(key===settingsPreviewKey&&panel.children.length)return;settingsPreviewKey=key;
    // Clone only our own Home. No app screenshots, duplicate IDs or interactive controls.
    fillHome();panel.textContent='';var scene=el('div','mini-home');
    scene.appendChild(q('.backdrop').cloneNode(true));scene.appendChild(q('.scrim').cloneNode(true));scene.appendChild(q('#ambient-shade').cloneNode(true));
    var app=el('div','app'),header=q('.masthead').cloneNode(true),home=q('#home').cloneNode(true);home.classList.remove('hidden');header.querySelector('#page-title').textContent='Home';header.querySelector('.brand').hidden=true;
    app.appendChild(header);app.appendChild(home);scene.appendChild(app);panel.appendChild(scene);
    Array.prototype.slice.call(scene.querySelectorAll('[id]')).forEach(function(n){n.removeAttribute('id');});
    Array.prototype.slice.call(scene.querySelectorAll('.navitem')).forEach(function(n){n.classList.remove('navitem','is-focused');n.disabled=true;n.tabIndex=-1;});
    var sampleId=M.defaultSelection(state.focusDefault,recentItems(),inputList,favouriteItems(),state.inputNames,state.pcPort),sampleNodes=Array.prototype.slice.call(scene.querySelectorAll('[data-itemid]'));
    var sampleNode=sampleNodes.find(function(n){return n.dataset.itemid===sampleId;})||scene.querySelector('.app-card');if(sampleNode)sampleNode.classList.add('preview-focused');
    var sample=previewTarget(lookup(sampleId)||favouriteItems()[0]);
    if(sample){
      var sampleArt=scene.querySelector('.preview-art');sampleArt.textContent='';sampleArt.className='preview-art';
      if(sample.kind==='input'){sampleArt.classList.add('preview-pc');sampleArt.appendChild(el('div','monitor-mock'));}
      else{sampleArt.classList.add('art-'+brandClass(sample.name));var sampleLogo=logo(sample);sampleLogo.classList.add('hero-logo');sampleArt.appendChild(sampleLogo);}
      scene.querySelector('.preview-title').textContent=itemName(sample);scene.querySelector('.preview-meta').textContent=sample.kind==='input'?sample.port:'';
    }
    Array.prototype.slice.call(scene.querySelectorAll('[data-action],[data-itemid],[data-zone]')).forEach(function(n){n.removeAttribute('data-action');n.removeAttribute('data-itemid');n.removeAttribute('data-zone');});
    Array.prototype.slice.call(scene.querySelectorAll('.is-live')).forEach(function(n){n.classList.remove('is-live');});
  }
  function showPage(next,focus){var changed=next!==page,videoState=P.videoStatus();
    var keepPreview=!changed&&next==='home'&&state.previewMode==='selected'&&videoState.owner==='preview'&&videoState.visible&&!videoState.pending&&!videoState.blocked;
    if(selected)selected.classList.remove('is-focused');selected=null;
    if(!keepPreview){previewGeneration++;clearTimeout(previewTimer);stopVideoPreview();}page=next;
    ['home','apps','inputs','edit','settings'].forEach(function(id){q('#'+id).classList.toggle('hidden',id!==next&&!(next==='inputs'&&id==='home'));});
    doc.body.dataset.page=next;if(changed)q('#focus-frame').hidden=true;
    q('#page-title').textContent=({home:'Home',apps:'All Apps',inputs:'Inputs',edit:'Edit Home',settings:'Launcher Settings'})[next]||'Home';q('#view-subtitle').textContent='';
    if(next==='settings'&&focus&&focus.action){var group=w.LauncherSettings.groupFor(focus.action);if(group)settingsGroup=group.id;}
    if(next==='home')fillHome();if(next==='apps')fillApps();if(next==='inputs')fillInputs();if(next==='edit')fillEdit();if(next==='settings')fillSettings();
    settingsHomePreview();
    qa('.view-enter').forEach(function(n){n.classList.remove('view-enter');});if(changed&&next!=='home'&&!state.reducedMotion)q('#'+next).classList.add('view-enter');
    var dest=focus&&(focus.itemId?focusByItem(focus.itemId):focus.action?focusByAction(focus.action,focus.zone):null);if(dest)setFocus(dest);else{selected=null;focusFirst();}
  }
  function refreshView(name,itemId){showPage(name||page,itemId?{itemId:itemId}:null);}
  function activate(item){
    if(!item||launching)return;
    if(item.kind==='input'&&!item.connected){toast(itemName(item)+' is not connected');return;}
    if(!P.isTV){toast('App launching and HDMI switching require a Samsung TV');return;}
    var token=++launchGeneration;launching={id:item.id,kind:item.kind,accepted:false,started:Date.now()};
    doc.body.classList.add('launch-pending');logEvent('Launch requested',item.kind);
    ++previewGeneration;clearTimeout(previewTimer);
    if(item.kind==='input'){
      P.showInputFullscreen(item.raw,function(){
        if(token!==launchGeneration)return;state.recent=M.recordRecent(state.recent,{id:item.id,name:itemName(item)},Date.now());
        save();videoMarker(false);clearLaunch();fullscreenInput=true;
      },function(message){if(token===launchGeneration)launchFailed('Cannot open HDMI: '+message);});return;
    }
    stopVideoPreview().then(function(clean){
      if(token!==launchGeneration)return;
      if(!clean){launchFailed('HDMI cleanup is unconfirmed. Disable preview or use Samsung Home.');return;}
      launchTimer=setTimeout(function(){if(token!==launchGeneration)return;launchFailed('App did not leave the launcher. Use Samsung Home or try again.');},8000);
      P.launch(item.nativeId,function(){
        if(token!==launchGeneration)return;launching.accepted=true;logEvent('Launch accepted',(Date.now()-launching.started)+' ms');
        // Acceptance is not proof that the app became visible. History is recorded
        // only on the resulting foreground handoff, not on focus or a failed call.
      },function(message){if(token===launchGeneration)launchFailed('Could not open '+itemName(item)+': '+message);});
    });
  }
  function modal(title,message,actions){
    ++previewGeneration;clearTimeout(previewTimer);stopVideoPreview();
    q('#preview').classList.remove('is-live');q('#preview-indicator').hidden=true;
    modalOpen=true;modalReturn=selected?{id:selected.dataset.itemid,action:selected.dataset.action,page:page,element:selected}:null;
    q('#modal-title').textContent=title;q('#modal-text').textContent=message||'';var area=q('#modal-actions');area.textContent='';
    actions.forEach(function(a){var b=button('','pill');b.textContent=a.label;b.onclick=function(){hideModal(true);a.fn();};area.appendChild(b);});
    q('#confirm').classList.remove('hidden');if(selected)selected.classList.remove('is-focused');selected=null;q('#focus-frame').hidden=true;setFocus(area.querySelector('.navitem'));}
  function hideModal(restore){var was=modalReturn;if(selected)selected.classList.remove('is-focused');modalOpen=false;inputMode=false;q('#confirm').classList.add('hidden');q('#modal-text').textContent='';modalReturn=null;selected=null;
    if(restore!==false&&was){if(was.page===page&&was.element&&was.element.isConnected)setFocus(was.element);else setFocus(focusByItem(was.id)||focusByAction(was.action)||q('#'+page+' .navitem'));}setTimeout(flushRefresh,0);}
  function textDialog(title,prompt,initial,onSave,max){modal(title,prompt,[{label:'Save',fn:function(){var v=M.safeText(field.value,max||180).trim();onSave(v);}},{label:'Cancel',fn:function(){}}]);
    var field=el('input','dialog-input');field.value=initial||'';field.maxLength=max||180;field.placeholder=prompt;
    q('#modal-text').appendChild(field);field.focus();selected=null;inputMode=true;
    field.addEventListener('keydown',function(e){if(e.key==='Enter'){e.stopPropagation();e.preventDefault();field.blur();inputMode=false;var save=q('#modal-actions .navitem');if(save)setFocus(save);}});
    field.addEventListener('blur',function(){inputMode=false;});
  }
  function toggleFavourite(item){if(!item)return;if(!state.favouriteIds)state.favouriteIds=[];var isPinned=(state.favouriteIds||[]).indexOf(item.id)>=0;
    var removedIndex=state.favouriteIds.indexOf(item.id);
    state.favouriteIds=isPinned?state.favouriteIds.filter(function(id){return id!==item.id;}):state.favouriteIds.concat([item.id]);save();if(isPinned)offerUndo('favourite',item,removedIndex);toast(itemName(item)+(isPinned?' removed from Home':' pinned to Home'));}
  function beginMove(item){movingId=item.id;movingOriginal=state.favouriteIds.slice();showPage('edit',{itemId:item.id});toast('Use left/right to move, OK to save, Back to cancel');}
  function moveFavourite(dir){if(!movingId)return;state.favouriteIds=M.moveItem(state.favouriteIds,movingId,dir);save();showPage('edit',{itemId:movingId});}
  function finishMove(commit){if(!movingId)return;var id=movingId;if(!commit){state.favouriteIds=movingOriginal;save();}movingId=null;movingOriginal=null;showPage('edit',{itemId:id});if(commit)toast('Home order saved');}
  function editActions(item){var pinned=(state.favouriteIds||[]).indexOf(item.id)>=0,hidden=state.hiddenAppIds.indexOf(item.id)>=0,from=page;
    var actions=[];
    if(pinned)actions.push({label:'Move',fn:function(){beginMove(item);}});
    actions.push({label:pinned?'Remove from Home':'Pin to Home',fn:function(){toggleFavourite(item);showPage(from==='home'?'home':from,{itemId:item.id});}});
    if(item.kind==='app'&&from!=='home')actions.push({label:hidden?'Unhide app':'Hide from All Apps',fn:function(){
      state.hiddenAppIds=hidden?state.hiddenAppIds.filter(function(x){return x!==item.id;}):M.unique(state.hiddenAppIds.concat([item.id]));save();if(!hidden)offerUndo('hide',item);showPage(from,{itemId:item.id});toast(hidden?'App shown':'App hidden from All Apps');}});
    if(item.kind==='input')actions.push({label:'Rename input',fn:function(){showRename(item);}});
    actions.push({label:'Cancel',fn:function(){}});
    modal(itemName(item),'Manage this shortcut without uninstalling anything.',actions);
  }
  function manageHiddenApps(){
    var listed=catalog.filter(function(a){return state.hiddenAppIds.indexOf(a.id)>=0;}),from=page;
    function restore(ids){state.hiddenAppIds=state.hiddenAppIds.filter(function(id){return ids.indexOf(id)<0;});save();showPage(from,from==='apps'?{action:'manage-hidden'}:{action:'setting-manage-hidden'});manageHiddenApps();}
    var actions=listed.map(function(item){return{label:'Restore '+itemName(item),fn:function(){restore([item.id]);}};});
    if(listed.length>1)actions.push({label:'Restore all listed',fn:function(){restore(listed.map(function(a){return a.id;}));}});
    actions.push({label:'Done',fn:function(){}});
    modal('Hidden apps',listed.length?'Restore an app to All Apps and recent activity. Home pins are preserved. Unavailable apps stay hidden until they return; system services are never listed.':'No installed apps are hidden. Hold OK on an app in All Apps to hide it. This does not uninstall apps or remove Home pins.',actions);
  }
  function pinInput(){if(!inputList.length){toast('No HDMI sources detected');return;}
    modal('Pin an input','Choose an input to add or remove from your favourites.',inputList.filter(function(i){return i.port.indexOf('HDMI')===0;}).map(function(i){return{label:((state.favouriteIds||[]).indexOf(i.id)>=0?'★ ':'＋ ')+itemName(i)+' ('+i.port+')',fn:function(){toggleFavourite(i);showPage('edit',{itemId:i.id});}};}).concat([{label:'Cancel',fn:function(){}}]));}
  function renameInput(){var list=inputList.filter(function(x){return x.port.indexOf('HDMI')===0;});
    if(!list.length){toast('No HDMI inputs detected');return;}
    modal('Rename HDMI input','Select the input you want to rename.',list.map(function(i){return{label:itemName(i)+' ('+i.port+')',fn:function(){showRename(i);}};}).concat([{label:'Cancel',fn:function(){}}]));}
  function showRename(item){textDialog('Rename '+item.port,'Device name',itemName(item),function(v){if(v){state.inputNames[item.port]=v;save();toast('Renamed '+item.port);showPage('settings',{action:'setting-rename'});}},35);}
  function searchApps(){textDialog('Search installed apps','Type an app name (leave blank to clear)',searchTerm,function(value){searchTerm=value;filter='All';editingFromApps=false;showPage('apps',{action:'search-apps'});},50);}
  function weatherLocation(){textDialog('Weather location','Enter a town or postcode',state.city,function(value){if(value.length<2){toast('Enter at least two characters');return;}fetchLocations(value);},70);}
  function fetchLocations(name){
    var token=++locationRequest;
    toast('Searching weather locations…');
    requestJSON('https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(name)+'&count=5&language=en&format=json',7000).then(function(data){
      if(token!==locationRequest||page!=='settings'||modalOpen||doc.hidden)return;
      var list=(data&&Array.isArray(data.results)?data.results:[]).filter(function(x){return x&&typeof x.name==='string'&&Number.isFinite(x.latitude)&&Math.abs(x.latitude)<=90&&Number.isFinite(x.longitude)&&Math.abs(x.longitude)<=180;}).slice(0,5);
      if(!list.length){toast('No location found. Try a town or city name.');return;}
      modal('Choose weather location','Select the matching town or postcode.',list.map(function(place){return{label:M.safeText(place.name+(place.admin1?', '+place.admin1:'')+(place.country?', '+place.country:''),140),fn:function(){
        if(weatherController)weatherController.abort();weatherInFlight=false;weatherRequest++;
        solarData=null;state.city=M.safeText(place.name,65);state.latitude=place.latitude;state.longitude=place.longitude;save();weatherTime=0;applyAppearance();showPage('settings',{action:'setting-city'});refreshWeather(true);
      }};}).concat([{label:'Cancel',fn:function(){}}]));
    }).catch(function(){if(token===locationRequest&&page==='settings'&&!modalOpen)toast('Location search failed; existing location retained');});
  }
  function customWallpaper(){textDialog('Custom wallpaper','Online image link. Offline rotation uses Curated Wikimedia. Image servers see requests from this TV.',state.customWallpaperUrl,function(value){
    if(value&&!M.safeUrl(value)){toast('Only HTTPS image URLs are supported');return;}
    state.customWallpaperUrl=M.safeUrl(value);state.wallpaper=value?'custom':'scenic';save();applyAppearance();showPage('settings',{action:'setting-custom'});
  },450);}
  function exportChoices(){return F.exportBackup(state);}
  function importChoices(text){try{clearUndo();state=F.restoreBackup(text);save();applyAppearance();showPage('settings');toast('Preferences restored; history excluded and live preview off');}catch(e){toast('Invalid preferences backup: '+e.message);}}
  function backupSettings(){modal('Back up your launcher','Files work where supported. JSON text remains available for TVs without a file chooser.',[
    {label:'Download backup',fn:function(){downloadJSON('cinematic-tv-preferences.json',exportChoices());}},
    {label:'Import file',fn:importFile},
    {label:'Show JSON text',fn:function(){textDialog('Export preferences','Copy using a connected keyboard. Keep location information private.',exportChoices(),function(){},65536);}},
    {label:'Paste JSON text',fn:function(){textDialog('Import preferences','History is excluded and live preview is disabled on restore.','',importChoices,65536);}},
    {label:'Cancel',fn:function(){}}
  ]);}
  function diagnosticInfo(){var p=P.diagnostics(),s=['Mode: '+p.mode,'Installed applications: '+catalog.length,'Detected inputs: '+inputList.length,'Catalogue: '+diagnostics.status,
    'Last check: '+(diagnostics.lastCheck?new Date(diagnostics.lastCheck).toLocaleString('en-GB'):'Never'),
    'App discovery API: '+(p.appDiscovery?'Present':'Not available'),'HDMI preview API: '+(p.hdmiPreview?'Present':'Not available'),'Video state: '+p.video.operation+' / '+p.video.owner,'Video error: '+(p.video.lastError||'None'),
    'Preview setting: '+state.previewMode,'Weather: '+weatherStatus,'Weather error: '+(weatherError||'None'),'Wallpaper: '+wallpaperStatus,'App viewport: '+w.innerWidth+'×'+w.innerHeight+' (Samsung app UI limit: 1920×1080)',
    'Native Samsung Settings: handled by TV remote, not intercepted',
    'Background return: '+JSON.stringify(returnMode.status()),
    'Last error: '+(diagnostics.error||'None')];
    modal('Diagnostics',s.join('  •  '),[{label:'Close',fn:function(){}}]);}
  function returnStatusLabel(){var s=returnMode.status();return s.enabled?(s.paused?'Paused':'On'):'Off';}
  function settingAction(name){var focus={action:name};
    if(name==='setting-dimming'){state.autoDimming=!state.autoDimming;save();applyAppearance();showPage('settings',focus);refreshWeather();return;}
    if(name==='setting-manage-hidden'){manageHiddenApps();return;}
    if(name==='setting-startup'){
      var status=returnMode.status();
      var label=returnStatusLabel(),row=q('[data-action="setting-startup"] .setting-value');if(row)row.textContent='Return: '+label;
      var message=status.enabled?(status.paused?'Samsung Home will stay open until you manually reopen Cinematic TV.':'Cinematic TV reopens after you leave an app and Samsung Home appears. You may see Samsung Home briefly.'):'Samsung Home stays open after you leave other apps. Turn automatic return on to reopen Cinematic TV instead.';
      message+=' This experimental mode does not enable cold-boot startup. Opening Samsung Home below pauses return until you manually reopen Cinematic TV.';
      if(status.error)message+=' '+status.error;
      modal('Automatic return and exit',message,[
        {label:status.enabled?'Turn automatic return off':'Turn automatic return on',fn:function(){configureReturn(!status.enabled).then(function(on){toast(on?'Automatic return is now on':status.enabled?'Automatic return is now off':'Could not turn on automatic return. Check Diagnostics.');settingAction('setting-startup');});}},
        {label:'Open Samsung Home (pause return)',fn:openSamsungHome},
        {label:'Exit Cinematic TV',fn:function(){++returnSetup;returnMode.pause();stopVideoPreview().then(function(){P.exit();});}},
        {label:'Close',fn:function(){}}
      ]);
      var current=el('strong','return-status','Automatic return: '+label);current.id='return-status';current.setAttribute('role','status');q('#modal-text').insertBefore(current,q('#modal-text').firstChild);return;
    }
    if(name==='setting-wallpaper'){settingsGroup='appearance';settingsPanel='wallpaper';fillSettings();setFocus(q('.settings-group:not([hidden]) .navitem'));return;}
    if(name==='setting-wallpaper-credits'&&state.wallpaper==='curated'){var record=curatedRecord;modal('Wallpaper credits',record?record.title+' • '+record.author+' • '+record.license+' • '+record.source:'Wikimedia Commons curated photographs. Individual credits appear when an image is ready.',[{label:'Close',fn:function(){}}]);return;}
    if(name==='setting-wallpaper-credits'){
      modal('Daily photograph',dailyRecord?dailyRecord.title+'  •  '+dailyRecord.credit+'  •  '+dailyRecord.source+(dailyRecord.cached?'  •  Cached locally':''):'Choose Daily photograph under Wallpaper to load a Wikimedia Commons picture of the day. One image is cached locally; bundled scenery remains available offline.',[{label:'Close',fn:function(){}}]);
      if(dailyRecord){var sourceLink=el('a','navitem pill','View image source');sourceLink.href=dailyRecord.source;sourceLink.target='_blank';sourceLink.rel='noopener noreferrer';q('#modal-actions').appendChild(sourceLink);}return;
    }
    if(name==='setting-weather-refresh'){weatherTime=0;refreshWeather(true);toast('Refreshing weather…');return;}
    if(name==='setting-setup'){maybeSetup(true);return;}
    if(name==='setting-profiles'){profilesMenu();return;}
    if(name==='setting-inputs'){inputReturn='settings';showPage('inputs');return;}
    if(name==='setting-pc'){choosePC();return;}
    if(name==='setting-icons'){inputIconMenu();return;}
    if(name==='setting-resets'){granularReset();return;}
    if(name==='setting-log-export'){diagnosticsExport();return;}
    if(name==='setting-about'){modal('Cinematic TV '+VERSION,'Installation candidate. Browser/mock validation is not TV certification. No updater, telemetry or Home interception.',[
      {label:'Check public releases',fn:checkUpdates},{label:'Diagnostics',fn:diagnosticInfo},{label:'Close',fn:function(){}}
    ]);return;}
    if(name==='setting-video-reset'){P.resetVideo().then(function(ok){if(ok)videoMarker(false);toast(ok?'HDMI controller recovered; preview remains off':'Native operation still pending. Use Samsung Sources to recover.');});return;}
    if(name==='setting-preview-policy'){
      if(state.autoPreviewCurrentOnly){modal('Allow preview to change source?','Highlighting a different HDMI tile may then alter video or audio. Current-source-only is safer.',[
        {label:'Allow temporary switch',fn:function(){state.autoPreviewCurrentOnly=false;save();showPage('settings',focus);}},{label:'Keep current source only',fn:function(){}}
      ]);return;}state.autoPreviewCurrentOnly=true;save();showPage('settings',focus);return;
    }
    if(name==='setting-quick'){state.quickSwitch=!state.quickSwitch;save();applyAppearance();showPage('settings',focus);return;}
    if(name==='setting-network'){state.showNetwork=!state.showNetwork;save();applyAppearance();showPage('settings',focus);return;}
    if(name==='setting-effects'){state.reducedEffects=!state.reducedEffects;save();applyAppearance();showPage('settings',focus);return;}
    if(name==='setting-adaptive'){state.adaptiveWeather=!state.adaptiveWeather;save();applyAppearance();showPage('settings',focus);return;}

    if(name==='setting-focus'){var modes=['recent','pc','favourite'];state.focusDefault=modes[(modes.indexOf(state.focusDefault)+1)%modes.length];}
    else if(name==='setting-preview'){
      if(state.previewMode==='off'){
        modal('Enable PC preview','This may play HDMI audio. Current-source-only remains enabled unless you explicitly allow source switching.',[
          {label:'Enable',fn:function(){state.previewMode='selected';save();showPage('settings',{action:name});}},
          {label:'Keep off',fn:function(){}}
        ]);return;
      }state.previewMode='off';stopVideoPreview();}
    else if(name==='setting-recent')state.recentCount=state.recentCount>=6?2:state.recentCount+1;
    else if(name==='setting-weather'){state.showWeather=!state.showWeather;if(!state.showWeather){weatherRequest++;if(weatherController)weatherController.abort();weatherController=null;weatherInFlight=false;}}
    else if(name==='setting-clock')state.showClock=!state.showClock;
    else if(name==='setting-city'){weatherLocation();return;}
    else if(name==='setting-unit'){state.tempUnit=state.tempUnit==='celsius'?'fahrenheit':'celsius';weatherTime=0;weatherInFlight=false;weatherRequest++;}
    else if(name==='setting-wallpaper'){var walls=['scenic','daily','twilight','dawn','dark','auto'];var idx=walls.indexOf(state.wallpaper);state.wallpaper=walls[(idx+1)%walls.length];}
    else if(name==='setting-custom'){customWallpaper();return;}
    else if(name==='setting-glow')state.glow=state.glow==='blue'?'white':'blue';
    else if(name==='setting-motion')state.reducedMotion=!state.reducedMotion;
    else if(name==='setting-hold'){var options=[190,250,350];state.longPressMs=options[(options.indexOf(state.longPressMs)+1)%options.length];}
    else if(name==='setting-disconnected')state.hideDisconnected=!state.hideDisconnected;
    else if(name==='setting-rename'){renameInput();return;}
    else if(name==='setting-hidden')state.showHidden=!state.showHidden;
    else if(name==='setting-search'){searchApps();return;}
    else if(name==='setting-refresh'){refreshData(true);return;}
    else if(name==='setting-diagnostics'){diagnosticInfo();return;}
    else if(name==='setting-backup'){backupSettings();return;}
    else if(name==='setting-reset'){
      modal('Reset Cinematic TV?','This clears local configuration, favourite order, hidden apps and recent history. Samsung settings remain untouched.',[
        {label:'Reset',fn:function(){configureReturn(false);clearUndo();state=M.defaults();save();applyAppearance();refreshData(true);}},
        {label:'Cancel',fn:function(){}}
      ]);return;
    }else return;
    save();applyAppearance();showPage('settings',focus);refreshWeather(name==='setting-weather'||name==='setting-unit');
  }
  function doAction(action){if(launching)return;
    if(action&&action.indexOf('wallpaper-')===0){
      if(action==='wallpaper-back'){settingsPanel='';fillSettings();setFocus(q('[data-action="setting-wallpaper"]'));return;}
      if(action==='wallpaper-next'||action==='wallpaper-previous'){if(wallpaperManager)(action==='wallpaper-next'?wallpaperManager.next():wallpaperManager.previous());return;}
      if(action==='wallpaper-clear'){modal('Clear downloaded wallpapers?','Bundled pictures and preferences stay available.',[{label:'Clear downloads',fn:function(){if(wallpaperCache)wallpaperCache.clearDownloaded().then(function(){try{localStorage.removeItem('cinematic-tv-wallpaper-boot');}catch(e){}if(wallpaperManager)wallpaperManager.dispose();wallpaperManager=null;wallpaperBooting=false;startCurated();});}},{label:'Cancel',fn:function(){}}]);return;}
      if(action==='wallpaper-cache'){toast('Up to six downloaded images and 24 MiB; bundled images are separate');return;}
      if(action==='wallpaper-source'){var modes=['curated','scenic','twilight','dawn','dark','auto','custom'];state.wallpaper=modes[(modes.indexOf(state.wallpaper)+1)%modes.length];if(state.wallpaper==='custom'&&!state.customWallpaperUrl){customWallpaper();return;}}
      if(action==='wallpaper-rotation')state.wallpaperRotation=!state.wallpaperRotation;
      if(action==='wallpaper-topic'){var topic=selected.dataset.topic,index=state.wallpaperTopics.indexOf(topic);if(index>=0&&state.wallpaperTopics.length===1){toast('Keep at least one theme');return;}if(index>=0)state.wallpaperTopics.splice(index,1);else state.wallpaperTopics.push(topic);}
      save();applyAppearance();fillSettings();var target=action==='wallpaper-topic'?q('[data-action="wallpaper-topic"][data-topic="'+topic+'"]'):q('[data-action="'+action+'"]');setFocus(target);return;
    }
    if(action==='settings-group'){var tab=selected&&selected.dataset.group?selected:doc.activeElement;selectSettingsGroup(tab.dataset.group);return;}
firstDataRender=false;if(action==='undo'){performUndo();return;}if(action==='open-preview'){if(previewItem&&previewItem.kind==='input')activate(previewItem);return;}if(action==='manage-hidden'){manageHiddenApps();return;}if(action==='quick-switch'){quickSwitch();return;}if(action==='apps'){libraryReturn=captureFocus();editingFromApps=false;showPage('apps');}
    else if(action==='inputs'){inputReturn='home';showPage('inputs');}else if(action==='edit')showPage('edit');
    else if(action==='editadd'){editingFromApps=true;showPage('apps');toast('Select an app to pin or unpin it');}
    else if(action==='editinput')pinInput();else if(action==='search-apps')searchApps();
    else if(action==='settings')showPage('settings');else if(action&&action.indexOf('setting-')===0)settingAction(action);
  }
  function setCatalogue(list){catalog=list;appById={};catalog.forEach(function(a){appById[a.id]=a;});}
  function setInputs(list){var signature=function(items){return JSON.stringify(items.map(function(i){return[i.id,i.connected];}));};if(signature(list)!==signature(inputList))previewValidated=false;inputList=list;inputById={};list.forEach(function(i){inputById[i.id]=i;});}
  function refreshData(report){var gen=++refreshGeneration;diagnostics.status='Checking';diagnostics.lastCheck=Date.now();
    P.getApps(function(raw){if(gen!==refreshGeneration)return;var currentId=P.currentId(),previousAppIds=catalog.map(function(x){return x.id;});setCatalogue(M.catalogue(raw,currentId));
      if(Array.isArray(state.favouriteIds))state.favouriteIds=M.remapCatalogueIds(state.favouriteIds,raw,catalog);
      state.hiddenAppIds=M.remapCatalogueIds(state.hiddenAppIds,raw,catalog);state.profiles.forEach(function(p){p.favouriteIds=M.remapCatalogueIds(p.favouriteIds,raw,catalog);});
      var recentSeen=Object.create(null);
      state.recent=state.recent.map(function(x){var id=M.remapCatalogueIds([x.id],raw,catalog)[0];return{id:id,name:x.name,at:x.at};}).filter(function(x){if(recentSeen[x.id])return false;recentSeen[x.id]=true;return true;});
      save();
      try{localStorage.setItem(APP_CACHE,JSON.stringify(catalog.slice(0,350).map(function(a){return{id:a.nativeId,name:a.rawName||a.name,iconPath:a.icon,show:true};})));}catch(e){}
      diagnostics.status='Checked successfully';diagnostics.error='';
      if(hasCatalogue){var added=catalog.filter(function(x){return previousAppIds.indexOf(x.id)<0;}).length;if(added)toast(added+' new app'+(added===1?'':'s')+' available in All Apps');}hasCatalogue=true;
      if(storageGet('cinematic-tv-streaming-preset')!=='1'&&catalog.length&&(!state.favouriteIds||state.favouriteIds.length===8&&state.favouriteIds.some(function(id){var a=lookup(id);return a&&a.name==='Hue Sync';}))){try{localStorage.setItem('cinematic-tv-pins-before-streaming',JSON.stringify(state.favouriteIds));localStorage.setItem('cinematic-tv-streaming-preset','1');state.favouriteIds=M.streamingPreset(catalog);save();}catch(e){}}
      else if(state.favouriteIds===null){state.favouriteIds=M.streamingPreset(catalog);save();}
      refreshInputs(gen,report);
    },function(err){if(gen!==refreshGeneration)return;diagnostics.status='Could not check apps';diagnostics.error=err;
      // Retain previously cached favourites so a transient API failure does not erase Home.
      refreshInputs(gen,report);toast('App discovery failed; displaying cached information');
    });}
  function refreshInputs(gen,report){P.listInputs(function(info){if(gen!==refreshGeneration)return;setInputs(M.sources(info));if(state.uiRevision!==1){if(!state.pcPort){var pc=inputList.find(function(i){return i.port==='HDMI 1';});if(pc)state.pcPort=pc.port;}state.uiRevision=1;save();}
      if(!P.isTV&&!state.recent.length){var pc=inputList.find(function(i){return i.connected;});if(pc)state.recent=M.recordRecent(state.recent,{id:pc.id,name:itemName(pc)},Date.now());
        ['YouTube','Apple TV','Netflix'].forEach(function(name,i){var app=matchApp(name);if(app)state.recent.push({id:app.id,name:app.name,at:Date.now()-(i+1)*3600000});});}
      refreshVisible();if(report)toast('App catalogue and inputs refreshed');
    },function(err){if(gen!==refreshGeneration)return;diagnostics.status='Could not check HDMI inputs';diagnostics.error='HDMI: '+err;refreshVisible();if(report)toast('App catalogue updated; HDMI check failed');});}
  function initialCache(){var items;try{items=JSON.parse(storageGet(APP_CACHE)||'null');}catch(e){}
    if(Array.isArray(items))setCatalogue(M.catalogue(items,P.currentId()));if(state.favouriteIds===null&&catalog.length){state.favouriteIds=M.initialFavourites(catalog,state.favouriteOrderNames);save();}}
  function onClick(e){var target=e.target.closest('button');if(!target||modalOpen)return;if(target.dataset.action)doAction(target.dataset.action);}
  function longAction(){if(!selected||modalOpen||movingId)return false;var item=lookup(selected.dataset.itemid)||fallbackInput(selected.dataset.itemid);if(item&&(page==='home'||page==='apps'||page==='edit'||page==='inputs')){editActions(item);return true;}return false;}
  function pressShort(){if(!selected)return;if(movingId){finishMove(true);return;}if(selected.isConnected)selected.click();}
  function onKeyDown(e){
    if(q('#recovery-banner'))return;
    firstDataRender=false;if(wallpaperManager)wallpaperManager.inputActivity();
    var key=e.key;if(!key||key==='Unidentified')key=({37:'ArrowLeft',38:'ArrowUp',39:'ArrowRight',40:'ArrowDown',13:'Enter'})[e.keyCode]||key;var back=key==='Escape'||key==='Backspace'||key==='BrowserBack'||key==='Back'||e.keyCode===10009;
    if(launching){if(back){e.preventDefault();cancelLaunch();}else if(key==='Enter'||/^Arrow/.test(key)){e.preventDefault();}return;}
    if(inputMode){if(back&&key!=='Backspace'){e.preventDefault();hideModal(true);}return;}
    if(fullscreenInput){if(back){e.preventDefault();fullscreenInput=false;P.leaveFullscreen();showPage('home');}return;}
    if(movingId){if(back){e.preventDefault();finishMove(false);return;}
      if(key==='ArrowLeft'||key==='ArrowRight'){e.preventDefault();moveFavourite(key==='ArrowLeft'?-1:1);return;}}
    if(/^Arrow(Up|Down|Left|Right)$/.test(key)){e.preventDefault();clearTimeout(enterTimer);enterDown=false;enterLong=false;focusDirection(key);return;}
    if(key==='Enter'||e.keyCode===13){e.preventDefault();if(e.repeat||enterDown)return;enterDown=true;enterLong=false;
      enterTimer=setTimeout(function(){if(enterDown&&!modalOpen){enterLong=longAction();}},state.longPressMs);return;}
    if(back){e.preventDefault();clearTimeout(enterTimer);enterDown=false;
      if(modalOpen){hideModal(true);return;}
      if(page==='settings'&&settingsPanel){settingsPanel='';fillSettings();setFocus(q('[data-action="setting-wallpaper"]'));return;}
      if(page==='inputs'&&inputReturn==='settings'){showPage('settings',{action:'setting-inputs'});return;}
      if(page!=='home'){var restore=page==='apps'?libraryReturn:null;editingFromApps=false;showPage('home',restore);return;}
      // Standard Samsung app Back behaviour: exit only from the home screen.
      ++returnSetup;returnMode.pause();stopVideoPreview().then(function(){P.exit();});}
  }
  function onKeyUp(e){if(q('#recovery-banner'))return;if(e.key==='Enter'||e.keyCode===13){e.preventDefault();clearTimeout(enterTimer);if(enterDown&&!enterLong)pressShort();enterDown=false;enterLong=false;}}
  function init(){
    if(storageGet('cinematic-tv-wallpaper-manager')!=='1'){if(state.wallpaper==='scenic'||state.wallpaper==='daily')state.wallpaper='curated';try{localStorage.setItem('cinematic-tv-wallpaper-manager','1');}catch(e){}save();}
    if(state.wallpaper==='curated'){try{var boot=JSON.parse(storageGet('cinematic-tv-wallpaper-boot')||'null');if(boot&&typeof boot.uri==='string'&&boot.uri.length<100000&&/^data:image\/jpeg;base64,[a-zA-Z0-9+/=]+$/.test(boot.uri)){wallpaperCurrent=boot.uri;q('.backdrop').style.backgroundImage='url('+JSON.stringify(boot.uri)+')';}}catch(e){}}

    var migratePC=state.uiRevision!==1;if(migratePC&&state.focusDefault==='recent'){state.focusDefault='pc';save();}
    if(storageGet('cinematic-tv-video-pending')==='1'){state.previewMode='off';save();videoMarker(false);logEvent('Recovery','Interrupted HDMI preview disabled');}
    if(w.LauncherRecovery&&w.LauncherRecovery.safe){state.previewMode='off';state.wallpaper='scenic';state.customWallpaperUrl='';state.showWeather=false;state.reducedEffects=true;save();}
    if(isDemo())q('#test-ribbon').classList.remove('hidden');applyAppearance();updateClock();refreshWeather();
    setInterval(function(){if(!doc.hidden){if(wallpaperManager&&state.wallpaper==='curated')wallpaperManager.tick();updateClock();updateDimming();if(state.wallpaper==='auto'||state.wallpaper==='daily')applyAppearance();}},30000);setInterval(function(){refreshWeather();},5*60*1000);
    doc.addEventListener('click',onClick);doc.addEventListener('keydown',onKeyDown);doc.addEventListener('keyup',onKeyUp);
    doc.addEventListener('scroll',function(){syncFocusFrame();},true);
    doc.addEventListener('focusin',function(e){if(e.target.classList&&e.target.classList.contains('navitem')&&e.target!==selected)setFocus(e.target);});
    qa('.filter[data-filter]').forEach(function(b){b.addEventListener('click',function(){filter=b.dataset.filter;fillApps();setFocus(b);});});
    doc.addEventListener('visibilitychange',function(){if(wallpaperManager)wallpaperManager.setVisible(!doc.hidden&&state.wallpaper==='curated');if(doc.hidden){
      previewGeneration++;clearTimeout(previewTimer);
      if(launching&&launching.kind==='app'&&launching.accepted){logEvent('Launch handoff',(Date.now()-launching.started)+' ms');var item=lookup(launching.id);if(item){state.recent=M.recordRecent(state.recent,{id:item.id,name:itemName(item)},Date.now());save();}}
      ++launchGeneration;clearLaunch();returnCleanup=P.leaveFullscreen().then(function(left){return stopVideoPreview().then(function(stopped){
        var video=P.videoStatus();return left&&stopped&&video.owner==='none'&&!video.pending&&!video.blocked;
      });});fullscreenInput=false;
      clearTimeout(enterTimer);enterDown=false;enterLong=false;weatherRequest++;if(weatherController)weatherController.abort();weatherInFlight=false;
    }else{returnMode.resume();startReturnWorker();updateClock();refreshWeather();if(Date.now()-refreshThrottle>3500){refreshThrottle=Date.now();refreshData(false);}else refreshVisible();}});
    unwatchInputs=P.watchInputs(function(){previewValidated=false;previewingId=null;
      if(launching||fullscreenInput||P.videoStatus().owner!=='none'||P.videoStatus().pending){refreshDeferred=true;return;}
      clearTimeout(watchTimer);watchTimer=setTimeout(function(){refreshData(false);},120);
    });
    if(P.watchApps)unwatchApps=P.watchApps(function(){clearTimeout(watchTimer);watchTimer=setTimeout(function(){refreshData(false);},180);});
    w.addEventListener('resize',function(){if(w.innerWidth===viewportWidth&&w.innerHeight===viewportHeight)return;viewportWidth=w.innerWidth;viewportHeight=w.innerHeight;previewingId=null;if(page==='home'&&!modalOpen&&!fullscreenInput&&!launching)showPage('home',captureFocus());});
    w.addEventListener('online',function(){updateNetwork();refreshWeather(true);});w.addEventListener('offline',updateNetwork);
    w.addEventListener('blur',function(){clearTimeout(enterTimer);enterDown=false;enterLong=false;});
    w.addEventListener('pagehide',function(){if(wallpaperManager)wallpaperManager.dispose();++returnSetup;returnMode.disable();if(unwatchInputs)unwatchInputs();if(unwatchApps)unwatchApps();P.leaveFullscreen().then(stopVideoPreview);});
    initialCache();refreshData(false);showPage('home');maybeSetup();
    if(w.LauncherRecovery&&w.LauncherRecovery.safe)setReturnPreference(false);
    else if(storageGet('cinematic-tv-return-enabled')==='1')configureReturn(true);
    if(w.LauncherRecovery)w.LauncherRecovery.ready();
  }
  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init);else init();
})(window,document);
