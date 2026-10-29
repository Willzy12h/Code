'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/js/platform.js'),'utf8');
function platform(application){const calls=[],t={application,systeminfo:{},ApplicationControl:function(operation){this.operation=operation;}};const w={tizen:t};vm.runInNewContext(source,{window:w,Promise,setTimeout:(fn,ms)=>setTimeout(fn,ms===4000?10:ms),clearTimeout});return{P:w.LauncherPlatform,t,calls};}
test('known direct launch incompatibility may use default app-control for the same ID',async()=>{
 let target=null;const {P}=platform({launch:(id,ok,fail)=>fail({name:'NotSupportedError'}),launchAppControl:(control,id,ok)=>{assert.equal(control.operation,'http://tizen.org/appcontrol/operation/default');target=id;ok();}});
 await new Promise((resolve,reject)=>P.launch('installed.id',resolve,reject));assert.equal(target,'installed.id');
});
test('permission-denied launch never tries an alternative route',async()=>{
 let control=false;const {P}=platform({launch:(id,ok,fail)=>fail({name:'SecurityError',message:'Denied'}),launchAppControl:()=>{control=true;}});
 const error=await new Promise(resolve=>P.launch('installed.id',()=>resolve('unexpected success'),resolve));assert.match(error,/Denied/);assert.equal(control,false);
});
test('missing catalogue callback is reported and late data cannot replace the failure',async()=>{
 let late,success=0;const {P}=platform({getAppsInfo:ok=>{late=ok;}});
 const error=await new Promise(resolve=>P.getApps(()=>{success++;},resolve));assert.match(error,/timed out/i);late([]);assert.equal(success,0);
});
