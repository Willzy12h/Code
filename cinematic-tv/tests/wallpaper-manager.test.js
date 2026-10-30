const {test}=require('node:test');const assert=require('node:assert/strict');
const W=require('../src/js/wallpapers');let C,G;try{C=require('../src/js/wallpaper-catalogue');G=require('../src/js/wallpaper-manager');}catch(e){}
const record=(id)=>({id,url:'https://upload.wikimedia.org/'+id+'.jpg',source:'https://commons.wikimedia.org/wiki/File:'+id+'.jpg',width:3840,height:2160,mime:'image/jpeg',topics:['scenery'],author:'Author',license:'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/'});
test('catalogue refuses credentials, undersized crops, remote scripts and missing credits',()=>{
 assert.ok(C,'catalogue validator exists');assert.equal(C.validate({version:1,images:[record('a')]}).images.length,1);
 for(const bad of [{width:1920},{height:2000},{url:'https://unapproved.example/a.jpg'},{url:'https://password@upload.wikimedia.org/a.jpg'},{mime:'image/svg+xml'},{author:''},{topics:['bad']},{licenseUrl:'javascript:alert(1)'}])assert.throws(()=>C.validate({version:1,images:[{...record('a'),...bad}]}));
});
test('cache eviction respects count, payload budget and protected images',()=>{
 assert.equal(typeof W.retained,'function');const rows=Array.from({length:8},(_,i)=>({...record(String(i)),blob:new Blob([new Uint8Array(4*1024*1024)]),at:i}));
 const kept=W.retained(rows,['0','1','7']);assert.equal(kept.length,6);assert.ok(kept.some(x=>x.id==='0'));assert.ok(kept.reduce((n,x)=>n+x.blob.size,0)<=24*1024*1024);
 assert.throws(()=>W.retained([{...rows[0],blob:new Blob([new Uint8Array(6*1024*1024+1)])}],[]));
});
test('download rejects streamed oversize and MIME mismatch before persisting',async()=>{
 assert.equal(typeof W.download,'function');await assert.rejects(W.download(record('a'),async()=>new Response(new Uint8Array(6*1024*1024+1),{headers:{'content-type':'image/jpeg'}})),/large|limit/i);
 await assert.rejects(W.download(record('a'),async()=>new Response('<html>bad</html>',{headers:{'content-type':'image/jpeg'}})),/signature|image/i);
});
test('catalogue JSON is bounded before parsing even when length is absent',async()=>{
 assert.equal(typeof W.catalogueData,'function');
 await assert.rejects(W.catalogueData(async()=>new Response(' '.repeat(512*1024+1)), 'assets/wallpapers/catalogue.json'),/large|limit/i);
 await assert.rejects(W.catalogueData(async()=>new Response('{}'),'https://unapproved.example/catalogue.json'),/host|source/i);
});
test('rotation waits for input idle, pauses, keeps history and survives offline startup',async()=>{
 assert.ok(G,'wallpaper manager exists');let now=0,shown=[],fetches=0;const rows=['a','b','c'].map(id=>({...record(id),blob:new Blob(['cached']),at:1}));
 const cache={readAll:async()=>rows,commit:async()=>{},getMeta:async()=>({current:'b',history:['a','b']}),setMeta:async()=>{}};
 const m=G.create({cache,catalogue:{version:1,images:rows},now:()=>now,fetcher:async()=>{fetches++;throw Error('offline')},onReady:async r=>{shown.push(r.id)},onStatus:()=>{}});
 await m.start({wallpaperTopics:['scenery'],wallpaperRotation:true});assert.equal(shown[0],'b');assert.equal(fetches,0);
 now=3600001;m.inputActivity();await m.tick();assert.equal(shown.length,1);now+=2001;await m.tick();assert.equal(shown.length,2);
 await m.previous();assert.equal(shown.at(-1),'b');m.setPaused(true);now+=7200000;await m.tick();assert.equal(shown.at(-1),'b');
 m.setVisible(false);await m.next();assert.equal(shown.at(-1),'b');m.dispose();
});
test('rotation visits every ready image before reusing the oldest',async()=>{
 const rows=['a','b','c'].map(id=>({...record(id),blob:new Blob(['cached']),at:1}));let shown=[];
 const m=G.create({cache:{readAll:async()=>rows,getMeta:async()=>({}),setMeta:async()=>{}},catalogue:{version:1,images:rows},onReady:async r=>shown.push(r.id),onStatus:()=>{}});
 await m.start({wallpaperTopics:['scenery']});await m.next();await m.next();await m.next();await m.next();await m.next();
 assert.deepEqual(shown,['a','b','c','a','b','c']);m.dispose();
});
test('rapid Next retargets the pending image rather than repeating it',async()=>{
 const rows=['a','b','c'].map(id=>({...record(id),blob:new Blob(['cached']),at:1}));let release,requests=[];
 const m=G.create({cache:{readAll:async()=>rows,getMeta:async()=>({}),setMeta:async()=>{}},catalogue:{version:1,images:rows},onReady:r=>{requests.push(r.id);return r.id==='b'&&!release?new Promise(resolve=>release=resolve):Promise.resolve(true)},onStatus:()=>{}});
 await m.start({wallpaperTopics:['scenery']});const pending=m.next();await m.next();release(true);await pending;
 assert.deepEqual(requests,['a','b','c']);assert.equal(m.status().current.id,'c');m.dispose();
});
test('full cache stays quiet until an image changes and pause stops prefetch',async()=>{
 let now=0,fetches=0,rows=Array.from({length:6},(_,i)=>({...record('photo-'+i),blob:new Blob([new Uint8Array([255,216,255,1])],{type:'image/jpeg'}),at:i}));
 const catalogue={version:1,images:Array.from({length:10},(_,i)=>record('photo-'+i))};
 const cache={readAll:async()=>rows,getMeta:async()=>({}),setMeta:async()=>{},commit:async r=>{rows=W.retained(rows.filter(x=>x.id!==r.id).concat(r),[])}};
 const m=G.create({cache,catalogue,now:()=>now,fetcher:async()=>{fetches++;return new Response(new Uint8Array([255,216,255,1]),{headers:{'content-type':'image/jpeg'}})},onReady:async()=>true,onStatus:()=>{}});
 await m.start({wallpaperTopics:['scenery']});
 for(let i=0;i<15;i++){now+=61000;await m.tick();}assert.equal(fetches,0);
 await m.next();now+=61000;await m.tick();assert.equal(fetches,1);
 for(let i=0;i<10;i++){now+=61000;await m.tick();}assert.equal(fetches,1);
 m.setPaused(true);await m.next();now+=61000;await m.tick();assert.equal(fetches,1);m.dispose();
});
test('changing themes permits one ready-buffer replacement even when the cache is full',async()=>{
 let calls=0,rows=Array.from({length:6},(_,i)=>({...record('old-'+i),blob:new Blob([new Uint8Array([255,216,255])],{type:'image/jpeg'}),at:i}));
 const added={...record('new-theme'),topics:['architecture']},cache={readAll:async()=>rows,getMeta:async()=>({}),setMeta:async()=>{},commit:async r=>{rows=W.retained(rows.concat(r),[])}};
 const m=G.create({cache,catalogue:{version:1,images:rows.concat(added)},fetcher:async()=>{calls++;return new Response(new Uint8Array([255,216,255]),{headers:{'content-type':'image/jpeg'}})},onReady:async()=>true,onStatus:()=>{}});
 await m.start({wallpaperTopics:['scenery']});m.configure({wallpaperTopics:['architecture']});await m.prepare();assert.equal(calls,1);assert.ok(rows.some(r=>r.id==='new-theme'));m.dispose();
});
