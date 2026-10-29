'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../src/js/model.js');

test('catalogue excludes hidden, unknown-visibility and observed background/system helpers',()=>{
 const raw=[
  {id:'user.good',name:'Personal App',show:true},
  {id:'user.hidden',name:'Hidden app',show:false},
  {id:'user.unknown',name:'Unknown app'},
  {id:'OGLLvqej7u.service',name:'service',show:true},
  {id:'MCmYXNxgcu.DisneyPlusService',name:'DisneyPlusPreviewService',show:true},
  {id:'com.samsung.tv.cobalt-app-1566',name:'YouTubeTestSuite',show:true},
  {id:'org.tizen.volume',name:'Volume',show:true}
 ];
 assert.deepEqual(M.catalogue(raw).map(x=>x.nativeId),['user.good']);
});
test('known-brand duplicates prefer installed wrapper without aliasing Kids or helper titles',()=>{
 const raw=[
  {id:'com.samsung.tv.cobalt-yt',name:'Youtube',show:true,iconPath:'/native/wrong.png'},
  {id:'9Ur5IzDKqV.TizenYouTube',name:'YouTube',show:true,iconPath:'/installed/youtube.png'},
  {id:'user.kids',name:'YouTube Kids',show:true,iconPath:'/installed/kids.png'},
  {id:'user.helper',name:'Netflix Helper',show:true}
 ];
 const apps=M.catalogue(raw);
 assert.equal(apps.filter(x=>x.name==='YouTube').length,1);
 assert.equal(apps.find(x=>x.name==='YouTube').nativeId,'9Ur5IzDKqV.TizenYouTube');
 assert.equal(apps.find(x=>x.name==='YouTube').icon,'/installed/youtube.png');
 assert.ok(apps.some(x=>x.name==='YouTube Kids'));
 assert.ok(apps.some(x=>x.name==='Netflix Helper'));
});

test('catalogue refresh migrates an existing native YouTube pin to its visible installed wrapper',()=>{
 assert.equal(typeof M.remapCatalogueIds,'function');
 const raw=[{id:'com.samsung.tv.cobalt-yt',name:'Youtube',show:true},{id:'9Ur5IzDKqV.TizenYouTube',name:'YouTube',show:true}];
 const next=M.catalogue(raw);
 assert.deepEqual(M.remapCatalogueIds(['app:com.samsung.tv.cobalt-yt','input:HDMI:1','app:9Ur5IzDKqV.TizenYouTube'],raw,next),['app:9Ur5IzDKqV.TizenYouTube','input:HDMI:1']);
});

test('PC focus follows the explicitly chosen port even when another input is also named PC',()=>{
 const inputs=[{id:'input:HDMI:1',kind:'input',port:'HDMI 1',name:'PC',connected:true},{id:'input:HDMI:2',kind:'input',port:'HDMI 2',name:'PC',connected:true}];
 assert.equal(M.defaultSelection('pc',[],inputs,[],{},'HDMI 2'),'input:HDMI:2');
});


test('consumer catalogue removes internal identifiers and metadata apps without hiding unfamiliar consumer titles',()=>{
 const noise=[
  ['acm-watcher','acm-watcher'],['adplatform.ADPlayer','Ad Player'],
  ['WykOS4t4F0.cmsWebApp','cmsWebApp'],['ZODRT12q2l.WebAccountExtension','WebAccountExtension'],
  ['2026ePop01.SmartTV','2026.SmartTV.Rose'],['ByJlgt0XeD.CastSettingsApp','Google Cast Settings'],
  ['tv6pbVMQFF.PrivacyChoices','Privacy Choices'],['w2VwCK465D.OTApp','Samsung TV Plus Privacy Settings'],
  ['com.lighting.HueSyncService','Hue Sync service'],['org.volt.apps','Apps'],
  ['com.sausng.tv.storageshare-sourceprovider','StorageShare-SourceProvider'],
  ['com.samsung.tv.aria-dummy','Apple TV'],['com.samsung.tv.tvPlusDeeplinker','Samsung TV Plus'],
  ['user.empty',''],['user.code','org.example.internal-agent']
 ].map(([id,name])=>({id,name,show:true}));
 const consumers=[{id:'user.good',name:'Personal App',show:true},
 {id:'1234567890123',name:'5',show:true},{id:'VQr0RGkyS9.UKTVPlay',name:'U',show:true},
 {id:'TDnCH0aVnC.VisualMeditation',name:'Visual Meditation',show:true},
 {id:'org.tizen.netflix-app',name:'Netflix',show:true},
 {id:'org.tizen.browser',name:'Internet',show:true}];
 assert.deepEqual(M.catalogue(noise.concat(consumers)).map(a=>a.nativeId).sort(),consumers.map(a=>a.id).sort());
});
