'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const file=path.join(__dirname,'../src/js/recovery.js');
function run(data={}){const handlers={};const w={localStorage:{getItem:k=>data[k]||null,setItem:(k,v)=>data[k]=String(v),removeItem:k=>delete data[k]},addEventListener:(k,fn)=>handlers[k]=fn,location:{reload(){}}};const doc={getElementById:()=>null};if(fs.existsSync(file))vm.runInNewContext(fs.readFileSync(file,'utf8'),{window:w,document:doc,JSON,Date});return {R:w.LauncherRecovery,data};}
test('repeated unfinished startup enters recovery without deleting preferences',()=>{const data={'cinematic-tv-v1':'settings'};run(data);const {R}=run(data);assert.ok(R);assert.equal(R.safe,true);assert.equal(data['cinematic-tv-v1'],'settings');});
test('a successful render resets unfinished boot accounting',()=>{const data={};const one=run(data);assert.ok(one.R);one.R.ready();const next=run(data);assert.equal(next.R.safe,false);});
