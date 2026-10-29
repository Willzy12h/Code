'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const M = require('../src/js/model.js');
const featurePath = require('node:path').join(__dirname, '../src/js/features.js');
const F = fs.existsSync(featurePath) ? require(featurePath) : {};

test('settings accept adaptive wallpaper and sanitise bounded local profiles', () => {
 const s = M.load(JSON.stringify({version:1,wallpaper:'auto',profiles:[{name:'PC',layout:'compact',favouriteIds:['input:HDMI:1']}],showNetwork:true,setupDone:true}));
 assert.equal(s.wallpaper,'auto'); assert.equal(s.profiles[0].name,'PC'); assert.equal(s.showNetwork,true); assert.equal(s.setupDone,true);
});
test('imported display names are strings rather than objects/prototype keys', () => {
 const s=M.load('{"version":1,"inputNames":{"HDMI 1":{"x":1},"__proto__":{"polluted":true},"HDMI 2":"PC\\u0000"}}');
 assert.equal(s.inputNames['HDMI 1'],undefined); assert.equal(s.inputNames['HDMI 2'],'PC'); assert.equal(Object.hasOwn(s.inputNames,'__proto__'),false);
});
test('untrusted first favourite names cannot crash initialFavourites',()=>{
 const s=M.load('{"version":1,"favouriteOrderNames":[null,{},"YouTube"]}');
 assert.deepEqual(M.initialFavourites([{id:'app:yt',name:'YouTube'}],s.favouriteOrderNames),['app:yt']);
});
test('URLs allow only public HTTPS images without credentials or private host literals',()=>{
 for(const value of ['https://127.0.0.1/x','https://192.168.1.2/x','https://10.1.1.2/x','https://localhost/x','https://router.local/x','https://169.254.169.254/x','https://a:secret@example.com/x','https://example.com/x\";foo','https://0177.0.0.1/x']) assert.equal(M.safeUrl(value),'',value);
 assert.equal(M.safeUrl('https://images.example.com/art.jpg?size=1920'),'https://images.example.com/art.jpg?size=1920');
});
test('default PC focus recognises user-assigned input name',()=>{
 assert.equal(M.defaultSelection('pc',[],[{id:'input:HDMI:2',kind:'input',name:'HDMI 2',port:'HDMI 2',connected:true}],[],{'HDMI 2':'PC'}),'input:HDMI:2');
});
test('default recent focus skips disconnected inputs but retains shortcuts elsewhere',()=>{
 const a={id:'input:HDMI:1',kind:'input',connected:false},b={id:'app:yt',kind:'app'};
 assert.equal(M.defaultSelection('recent',[a,b],[a],[b]),b.id);
});
test('similar app titles do not become false brand matches',()=>{
 assert.equal(M.nameOf('YouTube Kids'),'YouTube Kids'); assert.equal(M.nameOf('Plex Test Tool'),'Plex Test Tool');
});
test('feature helpers are present',()=>{assert.equal(typeof F.previousItem,'function');assert.equal(typeof F.snapshotProfile,'function');});
test('quick switch skips unavailable entries and the current successful item',()=>{
 assert.equal(F.previousItem([{id:'app:a'},{id:'input:HDMI:1'},{id:'app:b'}],id=>id==='input:HDMI:1'?{connected:false,kind:'input'}:{id,kind:'app'}).id,'app:b');
});
test('adaptive wallpaper is local and falls back predictably',()=>{
 assert.equal(F.wallpaperAt(7,0),'dawn'); assert.equal(F.wallpaperAt(14,0),'scenic'); assert.equal(F.wallpaperAt(22,0),'twilight'); assert.equal(F.wallpaperAt(14,95,true),'twilight');
});
test('profile switching changes layout not weather, history or experimental preview',()=>{
 const s=M.defaults();s.city='Ealing';s.recent=[{id:'app:a',at:10,name:'A'}];s.previewMode='off';
 const profile=F.snapshotProfile({...s,favouriteIds:['input:HDMI:1'],layout:'compact'},'PC');
 const switched=F.applyProfile(s,profile); assert.equal(switched.layout,'compact');assert.equal(switched.city,'Ealing');assert.deepEqual(switched.recent,s.recent);assert.equal(switched.previewMode,'off');
});
test('backup restore drops history and cannot auto-enable native preview',()=>{
 const s=M.defaults();s.favouriteIds=['app:a'];s.recent=[{id:'app:a',at:10}];s.previewMode='selected';
 const restored=F.restoreBackup(F.exportBackup(s));assert.deepEqual(restored.recent,[]);assert.equal(restored.previewMode,'off');assert.deepEqual(restored.favouriteIds,['app:a']);
 assert.throws(()=>F.restoreBackup('x'.repeat(70000)));assert.throws(()=>F.restoreBackup('{"format":"wrong"}'));
});
test('granular appearance reset does not destroy favourites',()=>{
 const s=M.defaults();s.favouriteIds=['app:a'];s.wallpaper='dark';const n=F.resetSection(s,'appearance');assert.equal(n.wallpaper,'scenic');assert.deepEqual(n.favouriteIds,['app:a']);
});
test('version comparison handles semantic components not decimal numbers',()=>{
 assert.equal(F.isNewer('v0.10.0','0.4.0'),true);assert.equal(F.isNewer('v0.4.0-rc.1','0.4.0'),false);assert.equal(F.isNewer('garbage','0.4.0'),false);
});
test('diagnostic export strips URLs, network addresses and identifiers',()=>{
 const text=F.redact('Failure https://host/a?token=secret from 192.168.1.4 DUID=abc123');assert.ok(!text.includes('secret'));assert.ok(!text.includes('192.168'));assert.ok(!text.includes('abc123'));
});
