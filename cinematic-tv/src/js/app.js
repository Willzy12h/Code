/* Cinematic TV v0.3 — remote-first Samsung TV launcher. */
(function(w,doc){
  'use strict';
  var M=w.LauncherModel,P=w.LauncherPlatform;
  var STORAGE='cinematic-tv-v1', APP_CACHE='cinematic-tv-apps-v2', WEATHER_CACHE='cinematic-tv-weather-v1';
  function storageGet(key){try{return localStorage.getItem(key);}catch(e){return null;}}
  var state=M.load(storageGet(STORAGE)),page='home',filter='All',searchTerm='',selected=null,modalOpen=false,modalReturn=null;
  var catalog=[],inputList=[],appById={},inputById={},hiddenBack=false,editingFromApps=false,fullscreenInput=false;
  var toastTimer,previewTimer,previewGeneration=0,refreshGeneration=0,refreshThrottle=0,enterDown=false,enterLong=false,enterTimer=null;
  var inputMode=false,movingId=null,movingOriginal=null,diagnostics={status:'Not checked',error:'',lastCheck:0};
  var weatherTime=0,weatherInFlight=false,weatherRequest=0,iconLoads={};
  var q=function(s){return doc.querySelector(s);};
  var qa=function(s){return Array.prototype.slice.call(doc.querySelectorAll(s));};
  function el(tag,cls,text){var e=doc.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
  function save(){try{localStorage.setItem(STORAGE,JSON.stringify(state));}catch(e){toast('Settings could not be saved');}}
  function toast(message){var t=q('#toast');t.textContent=message;t.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(function(){t.classList.remove('visible');},2300);}
  function isDemo(){return !P.isTV;}
  function lookup(id){return appById[id]||inputById[id]||null;}
  function itemName(item){return item?(item.kind==='input'?(state.inputNames[item.port]||item.name||item.port):item.name):'';}
  function matchApp(name){return catalog.find(function(a){return a.name===name;});}
  function brandClass(name){name=(name||'').toLowerCase();var match=[['youtube','youtube'],['crunchyroll','crunchyroll'],['apple','apple-tv'],['netflix','netflix'],['paramount','paramount'],['disney','disney'],['prime','prime'],['hue','hue'],['spotify','spotify'],['plex','plex'],['iplayer','iplayer'],['twitch','twitch'],['itvx','itvx']];for(var i=0;i<match.length;i++)if(name.indexOf(match[i][0])>=0)return match[i][1];return'neutral';}
  function brandText(name){var words={'YouTube':'▶','Crunchyroll':'◕','Apple TV':'●tv','Netflix':'N','Paramount+':'◈','Disney+':'Disney+','Prime Video':'prime video','Hue Sync':'hue','Plex':'PLEX','Spotify':'● Spotify','BBC iPlayer':'BBC','ITVX':'itvx','5':'5','Channel 4':'4','Twitch':'Twitch','Samsung Health':'♥','SmartThings':'✧'};return words[name]||String(name||'App').slice(0,17);}
  function logo(item){var name=itemName(item),l=el('div','logo '+brandClass(name));var word=el('span','logotext',item.kind==='input'?'▣':brandText(name));l.appendChild(word);
    if(item.kind==='app'&&item.icon&&P.isTV){var img=el('img','native-icon');img.alt='';img.onload=function(){word.style.display='none';};img.onerror=function(){img.remove();word.style.display='';};
      if(iconLoads[item.icon])img.src=iconLoads[item.icon];else P.resolveIcon(item.icon,function(url){iconLoads[item.icon]=url;img.src=url;});l.appendChild(img);}
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
    q('#favourites-count').textContent=(state.favouriteIds||[]).length>8?'Use ← → for more':'';
    if(!area.children.length){var b=button('apps','pill');b.textContent='Add favourite apps';area.appendChild(b);}}
  function fillApps(){var area=q('#apps-grid');area.textContent='';var query=searchTerm.toLowerCase();catalog.filter(function(item){return(state.showHidden||state.hiddenAppIds.indexOf(item.id)<0)&&(filter==='All'||M.detectCategory(item.name)===filter)&&(!query||item.name.toLowerCase().indexOf(query)>=0);}).forEach(function(item){var card=appCard(item,'apps');if(state.favouriteIds&&state.favouriteIds.indexOf(item.id)>=0)card.title='Pinned to Home';area.appendChild(card);});
    qa('.filter').forEach(function(b){b.classList.toggle('active',b.dataset.filter===filter);});q('#search-status').textContent=searchTerm?'Search: '+searchTerm:'';
    if(!area.children.length)area.appendChild(el('div','empty-placeholder','No matching apps. Clear the search, enable hidden apps or refresh the catalogue.'));}
  function fillInputs(){var area=q('#input-grid');area.textContent='';inputList.forEach(function(item){var b=button('','input-card',item);b.dataset.zone='inputs';b.appendChild(el('span','input-icon','▣'));var body=el('div');body.appendChild(el('div','input-name',itemName(item)));body.appendChild(el('div','input-port',item.port));body.appendChild(el('div',item.connected?'connected':'disconnected',item.connected?'● Connected':'○ Not connected'));if(state.favouriteIds.indexOf(item.id)>=0)body.appendChild(el('div','pinned-indicator','★ Pinned to Home'));b.appendChild(body);b.onclick=function(){activate(item);};area.appendChild(b);});
    if(!area.children.length)area.appendChild(el('div','empty-placeholder','No HDMI inputs have been reported by the television.'));}
  function fillEdit(){var area=q('#edit-grid');area.textContent='';favouriteItems().forEach(function(item){var b=button('','edit-action',item);b.dataset.zone='edit';if(item.id===movingId)b.classList.add('moving');b.appendChild(logo(item));var copy=el('div');copy.appendChild(el('div','',itemName(item)));copy.appendChild(el('div','meta',movingId===item.id?'← → Move · OK Save':'Hold OK / select to edit'));b.appendChild(copy);b.onclick=function(){if(movingId){finishMove(true);return;}editActions(item);};area.appendChild(b);});
    if(!movingId){var add=button('editadd','edit-action');add.appendChild(el('strong','','＋'));add.appendChild(el('span','','Add app'));area.appendChild(add);var pin=button('editinput','edit-action');pin.appendChild(el('strong','','▣'));pin.appendChild(el('span','','Pin HDMI'));area.appendChild(pin);}}
  function setting(label,description,value,action){var b=button(action,'setting-row');b.dataset.zone='settings';var wrap=el('div');wrap.appendChild(el('div','',label));wrap.appendChild(el('div','desc',description));b.appendChild(wrap);b.appendChild(el('span','setting-value',String(value)));return b;}
  function fillSettings(){var area=q('#settings-list');area.textContent='';
    var rows=[
      ['Layout','Cinematic, Balanced or Compact',{cinematic:'Cinematic',balanced:'Balanced',compact:'Compact'}[state.layout],'setting-layout'],
      ['Default Home selection','Last used, PC or first favourite',{recent:'Last used',pc:'PC',favourite:'Favourite'}[state.focusDefault],'setting-focus'],
      ['Live HDMI preview','Hardware TVWindow; opt-in until tested on S95H',state.previewMode==='off'?'Off':'When selected','setting-preview'],
      ['Recent items','How many apps and inputs to show',state.recentCount,'setting-recent'],
      ['Weather','Current conditions from Open-Meteo',state.showWeather?'On':'Off','setting-weather'],
      ['Clock','Show the time on the Home header',state.showClock?'On':'Off','setting-clock'],
      ['Weather location','Choose town or postcode (no GPS)',state.city,'setting-city'],
      ['Temperature','Celsius or Fahrenheit',state.tempUnit==='celsius'?'°C':'°F','setting-unit'],
      ['Wallpaper','Offline wallpapers or optional custom URL',state.wallpaper==='scenic'?'Scenic':state.wallpaper==='twilight'?'Twilight':state.wallpaper==='dawn'?'Dawn':state.wallpaper==='custom'?'Custom':'Dark','setting-wallpaper'],
      ['Custom wallpaper URL','HTTPS image; optional, online',state.customWallpaperUrl?'Configured':'Not set','setting-custom'],
      ['Selection glow','Blue or white focus outline',state.glow==='blue'?'Blue':'White','setting-glow'],
      ['Reduce motion','Minimal animation transitions',state.reducedMotion?'On':'Off','setting-motion'],
      ['Long-press OK','Edit shortcut rather than launch',state.longPressMs+' ms','setting-hold'],
      ['Disconnected inputs','Hide from recent activity only',state.hideDisconnected?'Hidden':'Shown','setting-disconnected'],
      ['Rename HDMI','Rename any input, even disconnected','Edit','setting-rename'],
      ['Hidden apps','Show hidden apps in All Apps',state.showHidden?'Shown':'Hidden','setting-hidden'],
      ['Manage favourites','Add, remove and reposition apps and inputs','Edit','edit'],
      ['Search installed apps','Find an app by name','Search','setting-search'],
      ['Refresh catalogue','Recheck applications and input state','Refresh','setting-refresh'],
      ['Diagnostic information','API access, catalogue status, hardware checks','View','setting-diagnostics'],
      ['Backup preferences','Export or restore local launcher choices','Manage','setting-backup'],
      ['Reset launcher','Clear configuration and recent activity','Reset','setting-reset']
    ];rows.forEach(function(r){area.appendChild(setting.apply(null,r));});
  }
  function applyAppearance(){doc.body.classList.toggle('reduced-motion',!!state.reducedMotion);doc.body.classList.toggle('white-glow',state.glow==='white');
    doc.body.dataset.layout=state.layout;q('#clock').style.display=state.showClock?'block':'none';q('#weather').style.display=state.showWeather?'flex':'none';
    var wall=q('.backdrop'),images={scenic:'assets/wallpaper.jpg',twilight:'assets/wallpaper-twilight.jpg',dawn:'assets/wallpaper-dawn.jpg'};
    if(state.wallpaper==='dark'){wall.style.display='none';}
    else{wall.style.display='';var uri=state.wallpaper==='custom'?M.safeUrl(state.customWallpaperUrl):images[state.wallpaper]||images.scenic;
      wall.style.backgroundImage='url("'+uri.replace(/["\\]/g,'')+'")';}
  }
  function updateClock(){q('#clock').textContent=new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});}
  function weatherGlyph(code){return code===0?'☀':code<=3?'☁':code>=51&&code<=67?'☂':code>=71&&code<=86?'❄':code>=95?'☈':'☁';}
  function formatWeather(data,stale){if(!data||!data.current||!Number.isFinite(data.current.temperature_2m))return false;
    var value=Math.round(data.current.temperature_2m);q('.weather-symbol').textContent=weatherGlyph(data.current.weather_code||0);
    q('#weather-info').textContent=value+(state.tempUnit==='fahrenheit'?'°F':'°C')+'  '+state.city+(stale?' · cached':'');return true;}
  function refreshWeather(force){if(!state.showWeather||weatherInFlight)return;
    var location=state.latitude+','+state.longitude+','+state.tempUnit,now=Date.now(),cached;
    try{cached=JSON.parse(storageGet(WEATHER_CACHE)||'null');}catch(e){}
    if(cached&&cached.location===location&&formatWeather(cached.data,true)){
      if(!force&&now-cached.at<30*60*1000){formatWeather(cached.data,false);return;}}
    if(!force&&now-weatherTime<12*60*1000)return;
    weatherTime=now;weatherInFlight=true;var gen=++weatherRequest;
    var url='https://api.open-meteo.com/v1/forecast?latitude='+encodeURIComponent(state.latitude)+'&longitude='+encodeURIComponent(state.longitude)+'&current=temperature_2m,weather_code&temperature_unit='+state.tempUnit+'&timezone=auto';
    var controller=typeof AbortController==='function'?new AbortController():null;
    var timer=setTimeout(function(){if(controller)controller.abort();},6500);
    fetch(url,controller?{signal:controller.signal}:{}).then(function(r){if(!r.ok)throw Error('Weather unavailable');return r.json();}).then(function(data){
      if(gen!==weatherRequest||!data||!data.current||!Number.isFinite(data.current.temperature_2m))return;
      formatWeather(data,false);try{localStorage.setItem(WEATHER_CACHE,JSON.stringify({location:location,at:Date.now(),data:data}));}catch(e){}
    }).catch(function(){if(gen===weatherRequest&&!(cached&&cached.location===location&&formatWeather(cached.data,true)))q('#weather-info').textContent='Weather unavailable';})
      .then(function(){clearTimeout(timer);weatherInFlight=false;});
  }
  function preview(item){if(!item||page!=='home'||fullscreenInput)return;
    var gen=++previewGeneration;clearTimeout(previewTimer);P.stopPreview();var area=q('#preview'),art=q('#preview-art');area.classList.remove('is-live');art.textContent='';art.className='preview-art';
    q('#preview-title').textContent=itemName(item);q('#preview-meta').textContent=item.kind==='input'?item.port+' · '+(item.connected?'Connected':'Not connected'):'Last used '+timeLabel(item.id)+' · OK to open';q('#preview-indicator').hidden=true;
    if(item.kind==='input'){
      art.classList.add('preview-pc');art.appendChild(el('div','monitor-mock'));
      var caption=el('span','art-caption',state.previewMode==='selected'?'Live preview requested':'Static preview · enable live HDMI in Settings');art.appendChild(caption);
      if(!item.connected){caption.textContent='HDMI is disconnected';return;}
      if(state.previewMode==='off'||!P.isTV)return;
      previewTimer=setTimeout(function(){if(gen!==previewGeneration||page!=='home'||doc.hidden)return;
        var r=q('#preview-media').getBoundingClientRect(),rect=[Math.round(r.left)+'px',Math.round(r.top)+'px',Math.round(r.width)+'px',Math.round(r.height)+'px'];
        P.preview(item.raw,rect,function(){if(gen!==previewGeneration||page!=='home'){P.stopPreview();return;}area.classList.add('is-live');q('#preview-indicator').hidden=false;q('#preview-indicator').textContent='● Live HDMI';q('#preview-meta').textContent=item.port+' · Live preview';},
          function(){if(gen===previewGeneration)caption.textContent='Live HDMI unavailable · OK opens input';});
      },115);
    }else{art.classList.add('art-'+brandClass(item.name));art.appendChild(el('div','orbit'));var big=logo(item);big.classList.add('hero-logo');art.appendChild(big);art.appendChild(el('span','art-caption','Press OK to open · no playback'));}
  }
  function fillHome(){fillRecent();fillFavourites();var r=recentItems(),fav=favouriteItems(),id=M.defaultSelection(state.focusDefault,r,inputList,fav);if(id)preview(lookup(id)||fallbackInput(id));}
  function allVisibleNav(){var items=qa((modalOpen?'#modal-actions .navitem':'#'+page+' .navitem'));
    if(!modalOpen)items=items.concat(qa('.masthead .navitem'));
    return items.filter(function(n){return n.offsetWidth>0&&!n.disabled;});}
  function focusByItem(id){if(!id)return null;return qa('#'+page+' .navitem').find(function(n){return n.dataset.itemid===id;})||null;}
  function focusByAction(action){if(!action)return null;return qa('#'+page+' .navitem').find(function(n){return n.dataset.action===action;})||qa('.masthead .navitem').find(function(n){return n.dataset.action===action;})||null;}
  function focusFirst(){var node;if(page==='home'){
      var recent=recentItems(),fav=favouriteItems(),id=M.defaultSelection(state.focusDefault,recent,inputList,fav);
      node=focusByItem(id)||q('#recent-list .navitem')||q('#favourites .navitem')||q('#home .navitem');
    }else node=q('#'+page+' .navitem');if(node)setFocus(node);}
  function setFocus(node){if(!node||node.disabled)return; if(selected===node)return; if(selected)selected.classList.remove('is-focused');selected=node;node.classList.add('is-focused');
    try{node.focus({preventScroll:true});}catch(e){node.focus();}
    if(node.scrollIntoView)try{node.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});}catch(e){}
    if(page==='home'&&node.dataset.itemid){var item=lookup(node.dataset.itemid)||fallbackInput(node.dataset.itemid);if(item)preview(item);}}
  function focusDirection(key){var items=allVisibleNav();if(!items.length)return;if(!selected||items.indexOf(selected)<0){setFocus(items[0]);return;}
    function mid(n){var r=n.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};}
    var now=mid(selected),best=null,score=Infinity;items.forEach(function(n){if(n===selected)return;var to=mid(n),dx=to.x-now.x,dy=to.y-now.y;
      if((key==='ArrowRight'&&dx<=8)||(key==='ArrowLeft'&&dx>=-8)||(key==='ArrowDown'&&dy<=8)||(key==='ArrowUp'&&dy>=-8))return;
      var main=key==='ArrowRight'||key==='ArrowLeft'?Math.abs(dx):Math.abs(dy),cross=key==='ArrowRight'||key==='ArrowLeft'?Math.abs(dy):Math.abs(dx),s=main+cross*2.35;
      if(s<score){score=s;best=n;}});if(best)setFocus(best);}
  function showPage(next,focus){if(selected)selected.classList.remove('is-focused');selected=null;previewGeneration++;clearTimeout(previewTimer);P.stopPreview();page=next;
    ['home','apps','inputs','edit','settings'].forEach(function(id){q('#'+id).classList.toggle('hidden',id!==next);});
    q('#page-title').textContent=({home:'Home',apps:'All Apps',inputs:'Inputs',edit:'Edit Home',settings:'Launcher Settings'})[next]||'Home';q('#view-subtitle').textContent='';
    if(next==='home')fillHome();if(next==='apps')fillApps();if(next==='inputs')fillInputs();if(next==='edit')fillEdit();if(next==='settings')fillSettings();
    var dest=focus&&(focus.itemId?focusByItem(focus.itemId):focus.action?focusByAction(focus.action):null);if(dest)setFocus(dest);else{selected=null;focusFirst();}
  }
  function refreshView(name,itemId){showPage(name||page,itemId?{itemId:itemId}:null);}
  function activate(item){if(!item)return;
    if(item.kind==='input'){
      if(!item.connected){toast(itemName(item)+' is not connected');return;}
      if(!P.isTV){toast('HDMI switching needs a Samsung TV');return;}
      ++previewGeneration;clearTimeout(previewTimer);
      // The video controller serialises source changes; do not overlap an in-flight preview.
      P.showInputFullscreen(item.raw,function(){state.recent=M.recordRecent(state.recent,{id:item.id,name:itemName(item)},Date.now());save();fullscreenInput=true;},
        function(message){toast('Cannot open HDMI: '+message);});return;
    }
    if(!P.isTV){toast('App launching can only be tested on a Samsung TV');return;}
    var before=state.recent.slice();state.recent=M.recordRecent(state.recent,{id:item.id,name:item.name},Date.now());save();
    ++previewGeneration;clearTimeout(previewTimer);
    // Wait for HDMI thumbnail cancellation/restoration before handing over to the app.
    P.stopPreview().then(function(){
      P.launch(item.nativeId,function(){},function(message){state.recent=before;save();toast('Could not open '+item.name+': '+message);});
    });
  }
  function modal(title,message,actions){
    ++previewGeneration;clearTimeout(previewTimer);P.stopPreview();
    q('#preview').classList.remove('is-live');q('#preview-indicator').hidden=true;
    modalOpen=true;modalReturn=selected?{id:selected.dataset.itemid,action:selected.dataset.action,page:page,element:selected}:null;
    q('#modal-title').textContent=title;q('#modal-text').textContent=message||'';var area=q('#modal-actions');area.textContent='';
    actions.forEach(function(a){var b=button('','pill');b.textContent=a.label;b.onclick=function(){hideModal(true);a.fn();};area.appendChild(b);});
    q('#confirm').classList.remove('hidden');if(selected)selected.classList.remove('is-focused');selected=null;setFocus(area.querySelector('.navitem'));}
  function hideModal(restore){var was=modalReturn;if(selected)selected.classList.remove('is-focused');modalOpen=false;inputMode=false;q('#confirm').classList.add('hidden');q('#modal-text').textContent='';modalReturn=null;selected=null;
    if(restore!==false&&was){if(was.page===page&&was.element&&was.element.isConnected)setFocus(was.element);else setFocus(focusByItem(was.id)||focusByAction(was.action)||q('#'+page+' .navitem'));}}
  function textDialog(title,prompt,initial,onSave,max){modal(title,prompt,[{label:'Save',fn:function(){var v=M.safeText(field.value,max||180).trim();onSave(v);}},{label:'Cancel',fn:function(){}}]);
    var field=el('input','dialog-input');field.value=initial||'';field.maxLength=max||180;field.placeholder=prompt;
    q('#modal-text').appendChild(field);field.focus();selected=null;inputMode=true;
    field.addEventListener('keydown',function(e){if(e.key==='Enter'){e.stopPropagation();e.preventDefault();field.blur();inputMode=false;var save=q('#modal-actions .navitem');if(save)setFocus(save);}});
    field.addEventListener('blur',function(){inputMode=false;});
  }
  function toggleFavourite(item){if(!item||!state.favouriteIds)return;var isPinned=state.favouriteIds.indexOf(item.id)>=0;
    state.favouriteIds=isPinned?state.favouriteIds.filter(function(id){return id!==item.id;}):state.favouriteIds.concat([item.id]);save();toast(itemName(item)+(isPinned?' removed from Home':' pinned to Home'));}
  function beginMove(item){movingId=item.id;movingOriginal=state.favouriteIds.slice();showPage('edit',{itemId:item.id});toast('Use left/right to move, OK to save, Back to cancel');}
  function moveFavourite(dir){if(!movingId)return;state.favouriteIds=M.moveItem(state.favouriteIds,movingId,dir);save();showPage('edit',{itemId:movingId});}
  function finishMove(commit){if(!movingId)return;var id=movingId;if(!commit){state.favouriteIds=movingOriginal;save();}movingId=null;movingOriginal=null;showPage('edit',{itemId:id});if(commit)toast('Home order saved');}
  function editActions(item){var pinned=state.favouriteIds.indexOf(item.id)>=0,hidden=state.hiddenAppIds.indexOf(item.id)>=0,from=page;
    var actions=[];
    if(pinned)actions.push({label:'Move',fn:function(){beginMove(item);}});
    actions.push({label:pinned?'Remove from Home':'Pin to Home',fn:function(){toggleFavourite(item);showPage(from==='home'?'home':from,{itemId:item.id});}});
    if(item.kind==='app'&&from!=='home')actions.push({label:hidden?'Unhide app':'Hide from All Apps',fn:function(){
      state.hiddenAppIds=hidden?state.hiddenAppIds.filter(function(x){return x!==item.id;}):M.unique(state.hiddenAppIds.concat([item.id]));save();showPage(from,{itemId:item.id});toast(hidden?'App shown':'App hidden from All Apps');}});
    if(item.kind==='input')actions.push({label:'Rename input',fn:function(){showRename(item);}});
    actions.push({label:'Cancel',fn:function(){}});
    modal(itemName(item),'Manage this shortcut without uninstalling anything.',actions);
  }
  function pinInput(){if(!inputList.length){toast('No HDMI sources detected');return;}
    modal('Pin an input','Choose an input to add or remove from your favourites.',inputList.filter(function(i){return i.port.indexOf('HDMI')===0;}).map(function(i){return{label:(state.favouriteIds.indexOf(i.id)>=0?'★ ':'＋ ')+itemName(i)+' ('+i.port+')',fn:function(){toggleFavourite(i);showPage('edit',{itemId:i.id});}};}).concat([{label:'Cancel',fn:function(){}}]));}
  function renameInput(){var list=inputList.filter(function(x){return x.port.indexOf('HDMI')===0;});
    if(!list.length){toast('No HDMI inputs detected');return;}
    modal('Rename HDMI input','Select the input you want to rename.',list.map(function(i){return{label:itemName(i)+' ('+i.port+')',fn:function(){showRename(i);}};}).concat([{label:'Cancel',fn:function(){}}]));}
  function showRename(item){textDialog('Rename '+item.port,'Device name',itemName(item),function(v){if(v){state.inputNames[item.port]=v;save();toast('Renamed '+item.port);showPage('settings',{action:'setting-rename'});}},35);}
  function searchApps(){textDialog('Search installed apps','Type an app name (leave blank to clear)',searchTerm,function(value){searchTerm=value;filter='All';editingFromApps=false;showPage('apps',{action:'search-apps'});},50);}
  function weatherLocation(){textDialog('Weather location','Enter a town or postcode',state.city,function(value){if(value.length<2){toast('Enter at least two characters');return;}fetchLocations(value);},70);}
  function fetchLocations(name){var controller=typeof AbortController==='function'?new AbortController():null,timer=setTimeout(function(){if(controller)controller.abort();},7000);
    toast('Searching weather locations…');fetch('https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(name)+'&count=5&language=en&format=json',controller?{signal:controller.signal}:{}).then(function(r){if(!r.ok)throw Error('Search unavailable');return r.json();}).then(function(data){
      var list=(data&&data.results||[]).filter(function(x){return Number.isFinite(x.latitude)&&Number.isFinite(x.longitude);}).slice(0,5);
      if(!list.length){toast('No location found. Try a town or city name.');return;}
      modal('Choose weather location','Select the matching town or postcode.',list.map(function(place){return{label:place.name+(place.admin1?', '+place.admin1:'')+(place.country?', '+place.country:''),fn:function(){state.city=M.safeText(place.name,65);weatherInFlight=false;state.latitude=place.latitude;state.longitude=place.longitude;save();weatherTime=0;weatherRequest++;applyAppearance();showPage('settings',{action:'setting-city'});refreshWeather(true);}};}).concat([{label:'Cancel',fn:function(){}}]));
    }).catch(function(){toast('Location search failed; existing location retained');}).then(function(){clearTimeout(timer);});}
  function customWallpaper(){textDialog('Custom wallpaper','HTTPS URL of an image; remote servers see requests from the TV',state.customWallpaperUrl,function(value){
    if(value&&!M.safeUrl(value)){toast('Only HTTPS image URLs are supported');return;}
    state.customWallpaperUrl=M.safeUrl(value);state.wallpaper=value?'custom':'scenic';save();applyAppearance();showPage('settings',{action:'setting-custom'});
  },450);}
  function exportChoices(){var allowed=['favouriteIds','layout','recentCount','showWeather','showClock','previewMode','reducedMotion','glow','city','latitude','longitude','tempUnit','inputNames','hideDisconnected','wallpaper','customWallpaperUrl','focusDefault','hiddenAppIds','showHidden','longPressMs'];
    var backup={format:'cinematic-tv-preferences',version:1};allowed.forEach(function(key){backup[key]=state[key];});return JSON.stringify(backup);}
  function importChoices(text){try{var data=JSON.parse(text);if(data.format!=='cinematic-tv-preferences'||data.version!==1)throw Error('Invalid format');
      var d=M.defaults();Object.keys(d).forEach(function(key){if(Object.prototype.hasOwnProperty.call(data,key))d[key]=data[key];});
      state=M.load(JSON.stringify(d));save();applyAppearance();showPage('settings');toast('Preferences imported (history not included)');
    }catch(e){toast('Invalid preferences backup');}}
  function backupSettings(){modal('Back up your launcher','Choose export to display your local settings, or import previously saved JSON.',[
    {label:'Export',fn:function(){var value=exportChoices();textDialog('Export preferences','Select and copy the JSON using a connected keyboard or remote',value,function(){toast('Backup displayed; no changes made');},20000);}},
    {label:'Import',fn:function(){textDialog('Import preferences','Paste previously exported JSON', '',importChoices,20000);}},
    {label:'Cancel',fn:function(){}}
  ]);}
  function diagnosticInfo(){var p=P.diagnostics(),s=['Mode: '+p.mode,'Installed applications: '+catalog.length,'Detected inputs: '+inputList.length,'Catalogue: '+diagnostics.status,
    'Last check: '+(diagnostics.lastCheck?new Date(diagnostics.lastCheck).toLocaleString('en-GB'):'Never'),
    'App discovery API: '+(p.appDiscovery?'Present':'Not available'),'HDMI preview API: '+(p.hdmiPreview?'Present':'Not available'),'Video state: '+p.video.operation+' / '+p.video.owner,'Video error: '+(p.video.lastError||'None'),
    'Live preview setting: '+state.previewMode,'Weather: Open-Meteo, optional online calls',
    'Native Samsung Settings: handled by TV remote, not intercepted',
    'Last error: '+(diagnostics.error||'None')];
    modal('Diagnostics',s.join('  •  '),[{label:'Close',fn:function(){}}]);}
  function settingAction(name){var focus={action:name};
    if(name==='setting-layout'){var layouts=['cinematic','balanced','compact'];state.layout=layouts[(layouts.indexOf(state.layout)+1)%layouts.length];}
    else if(name==='setting-focus'){var modes=['recent','pc','favourite'];state.focusDefault=modes[(modes.indexOf(state.focusDefault)+1)%modes.length];}
    else if(name==='setting-preview'){
      if(state.previewMode==='off'){
        modal('Experimental HDMI preview','This can temporarily switch the TV video source. It is untested on your S95H; enable only after confirming fullscreen HDMI works.',[
          {label:'Enable',fn:function(){state.previewMode='selected';save();showPage('settings',{action:name});}},
          {label:'Keep off',fn:function(){}}
        ]);return;
      }state.previewMode='off';P.stopPreview();}
    else if(name==='setting-recent')state.recentCount=state.recentCount>=6?2:state.recentCount+1;
    else if(name==='setting-weather')state.showWeather=!state.showWeather;
    else if(name==='setting-clock')state.showClock=!state.showClock;
    else if(name==='setting-city'){weatherLocation();return;}
    else if(name==='setting-unit'){state.tempUnit=state.tempUnit==='celsius'?'fahrenheit':'celsius';weatherTime=0;weatherInFlight=false;weatherRequest++;}
    else if(name==='setting-wallpaper'){var walls=['scenic','twilight','dawn','dark'];var idx=walls.indexOf(state.wallpaper);state.wallpaper=walls[(idx+1)%walls.length];}
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
        {label:'Reset',fn:function(){state=M.defaults();save();applyAppearance();refreshData(true);}},
        {label:'Cancel',fn:function(){}}
      ]);return;
    }else return;
    save();applyAppearance();showPage('settings',focus);refreshWeather(name==='setting-weather'||name==='setting-unit');
  }
  function doAction(action){if(action==='apps'){editingFromApps=false;showPage('apps');}
    else if(action==='inputs')showPage('inputs');else if(action==='edit')showPage('edit');
    else if(action==='editadd'){editingFromApps=true;showPage('apps');toast('Select an app to pin or unpin it');}
    else if(action==='editinput')pinInput();else if(action==='search-apps')searchApps();
    else if(action==='settings')showPage('settings');else if(action&&action.indexOf('setting-')===0)settingAction(action);
  }
  function setCatalogue(list){catalog=list;appById={};catalog.forEach(function(a){appById[a.id]=a;});}
  function setInputs(list){inputList=list;inputById={};list.forEach(function(i){inputById[i.id]=i;});}
  function refreshData(report){var gen=++refreshGeneration;diagnostics.status='Checking';diagnostics.lastCheck=Date.now();
    P.getApps(function(raw){if(gen!==refreshGeneration)return;setCatalogue(M.catalogue(raw,P.currentId()));
      try{localStorage.setItem(APP_CACHE,JSON.stringify(raw.filter(function(x){return x&&x.id&&x.id!==P.currentId();}).slice(0,350)));}catch(e){}
      diagnostics.status='Checked successfully';diagnostics.error='';
      if(state.favouriteIds===null){state.favouriteIds=M.initialFavourites(catalog,state.favouriteOrderNames);save();}
      refreshInputs(gen,report);
    },function(err){if(gen!==refreshGeneration)return;diagnostics.status='Could not check apps';diagnostics.error=err;
      // Retain previously cached favourites so a transient API failure does not erase Home.
      refreshInputs(gen,report);toast('App discovery failed; displaying cached information');
    });}
  function refreshInputs(gen,report){P.listInputs(function(info){if(gen!==refreshGeneration)return;setInputs(M.sources(info));
      if(!P.isTV&&!state.recent.length){var pc=inputList.find(function(i){return i.connected;});if(pc)state.recent=M.recordRecent(state.recent,{id:pc.id,name:itemName(pc)},Date.now());
        ['YouTube','Apple TV','Netflix'].forEach(function(name,i){var app=matchApp(name);if(app)state.recent.push({id:app.id,name:app.name,at:Date.now()-(i+1)*3600000});});}
      showPage(page);if(report)toast('App catalogue and inputs refreshed');
    },function(err){if(gen!==refreshGeneration)return;diagnostics.error='HDMI: '+err;showPage(page);if(report)toast('App catalogue updated; HDMI check failed');});}
  function initialCache(){var items;try{items=JSON.parse(storageGet(APP_CACHE)||'null');}catch(e){}
    if(Array.isArray(items))setCatalogue(M.catalogue(items,P.currentId()));if(state.favouriteIds===null&&catalog.length){state.favouriteIds=M.initialFavourites(catalog,state.favouriteOrderNames);save();}}
  function onClick(e){var target=e.target.closest('button');if(!target||modalOpen)return;if(target.dataset.action)doAction(target.dataset.action);}
  function longAction(){if(!selected||modalOpen||movingId)return;var item=lookup(selected.dataset.itemid)||fallbackInput(selected.dataset.itemid);if(item&&(page==='home'||page==='apps'||page==='edit'||page==='inputs'))editActions(item);}
  function pressShort(){if(!selected)return;if(movingId){finishMove(true);return;}if(selected.isConnected)selected.click();}
  function onKeyDown(e){
    var key=e.key,back=key==='Escape'||key==='Backspace'||key==='BrowserBack'||key==='Back'||e.keyCode===10009;
    if(inputMode){if(back){e.preventDefault();hideModal(true);}return;}
    if(fullscreenInput){if(back){e.preventDefault();fullscreenInput=false;P.leaveFullscreen();showPage('home');}return;}
    if(movingId){if(back){e.preventDefault();finishMove(false);return;}
      if(key==='ArrowLeft'||key==='ArrowRight'){e.preventDefault();moveFavourite(key==='ArrowLeft'?-1:1);return;}}
    if(/^Arrow(Up|Down|Left|Right)$/.test(key)){e.preventDefault();clearTimeout(enterTimer);enterDown=false;enterLong=false;focusDirection(key);return;}
    if(key==='Enter'||e.keyCode===13){e.preventDefault();if(e.repeat||enterDown)return;enterDown=true;enterLong=false;
      enterTimer=setTimeout(function(){if(enterDown&&!modalOpen){enterLong=true;longAction();}},state.longPressMs);return;}
    if(back){e.preventDefault();clearTimeout(enterTimer);enterDown=false;
      if(modalOpen){hideModal(true);return;}if(page!=='home'){editingFromApps=false;showPage('home');return;}
      // Standard Samsung app Back behaviour: exit only from the home screen.
      P.exit();}
  }
  function onKeyUp(e){if(e.key==='Enter'||e.keyCode===13){e.preventDefault();clearTimeout(enterTimer);if(enterDown&&!enterLong)pressShort();enterDown=false;enterLong=false;}}
  function init(){if(isDemo())q('#test-ribbon').classList.remove('hidden');applyAppearance();updateClock();refreshWeather();
    setInterval(updateClock,30000);setInterval(function(){refreshWeather();},5*60*1000);
    doc.addEventListener('click',onClick);doc.addEventListener('keydown',onKeyDown);doc.addEventListener('keyup',onKeyUp);
    doc.addEventListener('focusin',function(e){if(e.target.classList&&e.target.classList.contains('navitem')&&e.target!==selected)setFocus(e.target);});
    qa('.filter').forEach(function(b){b.addEventListener('click',function(){filter=b.dataset.filter;fillApps();setFocus(b);});});
    doc.addEventListener('visibilitychange',function(){if(doc.hidden){previewGeneration++;clearTimeout(previewTimer);P.stopPreview();clearTimeout(enterTimer);enterDown=false;}
      else{updateClock();refreshWeather();if(Date.now()-refreshThrottle>3500){refreshThrottle=Date.now();refreshData(false);}}});
    P.watchInputs(function(){if(Date.now()-refreshThrottle>1200){refreshThrottle=Date.now();refreshData(false);}});
    initialCache();refreshData(false);showPage('home');
  }
  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init);else init();
})(window,document);
