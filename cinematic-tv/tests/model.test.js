'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const M=require('../src/js/model');
test('corrupt preferences fall back to known safe defaults',()=>{assert.deepEqual(M.load('{'),M.defaults());assert.equal(M.load('{"version":999}').version,1);});
test('favourite names map to installed app IDs, not invented IDs',()=>{
 const apps=M.catalogue([{id:'one',name:'YouTube',show:true},{id:'two',name:'Netflix',show:true},{id:'three',name:'SystemApp',show:false},{id:'own',name:'Nocturne',show:true}], 'own');
 assert.deepEqual(apps.map(x=>x.id),['app:two','app:one']);
 assert.deepEqual(M.initialFavourites(apps),['app:one','app:two']);
});
test('recent activity is unique, newest first and bounded',()=>{
 let recent=[{id:'app:1',at:1},{id:'input:HDMI:1',at:2}];
 recent=M.recordRecent(recent,{id:'app:1',name:'Youtube'},500);assert.deepEqual(recent.map(x=>x.id),['app:1','input:HDMI:1']);
 for(let i=0;i<40;i++)recent=M.recordRecent(recent,{id:'app:'+i,name:'Test'},i+1000);
 assert.equal(recent.length,30);
});
test('reorder cannot duplicate or lose favourites',()=>{
 assert.deepEqual(M.moveItem(['a','b','c'],'b',-1),['b','a','c']);
 assert.deepEqual(M.moveItem(['a','b','c'],'a',-1),['a','b','c']);
 assert.deepEqual(M.moveItem(['a','b','c'],'c',1),['a','b','c']);
});
test('video sources retain connection state and original Tizen API object',()=>{
 const raw={type:'HDMI',number:2,editName:'PC'};const sources=M.sources({connected:[raw],disconnected:[{type:'HDMI',number:1}]});
 assert.equal(sources[0].port,'HDMI 2');assert.equal(sources[0].connected,true);assert.equal(sources[0].raw,raw);
 assert.equal(sources[1].connected,false);
});
test('stored preferences are validated and recent entries sanitised',()=>{
 const prefs=M.load(JSON.stringify({version:1,recent:[null,{id:'bad'}, {id:'input:HDMI:1',at:10}],favouriteIds:['app:a','app:a','app:b'],recentCount:100,layout:'oops',hdmiPreview:'true'}));
 assert.deepEqual(prefs.recent.map(x=>x.id),['input:HDMI:1']);assert.deepEqual(prefs.favouriteIds,['app:a','app:b']);
 assert.equal(prefs.recentCount,6);assert.equal(prefs.layout,'cinematic');assert.equal(prefs.hdmiPreview,false);
});

test('upgrades previous preference state without losing valid app and HDMI pins',()=>{
 const prefs=M.load(JSON.stringify({version:1,favouriteIds:['app:old','input:HDMI:1','input:HDMI:1'],wallpaper:'scenic'}));
 assert.deepEqual(prefs.favouriteIds,['app:old','input:HDMI:1']);
 assert.equal(prefs.focusDefault,'recent');assert.equal(prefs.longPressMs,190);
});
test('custom wallpaper URLs reject insecure schemes and invalid input',()=>{
 assert.equal(M.safeUrl('http://example.com/wall.jpg'),'');
 assert.equal(M.safeUrl('javascript:alert(1)'),'');
 assert.equal(M.safeUrl('https://example.com/wall.jpg'),'https://example.com/wall.jpg');
 const prefs=M.load(JSON.stringify({version:1,wallpaper:'custom',customWallpaperUrl:'file:///etc/passwd'}));
 assert.equal(prefs.wallpaper,'scenic');
});
test('Home selection favours last used, named PC, or first favourite as configured',()=>{
 const recents=[{id:'app:netflix'}],favs=[{id:'app:youtube'}],inputs=[{id:'input:HDMI:1',kind:'input',port:'HDMI 1',connected:true,name:'PC'}];
 assert.equal(M.defaultSelection('recent',recents,inputs,favs),'app:netflix');
 assert.equal(M.defaultSelection('pc',recents,inputs,favs),'input:HDMI:1');
 assert.equal(M.defaultSelection('favourite',recents,inputs,favs),'app:youtube');
});
test('invalid preferences cannot force untested HDMI preview on',()=>{
 const prefs=M.load(JSON.stringify({version:1,previewMode:'always',hdmiPreview:'true',tempUnit:'no',longPressMs:-3,hiddenAppIds:['app:a','app:a']}));
 assert.equal(prefs.previewMode,'off');assert.equal(prefs.tempUnit,'celsius');assert.equal(prefs.longPressMs,170);
 assert.deepEqual(prefs.hiddenAppIds,['app:a']);
});
