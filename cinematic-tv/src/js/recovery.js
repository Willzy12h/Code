/* Minimal independent startup guard. Does not touch television settings or sources. */
(function(w,doc){
  'use strict';
  var KEY='cinematic-tv-boot',previous=null,count=1;
  try{previous=JSON.parse(w.localStorage.getItem(KEY)||'null');if(previous&&previous.ready===false)count=Math.min(3,(Number(previous.count)||0)+1);w.localStorage.setItem(KEY,JSON.stringify({ready:false,count:count}));}catch(e){}
  function rescue(){
    var banner=doc.getElementById('recovery-banner');if(banner)return;
    banner=doc.createElement('section');banner.id='recovery-banner';banner.setAttribute('role','alert');
    var text=doc.createElement('p');text.textContent='Cinematic TV encountered a problem. Samsung Home and Settings remain available.';banner.appendChild(text);
    var button=doc.createElement('button');button.textContent='Restart with safe launcher settings';button.onclick=function(){
      try{var state=JSON.parse(w.localStorage.getItem('cinematic-tv-v1')||'{}');state.previewMode='off';state.wallpaper='scenic';state.showWeather=false;state.reducedEffects=true;w.localStorage.setItem('cinematic-tv-v1',JSON.stringify(state));}catch(e){}
      w.location.reload();
    };banner.appendChild(button);doc.body.appendChild(banner);button.focus();
  }
  var errors=0;
  w.addEventListener('error',function(e){if(e.message&&++errors>=2)rescue();});
  w.addEventListener('unhandledrejection',function(){if(++errors>=2)rescue();});
  w.LauncherRecovery={safe:count>=2,ready:function(){try{w.localStorage.setItem(KEY,JSON.stringify({ready:true,count:0}));}catch(e){}},rescue:rescue};
})(window,document);
