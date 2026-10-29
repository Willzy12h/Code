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
  function browserCache(indexedDB){
    var opened=null;
    function open(){
      if(opened)return opened;
      opened=new Promise(function(resolve,reject){
        if(!indexedDB){reject(new Error('Local image cache unavailable'));return;}
        var request=indexedDB.open('cinematic-tv-wallpaper',1);
        request.onupgradeneeded=function(){request.result.createObjectStore('images');};
        request.onsuccess=function(){resolve(request.result);};request.onerror=function(){reject(request.error||new Error('Local image cache failed'));};request.onblocked=function(){reject(new Error('Local image cache is busy'));};
      });return opened;
    }
    return{
      read:async function(){var db=await open();return new Promise(function(resolve,reject){var request=db.transaction('images','readonly').objectStore('images').get('daily');request.onsuccess=function(){resolve(request.result||null);};request.onerror=function(){reject(request.error);};});},
      write:async function(value){var db=await open();return new Promise(function(resolve,reject){var transaction=db.transaction('images','readwrite');transaction.objectStore('images').put(value,'daily');transaction.oncomplete=function(){resolve();};transaction.onerror=function(){reject(transaction.error);};transaction.onabort=function(){reject(transaction.error);};});}
    };
  }
  return{create:create,browserCache:browserCache,photo:photo};
}));
