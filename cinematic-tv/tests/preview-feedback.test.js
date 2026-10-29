'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const M=require('../src/js/model.js');
const source=fs.readFileSync(path.join(__dirname,'../src/js/platform.js'),'utf8');
function platform(){const window={};vm.runInNewContext(source,{window,setTimeout,clearTimeout,Promise});return window.LauncherPlatform;}
test('new installations default to current-source preview while explicit off stays off',()=>{
 assert.equal(M.defaults().previewMode,'selected');assert.equal(M.defaults().autoPreviewCurrentOnly,true);
 assert.equal(M.load(JSON.stringify({version:1,previewMode:'off'})).previewMode,'off');
 assert.equal(M.load(JSON.stringify({version:1,previewMode:'invalid',hdmiPreview:'true'})).previewMode,'off');
});
test('preview contains 4K, 4:3 and ultrawide sources inside the card without stretching',()=>{
 const P=platform();assert.equal(typeof P.fitVideoRect,'function');
 assert.deepEqual(Array.from(P.fitVideoRect(['100px','50px','800px','600px'],{width:3840,height:2160})),['100px','125px','800px','450px']);
 assert.deepEqual(Array.from(P.fitVideoRect(['100px','50px','800px','600px'],{width:720,height:576,aspectRatio:'ASPECT_RATIO_4x3'})),['100px','50px','800px','600px']);
 const r=P.fitVideoRect(['100px','50px','800px','600px'],{width:3440,height:1440}).map(parseFloat);
 assert.ok(r[0]>=100&&r[1]>=50&&r[0]+r[2]<=900&&r[1]+r[3]<=650);
 assert.ok(Math.abs(r[2]/r[3]-3440/1440)<.01);
 assert.deepEqual(Array.from(P.fitVideoRect(['0px','0px','1920px','1080px'],null)),['0px','0px','1920px','1080px']);
});


test('percentage preview coordinates preserve source ratio in viewport space',()=>{
 const P=platform(),r=P.fitVideoRect(['10%','10%','50%','50%'],{width:1920,height:1080});
 assert.deepEqual(Array.from(r),['10.00000%','10.00000%','50.00000%','50.00000%']);
 const four=P.fitVideoRect(['10%','10%','50%','50%'],{width:1440,height:1080}).map(parseFloat);
 assert.ok(Math.abs((four[2]*1920)/(four[3]*1080)-4/3)<.001);
});
