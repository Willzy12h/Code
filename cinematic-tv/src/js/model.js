/* Cinematic TV — pure, testable, backward-compatible state and catalogue helpers. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LauncherModel = factory();
}(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  var PRIMARY = ['YouTube','Crunchyroll','Apple TV','Netflix','Paramount+','Disney+','Prime Video','Hue Sync'];
  var ALIASES = [
    ['YouTube',/^youtube(?:\s*on\s*tv)?$/i],['Crunchyroll',/^crunchyroll$/i],['Apple TV',/^apple\s*tv(?:\+)?$/i],
    ['Netflix',/^netflix$/i],['Paramount+',/^paramount(?:\+|\s*plus)?$/i],['Disney+',/^disney(?:\+|\s*plus)$/i],
    ['Prime Video',/^(?:amazon\s*)?(?:prime\s*)?video$/i],['Hue Sync',/^(?:philips\s*)?hue\s*sync(?:\s*tv)?$/i],
    ['BBC iPlayer',/^bbc\s*iplayer$/i],['ITVX',/^(?:itvx|itv\s*hub)$/i],['Channel 4',/^(?:channel\s*4|all\s*4)$/i],
    ['5',/^(?:5|channel\s*5|my5)$/i],['Spotify',/^spotify(?:\s*[-–:]\s*music.*)?$/i],['Plex',/^plex(?:\s*[-–:]\s*stream.*)?$/i],['Twitch',/^twitch(?:\s*tv)?$/i],
    ['SmartThings',/^smartthings$/i],['Samsung Health',/^samsung\s*health$/i]
  ];
  function safeText(s, limit) { return String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, '').slice(0,limit || 100); }
  function unique(a) { var seen=Object.create(null);return a.filter(function(x){if(seen[x])return false;seen[x]=1;return true;}); }
  function nameOf(s){var name=safeText(s,80).trim();for(var i=0;i<ALIASES.length;i++)if(ALIASES[i][1].test(name))return ALIASES[i][0];return name||'Application';}
  function defaults(){return {
    version:1, favouriteIds:null, recent:[], view:'home',layout:'cinematic',recentCount:4,
    showWeather:true,showClock:true,hdmiPreview:false,previewMode:'off',reducedMotion:false,glow:'blue',
    city:'London',latitude:51.5074,longitude:-0.1278,tempUnit:'celsius',
    inputNames:{},hideDisconnected:true,favouriteOrderNames:PRIMARY.slice(),wallpaper:'scenic',
    customWallpaperUrl:'', focusDefault:'recent',hiddenAppIds:[],showHidden:false,
    longPressMs:190, previewBrand:'subtle', setupDone:false, showNetwork:false, quickSwitch:true,
    profiles:[], inputIcons:{}, adaptiveWeather:false, reducedEffects:false, autoPreviewCurrentOnly:true
  };}
  function safeUrl(value) {
    if (typeof value !== 'string' || value.length > 450 || /[\s\x00-\x1f\x7f"'<>\\]/.test(value)) return '';
    try {
      var u = new URL(value), h = u.hostname.toLowerCase();
      if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443')) return '';
      // Only public DNS names. IP literals and local names are unnecessary for wallpapers.
      if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(h) || /(^|\.)(localhost|local|internal|lan|home|test|invalid)$/.test(h)) return '';
      if (h.split('.').some(function(part){return !part || part.length > 63 || /^-|-$/.test(part);})) return '';
      return u.href;
    } catch (e) { return ''; }
  }
  function namedMap(raw, icon) {
    var out={};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    Object.keys(raw).slice(0,32).forEach(function(k){
      if (!/^(HDMI|TV) \d{1,2}$/.test(k) || typeof raw[k] !== 'string') return;
      var value=safeText(raw[k],35).trim();
      if (icon && ['pc','console','streamer','receiver','generic'].indexOf(value)<0) return;
      if (value) out[k]=value;
    });
    return out;
  }
  function validIds(raw, limit) {
    return Array.isArray(raw) ? unique(raw.filter(function(x){return typeof x==='string' && /^(app:[^\s]{1,180}|input:(HDMI|TV):\d{1,2})$/.test(x);}).slice(0,limit||120)) : [];
  }

  function between(n,min,max,fallback){var v=Number(n);return Number.isFinite(v)?Math.min(max,Math.max(min,v)):fallback;}
  function load(raw){
    var d=defaults(),p;
    try{p=JSON.parse(raw);}catch(e){return d;}
    if(!p||typeof p!=='object'||p.version!==1)return d;
    Object.keys(d).forEach(function(k){if(Object.prototype.hasOwnProperty.call(p,k))d[k]=p[k];});
    d.favouriteIds=Array.isArray(d.favouriteIds)?validIds(d.favouriteIds):null;
    d.recent=Array.isArray(d.recent)?d.recent.filter(function(x){return x&&validIds([x.id]).length===1;}).slice(0,30).map(function(r){return{id:r.id,name:safeText(r.name),at:between(r.at,0,9999999999999,0)};}):[];
    d.inputNames=namedMap(d.inputNames,false); d.inputIcons=namedMap(d.inputIcons,true);
    d.favouriteOrderNames=Array.isArray(d.favouriteOrderNames)?d.favouriteOrderNames.filter(function(x){return typeof x==='string' && x.trim();}).slice(0,30).map(function(x){return safeText(x,80);}):PRIMARY.slice();
    d.hiddenAppIds=validIds(d.hiddenAppIds,250).filter(function(x){return x.indexOf('app:')===0;});
    d.recentCount=Math.round(between(d.recentCount,2,6,4));
    d.longPressMs=between(d.longPressMs,170,450,190);
    if(['cinematic','balanced','compact'].indexOf(d.layout)<0)d.layout='cinematic';
    if(['scenic','twilight','dawn','dark','custom','auto'].indexOf(d.wallpaper)<0)d.wallpaper='scenic';
    if(['blue','white'].indexOf(d.glow)<0)d.glow='blue';
    if(['recent','pc','favourite'].indexOf(d.focusDefault)<0)d.focusDefault='recent';
    d.customWallpaperUrl=safeUrl(d.customWallpaperUrl);
    if(d.wallpaper==='custom'&&!d.customWallpaperUrl)d.wallpaper='scenic';
    d.city=safeText(d.city,65)||'London';
    d.latitude=between(d.latitude,-90,90,51.5074); d.longitude=between(d.longitude,-180,180,-0.1278);
    d.tempUnit=d.tempUnit==='fahrenheit'?'fahrenheit':'celsius';
    d.hdmiPreview=d.hdmiPreview===true;
    d.previewMode=['off','selected'].indexOf(d.previewMode)>=0?d.previewMode:(d.hdmiPreview?'selected':'off');
    d.showWeather=d.showWeather!==false;d.showClock=d.showClock!==false;
    d.showHidden=d.showHidden===true;d.hideDisconnected=d.hideDisconnected!==false;
    d.reducedMotion=d.reducedMotion===true;
    d.setupDone=d.setupDone===true; d.showNetwork=d.showNetwork===true; d.quickSwitch=d.quickSwitch!==false;
    d.adaptiveWeather=d.adaptiveWeather===true; d.reducedEffects=d.reducedEffects===true;
    d.autoPreviewCurrentOnly=d.autoPreviewCurrentOnly!==false;
    d.profiles=Array.isArray(d.profiles)?d.profiles.slice(0,8).filter(function(x){return x && typeof x.name==='string';}).map(function(x){
      return {name:safeText(x.name,32).trim()||'Home', favouriteIds:validIds(x.favouriteIds), layout:['cinematic','balanced','compact'].indexOf(x.layout)>=0?x.layout:'cinematic',
        recentCount:Math.round(between(x.recentCount,2,6,4)),wallpaper:['scenic','dawn','twilight','dark','auto'].indexOf(x.wallpaper)>=0?x.wallpaper:'scenic',
        glow:x.glow==='white'?'white':'blue',reducedMotion:x.reducedMotion===true};
    }):[];
    return d;
  }
  function catalogue(apps,myId){var out=[],seen=Object.create(null);(Array.isArray(apps)?apps:[]).slice(0,1000).forEach(function(a){
    if(!a||typeof a.id!=='string'||!validIds(['app:'+a.id]).length||seen[a.id]||a.id===myId||a.show===false)return;
    seen[a.id]=true;out.push({id:'app:'+a.id,nativeId:a.id,name:nameOf(a.name||a.id),icon:typeof a.iconPath==='string'?a.iconPath:'',rawName:safeText(a.name,120),kind:'app'});
  });return out.sort(function(a,b){return a.name.localeCompare(b.name);});}
  function initialFavourites(list,names){var out=[];(names||PRIMARY).forEach(function(n){var a=list.find(function(x){return x.name.toLowerCase()===n.toLowerCase();});if(a&&out.indexOf(a.id)<0)out.push(a.id);});return out.length?out:list.slice(0,8).map(function(x){return x.id;});}
  function orderedFavourites(ids,all){return(ids||[]).map(function(id){return all.find(function(x){return x.id===id;});}).filter(Boolean);}
  function recordRecent(recent,entry,time){if(!entry||!entry.id)return recent||[];var x={id:entry.id,name:safeText(entry.name),at:Number(time)||Date.now()};return[x].concat((recent||[]).filter(function(e){return e&&e.id!==x.id;})).slice(0,30);}
  function moveItem(ids,id,direction){var copy=(ids||[]).slice(),i=copy.indexOf(id),j=i+direction;if(i<0||j<0||j>=copy.length)return copy;copy[i]=copy[j];copy[j]=id;return copy;}
  function sources(info){var out=[],seen={};['connected','disconnected'].forEach(function(kind){(info&&Array.isArray(info[kind])?info[kind]:[]).forEach(function(s){
    if(!s||(s.type!=='HDMI'&&s.type!=='TV')||!Number.isInteger(Number(s.number))||Number(s.number)<0||Number(s.number)>99)return;
    var id='input:'+s.type+':'+s.number;if(seen[id])return;seen[id]=true;
    out.push({id:id,kind:'input',name:typeof s.editName==='string'?safeText(s.editName,35):s.type+' '+s.number,port:s.type+' '+s.number,connected:kind==='connected',raw:s});
  });});return out.sort(function(a,b){return Number(b.connected)-Number(a.connected)||a.port.localeCompare(b.port);});}
  function detectCategory(name){var n=String(name||'').toLowerCase();if(/hue|smartthings|health/.test(n))return'Utilities';if(/spotify|music/.test(n))return'Music';return'Entertainment';}
  function defaultSelection(focusDefault,recents,all,favourites,inputNames){
    if(focusDefault==='pc'){var pc=all.find(function(a){return a.kind==='input'&&(a.port.indexOf('HDMI')===0)&&(String((inputNames||{})[a.port]||a.name).toLowerCase().indexOf('pc')>=0)&&a.connected;});if(pc)return pc.id;}
    if(focusDefault==='favourite'&&favourites&&favourites.length)return favourites[0].id;
    var available=(recents||[]).find(function(x){return x.kind!=='input'||x.connected!==false;});
    if(available)return available.id;
    return favourites&&favourites.length?favourites[0].id:null;
  }
  return{PRIMARY:PRIMARY,defaults:defaults,load:load,nameOf:nameOf,unique:unique,catalogue:catalogue,initialFavourites:initialFavourites,orderedFavourites:orderedFavourites,recordRecent:recordRecent,moveItem:moveItem,sources:sources,safeText:safeText,safeUrl:safeUrl,detectCategory:detectCategory,defaultSelection:defaultSelection};
}));
