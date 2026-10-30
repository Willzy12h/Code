/* Corrective publisher artwork is pinned locally; all other apps retain installed metadata. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.LauncherAppArtwork=factory();}(typeof window!=='undefined'?window:this,function(){
 'use strict';
 var publisher={"YouTube": "assets/brands/youtube.png", "Prime Video": "assets/brands/prime-video.png", "BBC iPlayer": "assets/brands/bbc-iplayer.png", "BBC Sounds": "assets/brands/bbc-sounds.png", "Channel 4": "assets/brands/channel-4.png", "SmartThings": "assets/brands/smartthings.png", "Samsung Health": "assets/brands/samsung-health.png"};
 function choice(item){
  if(Object.prototype.hasOwnProperty.call(publisher,item.name))return{kind:'publisher',source:publisher[item.name],label:String(item.name)};
  var source=typeof item.icon==='string'?item.icon:'',valid=false;
  if(source.length<4096&&!/[\u0000-\u001f<>"']/.test(source)){
   if(/^\/(?:opt|usr|home)\//.test(source)||/^(?:file|wgt):\//i.test(source)||/^data:image\/(?:png|jpeg|webp|svg\+xml)[;,]/i.test(source))valid=true;
   else try{var u=new URL(source);valid=u.protocol==='https:'&&!u.username&&!u.password;}catch(e){}
  }
  return{kind:valid?'native':'name',source:valid?source:'',label:String(item.name||'Application')};
 }
 function fit(width,height){return Number.isFinite(width)&&Number.isFinite(height)&&width>0&&height>0&&width<=8192&&height<=8192?width/height:null;}
 return{choice:choice,fit:fit};
}));
