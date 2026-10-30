/* Daily photograph: explicit opt-in, one bounded local image, no remote scripts or proxy. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.LauncherWallpapers=factory();
}(typeof window!=='undefined'?window:this,function(){
  'use strict';
  var LIMIT=6*1024*1024,MAX_AGE=7*24*60*60*1000;
  function text(value){return String(value||'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/[\u0000-\u001f\u007f]/g,'').replace(/\s+/g,' ').trim().slice(0,220);}
  function allowedImage(url){try{var u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&['upload.wikimedia.org','thumb.wikimedia.org'].indexOf(u.hostname)>=0;}catch(e){return false;}}
  function photo(data){
    var pages=data&&data.query&&data.query.pages;
    if(!pages)throw new Error('Daily photograph unavailable');
    var list=Object.keys(pages).map(function(k){return pages[k];});
    for(var i=0;i<list.length;i++){
      var page=list[i],info=page.imageinfo&&page.imageinfo[0];if(!info)continue;
      var url=info.thumburl||info.url;if(!allowedImage(url))continue;
      var source=new URL(info.descriptionurl||'https://commons.wikimedia.org/');
      if(source.protocol!=='https:'||source.hostname!=='commons.wikimedia.org'||source.username||source.password)continue;
      var meta=info.extmetadata||{},artist=text(meta.Artist&&meta.Artist.value),licence=text(meta.LicenseShortName&&meta.LicenseShortName.value);
      if(!artist||!licence)continue;
      return{url:url,title:text(page.title).replace(/^File:/,''),credit:artist+' · '+licence,source:source.href};
    }
    throw new Error('No approved daily image host and attribution found');
  }
  function day(date){return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');}
  function validBlob(blob){return blob&&blob.size>0&&blob.size<=LIMIT&&/^image\/(jpeg|png|webp)$/.test(blob.type);}
  function create(fetcher,cache,clock){
    var memory=null,inflight=null,lastAttempt=0;clock=clock||function(){return new Date();};
    async function request(url,kind){
      var controller=typeof AbortController==='function'?new AbortController():null,timer;
      var deadline=new Promise(function(resolve,reject){timer=setTimeout(function(){if(controller)controller.abort();reject(new Error('Daily photograph request timed out'));},8000);});
      try{return await Promise.race([(async function(){
        var response=await fetcher(url,{credentials:'omit',referrerPolicy:'no-referrer',redirect:'error',signal:controller?controller.signal:undefined});
        if(!response.ok)throw new Error('Daily photograph request failed ('+response.status+')');
        if(kind==='json')return response.json();
        var length=response.headers&&Number(response.headers.get('content-length'));
        if(length>LIMIT)throw new Error('Daily photograph image is too large');
        if(response.body&&response.body.getReader){
          var reader=response.body.getReader(),chunks=[],size=0;
          try{while(true){var part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>LIMIT){await reader.cancel();throw new Error('Daily photograph image is too large');}chunks.push(part.value);}}
          finally{reader.releaseLock();}
          return new Blob(chunks,{type:(response.headers.get('content-type')||'').split(';')[0].toLowerCase()});
        }
        return response.blob();
      })(),deadline]);}finally{clearTimeout(timer);}
    }
    async function load(){
      var now=clock(),today=day(now);if(memory&&(memory.day===today||lastAttempt&&now.getTime()-lastAttempt<30*60*1000))return memory;
      if(inflight)return inflight;
      inflight=(async function(){
        var saved=null;try{saved=await cache.read();}catch(e){}
        var usable=saved&&validBlob(saved.blob)&&Number.isFinite(saved.at)&&now.getTime()>=saved.at&&now.getTime()-saved.at<MAX_AGE;
        if(usable&&saved.day===today){memory=Object.assign({},saved,{cached:true});return memory;}
        try{
          lastAttempt=now.getTime();
          var url='https://commons.wikimedia.org/w/api.php?action=query&generator=images&titles='+encodeURIComponent('Template:Potd/'+today)+'&prop=imageinfo&iiprop=url%7Cextmetadata&iiurlwidth=3840&format=json&origin=*';
          var item=photo(await request(url,'json')),blob=await request(item.url,'blob');
          if(!validBlob(blob))throw new Error('Daily photograph image size or type is unsupported');
          var record={day:today,at:now.getTime(),blob:blob,title:item.title,credit:item.credit,source:item.source};
          try{await cache.write(record);}catch(e){}memory=Object.assign({},record,{cached:false});return memory;
        }catch(e){if(usable){memory=Object.assign({},saved,{cached:true});return memory;}throw e;}
      })();
      try{return await inflight;}finally{inflight=null;}
    }
    return{load:load};
  }
  var dbOpenings=new WeakMap();
  function legacyRecord(value){
    if(!value||!validBlob(value.blob)||!text(value.credit))return null;
    try{var u=new URL(value.source);if(u.protocol!=='https:'||u.hostname!=='commons.wikimedia.org'||u.username||u.password||u.port&&u.port!=='443')return null;}catch(e){return null;}
    var credit=text(value.credit),licence=credit.match(/CC BY(?:-SA)? [0-9.]+|CC0(?: [0-9.]+)?|Public domain/i);
    return Object.assign({},value,{id:'legacy-daily',legacy:true,title:text(value.title)||'Previously saved photograph',credit:credit,author:credit,license:licence?licence[0]:'See original credit',licenseUrl:value.source,source:value.source,topics:['scenery'],at:Number.isFinite(value.at)?value.at:0});
  }
  function openLibrary(indexedDB){
    if(!indexedDB)return Promise.reject(Error('Local wallpaper storage unavailable'));
    if(dbOpenings.has(indexedDB))return dbOpenings.get(indexedDB);
    var pending=new Promise(function(resolve,reject){var done=false,request=indexedDB.open('cinematic-tv-wallpaper',2),timer=setTimeout(function(){done=true;reject(Error('Wallpaper storage timed out'));},3000);
      request.onupgradeneeded=function(){var db=request.result,tx=request.transaction;
        if(!db.objectStoreNames.contains('images'))db.createObjectStore('images');
        if(!db.objectStoreNames.contains('library'))db.createObjectStore('library',{keyPath:'id'});
        if(!db.objectStoreNames.contains('meta'))db.createObjectStore('meta');
        var old=tx.objectStore('images').get('daily');old.onsuccess=function(){var record=legacyRecord(old.result);if(record){tx.objectStore('library').put(record);tx.objectStore('meta').put({current:record.id,history:[record.id]},'state');tx.objectStore('images').delete('daily');}};
      };
      request.onsuccess=function(){clearTimeout(timer);if(done){request.result.close();return;}done=true;var db=request.result;db.onversionchange=function(){db.close();dbOpenings.delete(indexedDB);};resolve(db);};
      request.onerror=request.onblocked=function(){clearTimeout(timer);if(done)return;done=true;reject(request.error||Error('Wallpaper storage unavailable'));};
    });dbOpenings.set(indexedDB,pending);pending.catch(function(){if(dbOpenings.get(indexedDB)===pending)dbOpenings.delete(indexedDB);});return pending;
  }
  function browserCache(indexedDB){return{
    read:async function(){var db=await openLibrary(indexedDB);return new Promise(function(resolve,reject){var req=db.transaction('library').objectStore('library').get('legacy-daily');req.onsuccess=function(){resolve(req.result||null);};req.onerror=function(){reject(req.error);};});},
    write:async function(value){var record=legacyRecord(value);if(!record)throw Error('Invalid saved photograph');return browserCacheV2(indexedDB).commit(record,['legacy-daily']);}
  };}
  function retained(rows,protectedIds){
    var bytes=0,kept=[],seen=Object.create(null);protectedIds=protectedIds||[];
    rows.slice().sort(function(a,b){return Number(protectedIds.indexOf(b.id)>=0)-Number(protectedIds.indexOf(a.id)>=0)||(b.at||0)-(a.at||0);}).forEach(function(r){
      var size=r.blob&&r.blob.size||0,total=size+(r.boot?r.boot.size:0)+(r.bootBytes||0);if(!size||size>LIMIT)throw Error('Wallpaper image exceeds cache limit');
      if(seen[r.id])return;seen[r.id]=true;
      if(kept.length<6&&bytes+total<=24*1024*1024){kept.push(r);bytes+=total;}
      else if(protectedIds.indexOf(r.id)>=0)throw Error('Protected wallpapers exceed cache limit');
    });return kept;
  }
  async function download(record,fetcher,signal){
    if(!allowedImage(record.url))throw Error('Wallpaper host unavailable');
    var controller=new AbortController(),timer=setTimeout(function(){controller.abort();},10000);
    function abort(){controller.abort();}if(signal){if(signal.aborted)abort();else signal.addEventListener('abort',abort);}
    try{
      var response=await fetcher(record.url,{credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',signal:controller.signal});
      if(!response.ok||response.redirected||response.url&&!allowedImage(response.url))throw Error('Wallpaper request failed');
      var mime=(response.headers.get('content-type')||'').split(';')[0].toLowerCase();if(mime!=='image/jpeg')throw Error('Unsupported image type');
      if(Number(response.headers.get('content-length'))>LIMIT)throw Error('Wallpaper image too large');
      var blob;
      if(response.body&&response.body.getReader){var reader=response.body.getReader(),chunks=[],size=0;
        try{while(true){var part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>LIMIT){await reader.cancel();throw Error('Wallpaper image too large');}chunks.push(part.value);}}finally{reader.releaseLock();}
        blob=new Blob(chunks,{type:mime});
      }else blob=await response.blob();
      if(!validBlob(blob))throw Error('Wallpaper image size unsupported');var head=new Uint8Array(await blob.slice(0,3).arrayBuffer());
      if(head[0]!==255||head[1]!==216||head[2]!==255)throw Error('Invalid image signature');return blob;
    }finally{clearTimeout(timer);if(signal)signal.removeEventListener('abort',abort);}
  }
  async function catalogueData(fetcher,url){
    if(url!=='assets/wallpapers/catalogue.json'&&!/^https:\/\/api\.github\.com\/repos\/Willzy12h\/Code\/contents\/cinematic-tv\/src\/assets\/wallpapers\/catalogue\.json\?ref=gpt%2Fcinematic-tv-v0\.4\.0$/.test(url))throw Error('Catalogue source host unsupported');
    var controller=new AbortController(),timer=setTimeout(function(){controller.abort();},8000),limit=512*1024;
    try{var response=await fetcher(url,{credentials:'omit',redirect:'error',signal:controller.signal});if(!response.ok||response.redirected)throw Error('Catalogue request failed');
      if(Number(response.headers.get('content-length'))>limit)throw Error('Catalogue too large');
      var text;
      if(response.body&&response.body.getReader){var reader=response.body.getReader(),chunks=[],size=0;
        try{while(true){var part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>limit){await reader.cancel();throw Error('Catalogue too large');}chunks.push(part.value);}}finally{reader.releaseLock();}
        text=await new Blob(chunks).text();
      }else{text=await response.text();if(text.length>limit)throw Error('Catalogue too large');}
      return JSON.parse(text);
    }finally{clearTimeout(timer);}
  }
  function browserCacheV2(indexedDB){
    function open(){return openLibrary(indexedDB);}
    async function readAll(){var db=await open();return new Promise(function(resolve,reject){var req=db.transaction('library').objectStore('library').getAll();req.onsuccess=function(){resolve(req.result.filter(function(r){return r&&validBlob(r.blob)&&typeof r.id==='string';}));};req.onerror=function(){reject(req.error);};});}
    return{readAll:readAll,
      commit:async function(record,protectedIds){var db=await open();return new Promise(function(resolve,reject){
        var tx=db.transaction('library','readwrite'),store=tx.objectStore('library'),req=store.getAll();
        req.onsuccess=function(){try{var rows=retained(req.result.filter(function(r){return r.id!==record.id&&validBlob(r.blob);}).concat([record]),(protectedIds||[]).concat([record.id]));store.clear();rows.forEach(function(r){store.put(r);});}catch(e){tx.abort();reject(e);}};
        tx.oncomplete=function(){resolve();};tx.onerror=tx.onabort=function(){reject(tx.error||Error('Wallpaper cache write aborted'));};
      });},
      touch:async function(id,at){var db=await open();return new Promise(function(resolve,reject){var tx=db.transaction('library','readwrite'),store=tx.objectStore('library'),req=store.get(id);req.onsuccess=function(){if(req.result){var value=req.result;value.at=at;store.put(value);}};tx.oncomplete=function(){resolve();};tx.onerror=tx.onabort=function(){reject(tx.error);};});},
      getMeta:async function(){var db=await open();return new Promise(function(resolve,reject){var req=db.transaction('meta').objectStore('meta').get('state');req.onsuccess=function(){resolve(req.result||{});};req.onerror=function(){reject(req.error);};});},
      setMeta:async function(value){var db=await open();return new Promise(function(resolve,reject){var tx=db.transaction('meta','readwrite');tx.objectStore('meta').put(value,'state');tx.oncomplete=function(){resolve();};tx.onerror=tx.onabort=function(){reject(tx.error);};});},
      clearDownloaded:async function(){var db=await open();return new Promise(function(resolve,reject){var tx=db.transaction('library','readwrite');tx.objectStore('library').clear();tx.oncomplete=function(){resolve();};tx.onerror=tx.onabort=function(){reject(tx.error);};});},
      usage:async function(){var rows=await readAll();return{count:rows.length,bytes:rows.reduce(function(n,r){return n+r.blob.size+(r.boot?r.boot.size:0)+(r.bootBytes||0);},0)};}
    };
  }
  return{legacyRecord:legacyRecord,catalogueData:catalogueData,create:create,browserCache:browserCache,photo:photo,retained:retained,download:download,browserCacheV2:browserCacheV2};
}));
