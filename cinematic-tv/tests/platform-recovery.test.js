'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync(require('node:path').join(__dirname,'../src/js/platform.js'),'utf8');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
function rig(options={}) {
 let source={type:'HDMI',number:1},visible=false,calls=[],pending=[];
 const tv={getSource:()=>source,setSource(s,ok,fail){calls.push('set:'+s.number);if(options.restoreFail&&s.number===1){fail(new Error('restore denied'));return;}const action=()=>{source=s;ok(s);};if(options.lateSource&&s.number===2){pending.push(action);}else setTimeout(action,1);},
 show(ok,fail,rect){calls.push('show');const done=()=>{visible=true;ok(rect);};if(options.lateShow)pending.push(done);else setTimeout(done,1);},
 hide(ok,fail){calls.push('hide');if(options.hideFail){fail(new Error('hide denied'));return;}visible=false;ok();}};
 const w={tizen:{application:{getAppInfo(){return{id:'own'};}},tvwindow:tv,systeminfo:{}},setTimeout,clearTimeout};
 vm.runInNewContext(code,{window:w,Promise,setTimeout:(fn,ms)=>setTimeout(fn,ms===2400?20:ms),clearTimeout});
 return{P:w.LauncherPlatform,calls,visible:()=>visible,source:()=>source,pending,external(s){source=s;}};
}
const src=n=>({type:'HDMI',number:n}),rect=['10px','10px','400px','220px'];
test('source restoration failure propagates as a failed cleanup rather than success',async()=>{
 const r=rig({restoreFail:true});await r.P.preview(src(2),rect,()=>{},()=>{});assert.equal(await r.P.stopPreview(),false);assert.match(r.P.videoStatus().lastError,/restore denied/);
});
test('timeout quarantines source operations until late callback recovery',async()=>{
 const r=rig({lateSource:true});await r.P.preview(src(2),rect,()=>{},()=>{});assert.equal(r.P.videoStatus().blocked,true);
 await r.P.showInputFullscreen(src(3),()=>{},()=>{});assert.ok(!r.calls.includes('set:3'));
 r.pending.shift()();await delay(15);assert.equal(r.source().number,1);assert.equal(r.P.videoStatus().blocked,true,'explicit retry is needed after uncertainty');
});
test('late show after timeout is hidden and original source restored',async()=>{
 const r=rig({lateShow:true});await r.P.preview(src(2),rect,()=>{},()=>{});r.pending.shift()();await delay(15);
 assert.equal(r.visible(),false);assert.equal(r.source().number,1);
});
test('cancel pending fullscreen before source callback restores prior state',async()=>{
 const r=rig({lateSource:true});const p=r.P.showInputFullscreen(src(2),()=>{},()=>{});await delay(3);const leave=r.P.leaveFullscreen();r.pending.shift()();await Promise.all([p,leave]);
 assert.equal(r.visible(),false);assert.equal(r.source().number,1);
});
test('unsafe native hide is not reported as hidden',async()=>{
 const r=rig({hideFail:true});await r.P.preview(src(2),rect,()=>{},()=>{});assert.equal(await r.P.stopPreview(),false);assert.equal(r.P.videoStatus().visible,true);assert.equal(r.P.videoStatus().blocked,true);
});
test('explicit reset cannot clear quarantine while callback is still outstanding',async()=>{
 const r=rig({lateSource:true});await r.P.preview(src(2),rect,()=>{},()=>{});assert.equal(typeof r.P.resetVideo,'function');assert.equal(await r.P.resetVideo(),false);
});
