/* Local, bounded QoL helpers. No network, hardware control or hidden background work. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./model.js'));
  else root.LauncherFeatures=factory(root.LauncherModel);
}(typeof window!=='undefined'?window:this,function(M){
  'use strict';
  var PROFILE_KEYS=['favouriteIds','layout','recentCount','wallpaper','glow','reducedMotion'];
  function previousItem(recent,lookup){
    for(var i=1;i<(recent||[]).length;i++){
      var item=lookup(recent[i].id);
      if(item&&(item.kind!=='input'||item.connected!==false))return item;
    }
    return null;
  }
  function wallpaperAt(hour,code,weather){
    if(hour<6||hour>=19)return 'twilight';
    if(hour<10)return 'dawn';
    if(weather&&Number.isFinite(code)&&code>=51)return 'twilight';
    return 'scenic';
  }
  function snapshotProfile(state,name){
    var p={name:M.safeText(name,32).trim()||'Home'};
    PROFILE_KEYS.forEach(function(k){p[k]=Array.isArray(state[k])?state[k].slice():state[k];});
    if(p.wallpaper==='custom')p.wallpaper='scenic';
    return M.load(JSON.stringify({version:1,profiles:[p]})).profiles[0];
  }
  function applyProfile(state,profile){
    var s=JSON.parse(JSON.stringify(state));
    var p=M.load(JSON.stringify({version:1,profiles:[profile]})).profiles[0];
    if(!p)throw new Error('Invalid Home profile');
    PROFILE_KEYS.forEach(function(k){s[k]=p[k];});
    return M.load(JSON.stringify(s));
  }
  function exportBackup(state){
    var clean=M.load(JSON.stringify(state));
    delete clean.recent; delete clean.previewMode;delete clean.hdmiPreview;delete clean.view;
    return JSON.stringify({format:'cinematic-tv-preferences',version:2,settings:clean},null,2);
  }
  function restoreBackup(text){
    if(typeof text!=='string'||text.length>65536)throw new Error('Backup must be smaller than 64 KiB');
    var data=JSON.parse(text);
    if(!data||data.format!=='cinematic-tv-preferences'||[1,2].indexOf(data.version)<0)throw new Error('Unsupported backup format');
    var raw=data.version===2?data.settings:data;
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.version!==1)throw new Error('Invalid settings schema');
    var s=M.load(JSON.stringify(raw));
    s.recent=[];s.previewMode='off';s.hdmiPreview=false;s.setupDone=true;
    return s;
  }
  function resetSection(state,section){
    var groups={appearance:['layout','wallpaper','customWallpaperUrl','glow','reducedMotion','reducedEffects','adaptiveWeather'],
      inputs:['inputNames','inputIcons','pcPort','hideDisconnected'],history:['recent'],hidden:['hiddenAppIds','showHidden'],
      weather:['city','latitude','longitude','tempUnit','showWeather'],favourites:['favouriteIds']};
    if(!groups[section])throw new Error('Unknown reset section');
    var s=JSON.parse(JSON.stringify(state)),defaults=M.defaults();
    groups[section].forEach(function(k){s[k]=defaults[k];});return M.load(JSON.stringify(s));
  }
  function isNewer(tag,current){
    var a=/^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(tag)),b=/^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(current));
    if(!a||!b)return false;
    for(var i=1;i<=3;i++){if(Number(a[i])!==Number(b[i]))return Number(a[i])>Number(b[i]);}return false;
  }
  function redact(text){
    return String(text||'').replace(/https?:\/\/[^\s]+/gi,'[URL omitted]')
      .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g,'[address omitted]')
      .replace(/\b(DUID|token|password|secret|certificate|serial)\s*[:=]\s*\S+/gi,'$1=[omitted]').slice(0,1500);
  }
  function inputGlyph(kind){return ({pc:'▣',console:'◇',streamer:'▤',receiver:'◉',generic:'▣'})[kind]||'▣';}
  function sanitiseDiagnostic(entries){return(entries||[]).slice(-40).map(function(e){return{time:e.time||'',event:redact(e.event),detail:redact(e.detail)};});}
  return {previousItem:previousItem,wallpaperAt:wallpaperAt,snapshotProfile:snapshotProfile,applyProfile:applyProfile,
    exportBackup:exportBackup,restoreBackup:restoreBackup,resetSection:resetSection,isNewer:isNewer,redact:redact,inputGlyph:inputGlyph,sanitiseDiagnostic:sanitiseDiagnostic};
}));
