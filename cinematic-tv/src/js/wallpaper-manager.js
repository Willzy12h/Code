/* Wallpaper work is asynchronous and independent of remote input/native HDMI. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./wallpapers'),require('./wallpaper-catalogue'));else root.LauncherWallpaperManager=factory(root.LauncherWallpapers,root.LauncherWallpaperCatalogue);}(typeof window!=='undefined'?window:this,function(W,C){
 'use strict';
 function create(options){
  var cache=options.cache,catalogue=C.validate(options.catalogue),now=options.now||Date.now,rows=[],current=null,pendingId=null,history=[],visible=true,paused=false,disposed=false,generation=0,lastInput=-Infinity,lastShown=now(),lastFetch=-Infinity,inflight=null,controller=null,bufferFull=false,refillNeeded=false,started=false,failures=0,nextAttempt=0,prefs={wallpaperTopics:['scenery'],wallpaperRotation:true};
  function status(message){if(options.onStatus)options.onStatus(message,{current:current,history:history.slice(),count:rows.length,bytes:rows.reduce(function(n,r){return n+r.blob.size+(r.boot?r.boot.size:0)+(r.bootBytes||0);},0)});}
  function fullBuffer(){return rows.length>=6||rows.reduce(function(n,r){return n+r.blob.size+(r.bootBytes||0);},0)>=18*1024*1024;}
  function list(){return C.candidates(catalogue,prefs.wallpaperTopics,history.slice(-6));}
  async function remember(){try{await cache.setMeta({current:current&&current.id,history:history.slice(-60)});}catch(e){status('Image shown; history could not be saved');}}
  async function display(record,back){
   if(!record||!visible||disposed)return false;var token=++generation;pendingId=record.id;
   var accepted=await options.onReady(record,token);
   if(token===generation)pendingId=null;if(accepted===false||token!==generation||disposed||!visible)return false;
   if(bufferFull&&current&&current.id!==record.id)refillNeeded=true;current=record;lastShown=now();if(record.blob&&cache.touch){record.at=now();try{await cache.touch(record.id,record.at);}catch(e){status('Image shown; cache timestamp unchanged');}}if(back)history=history.slice(0,-2);if(history[history.length-1]!==record.id)history.push(record.id);history=history.slice(-60);await remember();status(record.legacy?'Previous saved photograph · offline ready':record.blob?'Saved wallpaper · offline ready':'Bundled wallpaper');return true;
  }
  async function start(preferences){
   configure(preferences);var meta={};try{rows=await cache.readAll();meta=await cache.getMeta();}catch(e){status('Local cache unavailable; bundled wallpapers remain available');}
   rows=rows.filter(function(r){try{if(r.legacy)return !!W.legacyRecord(r);C.validate({version:1,images:[r]});return true;}catch(e){return false;}});
   bufferFull=fullBuffer();
   history=Array.isArray(meta.history)?meta.history.filter(function(id){return typeof id==='string';}).slice(-60):[];
   var first=rows.find(function(r){return r.id===meta.current;})||rows.find(function(r){return list().some(function(c){return c.id===r.id;});})||list().find(function(r){return r.bundled;})||catalogue.images.find(function(r){return r.bundled;});
   if(first&&first.legacy&&options.validateImage){try{first=await options.validateImage(first);await cache.commit(first,[first.id]);}catch(e){first=catalogue.images.find(function(r){return r.bundled;});}}
   if(first)await display(first);started=true;return current;
  }
  async function next(){
   if(!visible||disposed)return false;var choices=list(),record;
   for(var i=0;i<choices.length;i++){var c=choices[i];if(current&&current.id===c.id||c.id===pendingId)continue;record=rows.find(function(r){return r.id===c.id;})||(c.bundled?c:null);if(record)break;}
   if(!record){status('No other saved image yet; keeping current wallpaper');return false;}return display(record);
  }
  async function previous(){if(history.length<2)return false;var id=history[history.length-2],record=rows.find(function(r){return r.id===id;})||catalogue.images.find(function(r){return r.id===id&&r.bundled;});return display(record,true);}
  async function prepare(){
   if(disposed||!visible||paused||inflight||bufferFull&&!refillNeeded||now()<nextAttempt||now()-lastInput<2000||now()-lastFetch<60000)return;
   var candidate=list().find(function(r){return !rows.some(function(x){return x.id===r.id;});});if(!candidate)return;
   lastFetch=now();controller=new AbortController();var active=controller;
   inflight=(async function(){try{
    var blob=await W.download(candidate,options.fetcher,active.signal);if(active.signal.aborted||disposed||!visible)return;
    var record=Object.assign({},candidate,{blob:blob,at:now()});if(options.validateImage)record=await options.validateImage(record);
    if(active.signal.aborted||disposed||!visible)return;
    var oldIds=rows.map(function(r){return r.id;});await cache.commit(record,[current&&current.id,history[history.length-2]].filter(Boolean));rows=await cache.readAll();bufferFull=fullBuffer()||oldIds.some(function(id){return !rows.some(function(r){return r.id===id;});});refillNeeded=false;failures=0;nextAttempt=0;status('Next wallpaper saved');
   }catch(e){if(!active.signal.aborted){failures=Math.min(failures+1,5);nextAttempt=now()+Math.min(1800000,60000*Math.pow(2,failures-1));status('Online image unavailable; saved and bundled images retained');}}finally{inflight=null;if(controller===active)controller=null;}})();return inflight;
  }
  async function tick(){if(disposed||!visible)return;if(!paused&&now()-lastInput>=2000&&now()-lastShown>=3600000)await next();await prepare();}
  function configure(value){var oldTopics=prefs.wallpaperTopics.join('|');prefs={wallpaperTopics:value&&Array.isArray(value.wallpaperTopics)&&value.wallpaperTopics.length?value.wallpaperTopics.filter(function(t){return C.TOPICS.indexOf(t)>=0;}):['scenery'],wallpaperRotation:!value||value.wallpaperRotation!==false};if(!prefs.wallpaperTopics.length)prefs.wallpaperTopics=['scenery'];paused=!prefs.wallpaperRotation;if(started&&oldTopics!==prefs.wallpaperTopics.join('|')){refillNeeded=true;nextAttempt=0;}}
  return{start:start,next:next,previous:previous,tick:tick,prepare:prepare,configure:configure,
   setPaused:function(value){paused=!!value;},setVisible:function(value){visible=!!value;if(!visible){generation++;if(controller)controller.abort();}else lastInput=now();},inputActivity:function(){lastInput=now();},
   setCatalogue:function(raw){catalogue=C.validate(raw);},status:function(){return{current:current,history:history.slice(),paused:paused};},dispose:function(){disposed=true;generation++;if(controller)controller.abort();}
  };
 }
 return{create:create};
}));
