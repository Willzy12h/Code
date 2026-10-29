'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const modulePath=path.join(__dirname,'../src/js/wallpapers.js');
const W=fs.existsSync(modulePath)?require(modulePath):{};
const photo={query:{pages:{1:{title:'File:Daily landscape.jpg',imageinfo:[{thumburl:'https://thumb.wikimedia.org/photo.jpg',descriptionurl:'https://commons.wikimedia.org/wiki/File:Daily_landscape.jpg',extmetadata:{Artist:{value:'<b>Photographer</b>'},LicenseShortName:{value:'CC BY-SA 4.0'}}}]}}}};
test('daily wallpaper caches one bounded image and reuses it on the same date',async()=>{
 assert.equal(typeof W.create,'function');let saved=null,calls=0;
 const cache={read:async()=>saved,write:async v=>{saved=v;}};
 const client=W.create(async url=>{calls++;return url.startsWith('https://commons.wikimedia.org/')?{ok:true,json:async()=>photo}:{ok:true,blob:async()=>new Blob(['image'],{type:'image/jpeg'})};},cache,()=>new Date('2026-10-29T12:00:00Z'));
 const first=await client.load();assert.equal(first.credit,'Photographer · CC BY-SA 4.0');assert.equal(first.day,'2026-10-29');assert.equal(calls,2);
 await client.load();assert.equal(calls,2);assert.ok(saved.blob.size>0);
});
test('daily wallpaper failure uses recent local cache and rejects unapproved image hosts',async()=>{
 assert.equal(typeof W.create,'function');
 const saved={day:'2026-10-28',at:Date.parse('2026-10-28T12:00:00Z'),blob:new Blob(['cached'],{type:'image/jpeg'}),title:'Cached',credit:'Author',source:'https://commons.wikimedia.org/wiki/File:Cached.jpg'};
 const cached=await W.create(async()=>{throw Error('Offline');},{read:async()=>saved,write:async()=>{}},()=>new Date('2026-10-29T12:00:00Z')).load();assert.equal(cached.cached,true);
 const malicious=JSON.parse(JSON.stringify(photo));malicious.query.pages[1].imageinfo[0].thumburl='https://unapproved.example/image.jpg';
 let imageRequests=0;const client=W.create(async url=>{if(!url.startsWith('https://commons.wikimedia.org/'))imageRequests++;return{ok:true,json:async()=>malicious};},{read:async()=>null,write:async()=>{}},()=>new Date('2026-10-29T12:00:00Z'));
 await assert.rejects(client.load(),/image|host/i);assert.equal(imageRequests,0);
});
test('daily wallpaper refuses oversized images without destroying the previous cache',async()=>{
 assert.equal(typeof W.create,'function');let writes=0;
 const client=W.create(async url=>url.startsWith('https://commons.wikimedia.org/')?{ok:true,json:async()=>photo}:{ok:true,blob:async()=>new Blob([new Uint8Array(6*1024*1024+1)],{type:'image/jpeg'})},{read:async()=>null,write:async()=>{writes++;}},()=>new Date('2026-10-29T12:00:00Z'));
 await assert.rejects(client.load(),/large|size/i);assert.equal(writes,0);
});
