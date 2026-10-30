/* Versioned data only. Remote catalogue records never become executable markup. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.LauncherWallpaperCatalogue=factory();}(typeof window!=='undefined'?window:this,function(){
 'use strict';var TOPICS=['scenery','cities','architecture','abstract','contemporary'];
 function safe(value,max){return typeof value==='string'&&value.length>0&&value.length<=(max||500)&&!/[<>\u0000-\u001f]/.test(value);}
 function url(value,hosts){try{var u=new URL(value);return safe(value,2000)&&u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&hosts.indexOf(u.hostname)>=0;}catch(e){return false;}}
 function validate(raw){
  if(!raw||raw.version!==1||!Array.isArray(raw.images)||!raw.images.length||raw.images.length>60)throw Error('Unsupported wallpaper catalogue');
  var seen=Object.create(null),images=raw.images.map(function(r){
   if(!r||!safe(r.id,100)||!/^[a-z0-9-]+$/.test(r.id)||seen[r.id]||!url(r.url,['upload.wikimedia.org','thumb.wikimedia.org'])||!url(r.source,['commons.wikimedia.org'])||!url(r.licenseUrl,['creativecommons.org','commons.wikimedia.org'])||!safe(r.author)||!safe(r.license,100)||r.mime!=='image/jpeg'||!Number.isFinite(r.width)||!Number.isFinite(r.height)||r.width<3840||r.height<2160||r.width>50000||r.height>50000||!Array.isArray(r.topics)||!r.topics.length||r.topics.some(function(t){return TOPICS.indexOf(t)<0;}))throw Error('Invalid wallpaper record');
   seen[r.id]=true;return{id:r.id,url:r.url,source:r.source,width:r.width,height:r.height,mime:r.mime,topics:r.topics.slice(0,5),author:r.author,license:r.license,licenseUrl:r.licenseUrl,title:safe(r.title,250)?r.title:r.id,bundled:/^assets\/wallpaper(?:-twilight|-dawn)?\.jpg$/.test(r.bundled||'')?r.bundled:''};
  });return{version:1,images:images};
 }
 function candidates(catalogue,topics,recentIds){return catalogue.images.filter(function(r){return r.topics.some(function(t){return topics.indexOf(t)>=0;});}).sort(function(a,b){return recentIds.lastIndexOf(a.id)-recentIds.lastIndexOf(b.id);});}
 return{validate:validate,candidates:candidates,TOPICS:TOPICS};
}));
