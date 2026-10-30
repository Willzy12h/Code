const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../src/js/background-return.js');
function harness(){let now=10000,hidden=true,id='com.samsung.tv.csfs',launches=0,stops=0,fail=false,callbacks=[];
 const r=R.create({now:()=>now,hidden:()=>hidden,foreground:()=>{if(fail)throw Error('Unavailable');return id;},launch:(ok,bad)=>{launches++;callbacks.push({ok,bad});},stop:()=>stops++});
 return {r,set:(v)=>{if('now'in v)now=v.now;if('hidden'in v)hidden=v.hidden;if('id'in v)id=v.id;if('fail'in v)fail=v.fail;},get launches(){return launches;},get stops(){return stops;},callbacks};}
test('off by default; enabling returns only from stable Samsung Home',()=>{const h=harness();h.r.tick();assert.equal(h.launches,0);h.r.enable();h.r.tick();h.set({now:10400});h.r.tick();assert.equal(h.launches,1);h.callbacks[0].ok();h.set({now:15000,hidden:false});h.r.tick();assert.equal(h.launches,1);});
test('other apps, inputs, empty foreground and foreground launcher never trigger return',()=>{for(const id of ['youtube','org.tizen.tv-viewer','',null]){const h=harness();h.r.enable();h.set({id});h.r.tick();h.set({now:30000});h.r.tick();assert.equal(h.launches,0);}});
test('pause stays effective while Samsung Home is being used and until launcher is reopened',()=>{const h=harness();h.r.enable();h.r.pause();h.r.tick();h.set({now:9999999});h.r.tick();assert.equal(h.launches,0);h.r.resume();h.r.tick();h.set({now:10000400});h.r.tick();assert.equal(h.launches,1);});
test('disable cancels the worker and no late callback re-enables return',()=>{const h=harness();h.r.enable();h.r.tick();h.set({now:10400});h.r.tick();h.r.disable();h.callbacks[0].ok();h.set({now:50000});h.r.tick();assert.equal(h.launches,1);assert.ok(h.stops);assert.equal(h.r.status().enabled,false);});
test('launch failure, missing query and a stuck launch fail closed',()=>{for(const kind of ['query','launch','timeout']){const h=harness();h.r.enable();if(kind==='query')h.set({fail:true});h.r.tick();h.set({now:10400});h.r.tick();if(kind==='launch')h.callbacks[0].bad('Denied');if(kind==='timeout'){h.set({now:16000});h.r.tick();}assert.equal(h.r.status().enabled,false);assert.ok(h.r.status().error);}});
test('retry budget prevents repeated successful acknowledgements forming a launch loop',()=>{const h=harness();h.r.enable();for(let n=0;n<5;n++){h.set({now:10000+n*6000});h.r.tick();h.set({now:10400+n*6000});h.r.tick();if(h.callbacks[n])h.callbacks[n].ok();}assert.equal(h.launches,3);assert.equal(h.r.status().enabled,false);});

test('normal repeated app usage outside the rolling minute retains automatic return',()=>{const h=harness();h.r.enable();for(let n=0;n<5;n++){h.set({now:10000+n*70000,hidden:true});h.r.tick();h.set({now:10400+n*70000});h.r.tick();assert.equal(h.launches,n+1);h.callbacks[n].ok();h.set({hidden:false});h.r.tick();}assert.equal(h.r.status().enabled,true);});

test('successful visible returns cannot reset the rolling budget and trap the user in a relaunch loop',()=>{
 const h=harness();h.r.enable();
 for(let n=0;n<5;n++){
  h.set({now:10000+n*6000,hidden:true});h.r.tick();h.set({now:10400+n*6000});h.r.tick();
  if(h.callbacks[n])h.callbacks[n].ok();h.set({hidden:false});h.r.tick();
 }
 assert.equal(h.launches,3);assert.equal(h.r.status().enabled,false);assert.match(h.r.status().error,/Repeated return/);
});
