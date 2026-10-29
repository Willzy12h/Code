/* Experimental, opt-in foreground return. No Home registration or source changes. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.LauncherReturn=factory();}(typeof window!=='undefined'?window:this,function(){
 'use strict';
 function create(env){
  var enabled=false,paused=false,error='',homeSince=null,pendingAt=null,lastLaunch=-Infinity,attempts=[],checks=0,lastScreen='Not checked',lastCheck=0;
  function stop(){if(env.stop)env.stop();}
  function disable(reason){enabled=false;paused=false;pendingAt=null;homeSince=null;error=reason||'';stop();if(reason&&env.fault)env.fault(error);}
  function enable(){enabled=true;paused=false;error='';homeSince=null;pendingAt=null;attempts=[],checks=0,lastScreen='Not checked',lastCheck=0;lastLaunch=-Infinity;}
  function pause(){paused=true;homeSince=null;pendingAt=null;stop();}
  function resume(){if(enabled&&paused){paused=false;homeSince=null;}}
  function tick(){
   if(!enabled||paused)return;
   var now=env.now();
   if(!env.hidden()){homeSince=null;pendingAt=null;attempts=[];return;}
   if(pendingAt!==null){if(now-pendingAt>5000)disable('Return timed out; disabled for safety');return;}
   var id;try{id=env.foreground();checks++;lastCheck=now;lastScreen=id==='com.samsung.tv.csfs'?'Samsung Home':id?'Other app or input':'No foreground';}catch(e){disable('Foreground query failed; return disabled');return;}
   // Never bring the launcher over an app, input viewer, settings, or unknown screen.
   if(id!=='com.samsung.tv.csfs'){homeSince=null;return;}
   if(homeSince===null){homeSince=now;return;}
   if(now-homeSince<350||now-lastLaunch<5000)return;
   attempts=attempts.filter(function(t){return now-t<60000;});
   if(attempts.length>=3){disable('Repeated return attempts; disabled for safety');return;}
   attempts.push(now);lastLaunch=now;pendingAt=now;homeSince=null;
   try{env.launch(function(){pendingAt=null;if(env.log)env.log('Return request accepted');},function(){disable('Return launch failed; disabled for safety');});}
   catch(e){disable('Return launch failed; disabled for safety');}
  }
  return{enable:enable,disable:disable,pause:pause,resume:resume,tick:tick,status:function(){return{enabled:enabled,paused:paused,error:error,pending:pendingAt!==null,attempts:attempts.length,checks:checks,lastScreen:lastScreen,lastCheck:lastCheck};}};
 }
 return{create:create};
}));
