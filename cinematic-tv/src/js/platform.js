/* Cinematic TV: isolated public Tizen APIs. No Samsung Home/Settings key interception. */
(function (w) {
  'use strict';
  var t = w.tizen, isTV = !!(t && t.application), iconCache = {};
  function error(cb, e) { if (typeof cb === 'function') cb(e && e.message ? e.message : String(e || 'Unsupported on this TV')); }
  function fitVideoRect(rect,resolution){
    if(!Array.isArray(rect)||rect.length!==4||rect.some(function(v){return !/^-?\d+(?:\.\d+)?(?:px|%)?$/.test(String(v));}))return rect;
    var percent=rect.every(function(v){return String(v).endsWith('%');}),r=rect.map(function(v,i){return parseFloat(v)*(percent?(i%2?(w.innerHeight||1080):(w.innerWidth||1920))/100:1);}),ratio=16/9;
    if(resolution){
      if(resolution.aspectRatio==='ASPECT_RATIO_4x3')ratio=4/3;
      else if(resolution.aspectRatio==='ASPECT_RATIO_16x9')ratio=16/9;
      else if(Number(resolution.width)>0&&Number(resolution.height)>0)ratio=resolution.width/resolution.height;
    }
    if(!Number.isFinite(ratio)||ratio<.25||ratio>5||r[2]<=0||r[3]<=0)return rect;
    var width=Math.min(r[2],r[3]*ratio),height=width/ratio;
    return [r[0]+(r[2]-width)/2,r[1]+(r[3]-height)/2,width,height].map(function(n,i){return percent?(n/(i%2?(w.innerHeight||1080):(w.innerWidth||1920))*100).toFixed(5)+'%':Math.round(n)+'px';});
  }
  function sameSource(a, b) { return !!(a && b && a.type === b.type && Number(a.number) === Number(b.number)); }

  /* One owner for the native plane. A timeout is uncertainty, not cancellation:
   * quarantine further source commands until the native callback and cleanup settle. */
  function createVideoController(tv) {
    var generation=0, tail=Promise.resolve(), owner='none', visible=false;
    var originalSource=null, previewSource=null, lastError='', lastOperation='Idle';
    var blocked=false, pending=0, timeoutMs=2400;
    function enqueue(job) { var task=tail.catch(function(){}).then(job); tail=task.catch(function(){}); return task; }
    function failed(e) { lastError=e&&e.message?e.message:String(e);lastOperation='Video recovery required';blocked=true; }
    function lateRecovery() {
      enqueue(async function(){
        if(pending)return false;
        try { await finishOwned();return true; } catch(e){failed(e);return false;}
      });
    }
    function invoke(kind,start) {
      return new Promise(function(resolve,reject){
        var settled=false,timedOut=false;pending++;
        var timer=setTimeout(function(){
          if(settled)return;settled=true;timedOut=true;
          var e=new Error('HDMI '+kind+' timed out; native completion is unknown');failed(e);reject(e);
        },timeoutMs);
        function complete(e) {
          // Some firmware emits a callback twice. Only the first owns this operation.
          if(complete.done)return;complete.done=true;pending--;clearTimeout(timer);
          if(!e&&kind==='show')visible=true;
          if(!e&&kind==='hide')visible=false;
          if(timedOut){lateRecovery();return;}
          if(settled)return;settled=true;if(e)reject(e);else resolve();
        }
        try {start(function(){complete();},function(e){complete(e||new Error('HDMI '+kind+' failed'));});}
        catch(e){complete(e);}
      });
    }
    function setSource(s){return invoke('source change',function(ok,fail){tv.setSource(s,ok,fail,'MAIN');});}
    function show(rect){
      var resolution=null;try{if(tv.getVideoResolution)resolution=tv.getVideoResolution('MAIN');}catch(e){}
      var fitted=fitVideoRect(rect,resolution);
      return invoke('show',function(ok,fail){tv.show(ok,fail,fitted,'MAIN','FRONT');});
    }
    function hide(){return invoke('hide',function(ok,fail){tv.hide(ok,fail,'MAIN');});}
    async function finishOwned() {
      if(pending)throw new Error('Native HDMI callback still pending; use Samsung Sources to recover');
      if(owner==='none'&&!originalSource&&!visible)return;
      var failure=null;
      if(visible){try{await hide();}catch(e){failure=e;}}
      if(originalSource&&!pending){
        try{
          var current=tv.getSource('MAIN');
          // Source identity is the best public-API ownership signal, not proof that
          // another application did not also select this same source.
          if(sameSource(current,previewSource)&&!sameSource(current,originalSource))await setSource(originalSource);
        }catch(e){failure=failure||e;}
      }
      if(failure){failed(failure);throw failure;}
      owner='none';originalSource=null;previewSource=null;
    }
    function valid(source){return source && (source.type==='HDMI'||source.type==='TV') && Number.isInteger(Number(source.number)) && Number(source.number)>=0;}
    function guard(fail){if(!tv||blocked||pending){error(fail,!tv?'HDMI API unavailable':'HDMI recovery required; preview is suspended');return false;}return true;}
    function preview(source,rect,ok,fail,currentOnly){
      var token=++generation;
      if(!valid(source)||!Array.isArray(rect)||rect.length!==4){error(fail,'HDMI preview requires a valid source and rectangle');return Promise.resolve(false);}
      return enqueue(async function(){
        if(token!==generation||!guard(fail))return false;
        if(owner==='fullscreen'){error(fail,'Close fullscreen input first');return false;}
        try{
          if(currentOnly&&!sameSource(tv.getSource('MAIN'),source))throw new Error('Current source changed; PC preview is paused');
          if(owner!=='preview'){
            originalSource=tv.getSource('MAIN');if(!originalSource)throw new Error('Cannot establish original source');owner='preview';
          }
          if(visible)await hide();
          if(token!==generation)return false;
          previewSource=source;lastOperation='Changing preview source';
          // Avoid retriggering the active HDMI source and its signal handshake.
          if(!sameSource(tv.getSource('MAIN'),source)){
            if(currentOnly)throw new Error('Current source changed; PC preview is paused');
            await setSource(source);
          }
          if(token!==generation)return false;
          lastOperation='Displaying HDMI thumbnail';await show(rect);
          if(token!==generation)return false;
          lastOperation='HDMI preview active';lastError='';if(ok)ok();return true;
        }catch(e){
          lastError=e.message||String(e);lastOperation='Preview unavailable';if(token===generation)error(fail,e);
          if(!pending)try{await finishOwned();}catch(cleanup){failed(cleanup);}
          return false;
        }
      });
    }
    function stopPreview(){
      ++generation;if(!tv)return Promise.resolve(true);
      return enqueue(async function(){
        if(owner==='fullscreen')return true;
        if(pending)return false;
        try{await finishOwned();lastOperation=blocked?'Preview suspended after native error':'Preview stopped';return !blocked;}
        catch(e){failed(e);return false;}
      });
    }
    function openFullscreen(source,ok,fail){
      var token=++generation;
      if(!valid(source)){error(fail,'HDMI source unavailable');return Promise.resolve(false);}
      return enqueue(async function(){
        if(token!==generation||!guard(fail))return false;
        try{
          await finishOwned();if(token!==generation)return false;
          originalSource=tv.getSource('MAIN');if(!originalSource)throw new Error('Cannot establish original source');
          previewSource=source;owner='fullscreen-pending';lastOperation='Opening HDMI input';
          await setSource(source);if(token!==generation)return false;
          await show(['0px','0px',(w.innerWidth||1920)+'px',(w.innerHeight||1080)+'px']);if(token!==generation)return false;
          owner='fullscreen';originalSource=null;lastOperation='Fullscreen HDMI';lastError='';if(ok)ok();return true;
        }catch(e){
          lastError=e.message||String(e);lastOperation='Fullscreen HDMI failed';if(token===generation)error(fail,e);
          if(!pending)try{await finishOwned();}catch(cleanup){failed(cleanup);}
          return false;
        }
      });
    }
    function leaveFullscreen(){
      ++generation;if(!tv)return Promise.resolve(true);
      return enqueue(async function(){
        if(owner!=='fullscreen'&&owner!=='fullscreen-pending')return !blocked;
        if(pending)return false;
        try{await finishOwned();lastOperation='Fullscreen HDMI closed';return !blocked;}
        catch(e){failed(e);return false;}
      });
    }
    function reset(){
      ++generation;if(!tv)return Promise.resolve(false);
      return enqueue(async function(){
        if(pending)return false;
        try{await finishOwned();blocked=false;lastError='';lastOperation='Video recovery completed';return true;}
        catch(e){failed(e);return false;}
      });
    }
    function status(){return{owner:owner,visible:visible,operation:lastOperation,lastError:lastError,sourceSaved:!!originalSource,blocked:blocked,pending:pending};}
    return{preview:preview,stopPreview:stopPreview,openFullscreen:openFullscreen,leaveFullscreen:leaveFullscreen,reset:reset,status:status};
  }

  function readWithTimeout(start,ok,fail,label){
    var settled=false,timer=setTimeout(function(){if(settled)return;settled=true;error(fail,label+' timed out; cached information retained');},4000);
    function success(value){if(settled)return;settled=true;clearTimeout(timer);ok(value);}
    function failure(e){if(settled)return;settled=true;clearTimeout(timer);error(fail,e);}
    try{start(success,failure);}catch(e){failure(e);}
  }
  function launchApp(id,ok,fail){
    if(!isTV){error(fail,'Apps only launch on the Samsung TV');return;}
    var settled=false,fallback=false;
    function accepted(){if(settled)return;settled=true;if(ok)ok();}
    function rejected(e){
      if(settled)return;
      if(!fallback&&e&&/^(NotSupportedError|NotFoundError|UnknownError)$/.test(e.name)&&t.ApplicationControl&&t.application.launchAppControl){
        fallback=true;
        try{t.application.launchAppControl(new t.ApplicationControl('http://tizen.org/appcontrol/operation/default',null,null,null,null,'SINGLE'),id,accepted,rejected);return;}catch(next){e=next;}
      }
      settled=true;error(fail,e);
    }
    try{t.application.launch(id,accepted,rejected);}catch(e){rejected(e);}
  }
  var video = createVideoController(isTV && t.tvwindow ? t.tvwindow : null);
  var P = {
    isTV:isTV,
    fitVideoRect:fitVideoRect,
    currentId:function () { try { return t.application.getAppInfo().id; } catch (e) { return ''; } },
    getApps:function (ok, fail) { if (!isTV) { ok(P.demoApps()); return; }
      readWithTimeout(function(done,reject){t.application.getAppsInfo(function(raw){
        // WebIDL metadata may live on prototype getters; JSON.stringify(raw) can lose it.
        var apps=[];(Array.isArray(raw)?raw:[]).slice(0,1000).forEach(function(a){
          try{if(a&&typeof a.id==='string')apps.push({id:a.id,name:typeof a.name==='string'?a.name:'',iconPath:typeof a.iconPath==='string'?a.iconPath:'',show:a.show===true,packageId:typeof a.packageId==='string'?a.packageId:'',categories:Array.isArray(a.categories)?a.categories.filter(function(c){return typeof c==='string';}).slice(0,20):[]});}catch(e){}
        });done(apps);
      },reject);},ok,fail,'Application discovery'); },
    // Samsung's SDK script is local to the TV. This optional query is undocumented;
    // feature-detect it and fail closed rather than guessing a foreground app.
    prepareReturn:function(){
      function available(){return !!(w.webapis&&w.webapis.appcommon&&typeof w.webapis.appcommon.getForegroundAppId==='function');}
      if(available())return Promise.resolve(true);
      if(!isTV)return Promise.resolve(false);
      return new Promise(function(resolve){var script=document.createElement('script'),done=false;
        var timer=setTimeout(function(){finish(false);},3000);
        function finish(ok){if(done)return;done=true;clearTimeout(timer);script.onload=script.onerror=null;resolve(ok);}
        script.onload=function(){finish(available());};script.onerror=function(){finish(false);};
        script.src='$WEBAPIS/webapis/webapis.js';document.head.appendChild(script);
      });
    },
    foregroundId:function(){return w.webapis.appcommon.getForegroundAppId();},
    launch:launchApp,
    listInputs:function (ok, fail) { if (!isTV) { ok(P.demoInputs()); return; }
      readWithTimeout(function(done,reject){t.systeminfo.getPropertyValue('VIDEOSOURCE',done,reject);},ok,fail,'Input discovery'); },
    watchApps:function(cb){
      if(!isTV||!t.package||!t.package.setPackageInfoEventListener)return function(){};
      try{t.package.setPackageInfoEventListener({oninstalled:cb,onupdated:cb,onuninstalled:cb});return function(){try{t.package.unsetPackageInfoEventListener();}catch(e){}};}
      catch(e){return function(){};}
    },
    watchInputs:function (cb) { if (!isTV) return function () {};
      try { var id = t.systeminfo.addPropertyValueChangeListener('VIDEOSOURCE', cb); return function () { try { t.systeminfo.removePropertyValueChangeListener(id); } catch (e) {} }; }
      catch (e) { return function () {}; } },
    resolveIcon:function (path, cb) { if (!path) { cb(''); return; } if (iconCache[path] !== undefined) { cb(iconCache[path]); return; }
      if (!isTV || /^(https?:|data:|file:|wgt:)/i.test(path)) { iconCache[path] = path; cb(path); return; }
      if (!t.filesystem || !t.filesystem.resolve) { cb(path); return; }
      var done = false, timer = setTimeout(function () { if (!done) { done = true; cb(path); } }, 1100);
      try { t.filesystem.resolve(path, function (f) { if (done) return; done = true; clearTimeout(timer); var value = f.toURI(); iconCache[path] = value; cb(value); },
        function () { if (done) return; done = true; clearTimeout(timer); cb(path); }, 'r'); }
      catch (e) { if (!done) { done = true; clearTimeout(timer); cb(path); } }
    },
    preview:function (source, rect, ok, fail, currentOnly) { return video.preview(source, rect, ok, fail, currentOnly); },
    stopPreview:function () { return video.stopPreview(); },
    showInputFullscreen:function (source, ok, fail) { return video.openFullscreen(source, ok, fail); },
    leaveFullscreen:function () { return video.leaveFullscreen(); },
    videoStatus:function () { return video.status(); },
    resetVideo:function () { return video.reset(); },
    currentSource:function () { try{return t.tvwindow.getSource('MAIN');}catch(e){return null;} },
    exit:function () { if (!isTV) return; try { t.application.getCurrentApplication().exit(); } catch (e) {} },
    demoApps:function () { return ['YouTube','Crunchyroll','Apple TV','Netflix','Paramount+','Disney+','Prime Video','Hue Sync','BBC iPlayer','ITVX','Channel 4','5','Spotify','Plex','Twitch','SmartThings','Samsung Health'].map(function (n,i) { return {id:'demo.' + i,name:n,show:true}; }); },
    demoInputs:function () { return {connected:[{type:'HDMI',number:1,editName:'PC'}],disconnected:[{type:'HDMI',number:2},{type:'HDMI',number:3},{type:'HDMI',number:4}]}; },
    diagnostics:function () { return {mode:isTV?'Tizen TV':'Browser demonstration',appDiscovery:!!(isTV&&t.application&&t.application.getAppsInfo),inputs:!!(isTV&&t.systeminfo),hdmiPreview:!!(isTV&&t.tvwindow),fileSystem:!!(isTV&&t.filesystem),video:video.status()}; }
  };
  w.LauncherPlatform = P;
})(window);
