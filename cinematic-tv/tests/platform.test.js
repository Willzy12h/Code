'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const sourceText = fs.readFileSync(path.join(__dirname, '../src/js/platform.js'), 'utf8');
const tick = ms => new Promise(resolve => setTimeout(resolve, ms));

function makePlatform(opts = {}) {
  const calls = [], original = { type:'HDMI', number:1 };
  let current = original, visible = false;
  function invoke(name, operation, ok, fail) {
    calls.push(name);
    setTimeout(() => {
      if (opts.failOperation === operation) { if (fail) fail(new Error(operation + ' denied')); return; }
      ok();
    }, opts.delay || 0);
  }
  const tvwindow = {
    getSource() { calls.push('get'); if (opts.noSource) throw Error('not available'); return current; },
    setSource(input, ok, fail, win) {
      assert.equal(win, 'MAIN');
      invoke('set:' + input.number, 'set', () => { current = input; ok(); }, fail);
    },
    show(ok, fail, rect, win, zPosition) {
      assert.equal(win, 'MAIN');
      assert.equal(zPosition, 'FRONT');
      assert.equal(rect.length, 4);
      invoke('show:' + rect.join(','), 'show', () => { visible = true; ok(); }, fail);
    },
    hide(ok, fail, win) {
      assert.equal(win, 'MAIN');
      invoke('hide', 'hide', () => { visible = false; ok(); }, fail);
    }
  };
  const context = { window:{tizen:{application:{getAppInfo(){return {id:'self'};},getAppsInfo(ok){ok([{id:'app',name:'YouTube',show:true}]);},launch(id,ok){calls.push('launch:' + id);ok();}},systeminfo:{getPropertyValue(k,ok){ok({connected:[original],disconnected:[]});}},tvwindow}}, setTimeout,clearTimeout,Promise };
  vm.runInNewContext(sourceText, context);
  return {P:context.window.LauncherPlatform, calls, original, source:()=>current, setCurrent:s=>{current=s;}, visible:()=>visible};
}
const hdmi = number => ({type:'HDMI',number});
const rect = ['100px','100px','420px','236px'];

test('stopping without a preview never hides the native TV video plane', async () => {
  const {P,calls} = makePlatform(); await P.stopPreview(); assert.deepEqual(calls, []);
});
test('preview refuses to touch a source if prior state cannot be determined', async () => {
  const {P,calls} = makePlatform({noSource:true}); let message = '';
  await P.preview(hdmi(2), rect, () => {}, e => message = e);
  assert.match(message, /not available|original source/); assert.equal(calls.filter(x => x.startsWith('set:')).length, 0);
});
test('preview uses MAIN FRONT with requested thumbnail rectangle', async () => {
  const {P,calls,visible} = makePlatform(); let confirmed = false;
  await P.preview(hdmi(2),rect,()=>confirmed = true,()=>{});
  assert.equal(confirmed,true); assert.equal(visible(),true);
  assert.ok(calls.includes('show:' + rect.join(',')));
  assert.equal(P.videoStatus().owner, 'preview');
  await P.stopPreview(); assert.equal(visible(),false);
});
test('stopping restores the previous input AFTER hiding the video plane', async () => {
  const {P,calls,source} = makePlatform();
  await P.preview(hdmi(2),rect,()=>{},()=>{});
  await P.stopPreview();
  assert.equal(source().number,1);
  const hide = calls.lastIndexOf('hide'), restore = calls.lastIndexOf('set:1');
  assert.ok(hide >= 0 && restore > hide, calls.join(' > '));
});
test('cancelled preview never shows video after a delayed source change', async () => {
  const {P,calls,source} = makePlatform({delay:25});
  const pending = P.preview(hdmi(2),rect,()=>{},()=>{});
  await tick(7);
  const stop = P.stopPreview();
  await Promise.all([pending,stop]);
  assert.equal(calls.filter(x=>x.startsWith('show:')).length,0);
  assert.equal(source().number,1);
});
test('new rapid focus target wins without displaying an intermediate preview', async () => {
  const {P,calls,source} = makePlatform({delay:22});
  const a = P.preview(hdmi(2),rect,()=>{},()=>{});
  await tick(6);
  const b = P.preview(hdmi(3),rect,()=>{},()=>{});
  await Promise.all([a,b]);
  assert.equal(source().number,3);
  assert.equal(calls.filter(x=>x.startsWith('show:')).length,1);
  await P.stopPreview(); assert.equal(source().number,1);
});
test('stopping during show callback restores and prevents stale confirmation', async () => {
  const {P,source,visible} = makePlatform({delay:18}); let confirmations = 0;
  const started = P.preview(hdmi(2),rect,()=>confirmations++,()=>{});
  await tick(27);
  const stopping = P.stopPreview();
  await Promise.all([started,stopping]);
  assert.equal(confirmations,0);
  assert.equal(source().number,1); assert.equal(visible(),false);
});
test('explicit fullscreen HDMI opens once and does not restore on Back', async () => {
  const {P,calls,source,visible} = makePlatform(); let opened = false;
  await P.showInputFullscreen(hdmi(3),()=>opened=true,()=>{});
  assert.equal(opened,true); assert.equal(source().number,3); assert.equal(visible(),true);
  assert.ok(calls.includes('show:0px,0px,1920px,1080px'));
  await P.leaveFullscreen();
  assert.equal(visible(),false); assert.equal(source().number,3);
  assert.equal(P.videoStatus().owner,'none');
});
test('stopPreview does not hide a fullscreen HDMI selected by the user', async () => {
  const {P,calls,visible} = makePlatform();
  await P.showInputFullscreen(hdmi(3),()=>{},()=>{});
  const count = calls.length;
  await P.stopPreview();
  assert.equal(calls.length,count); assert.equal(visible(),true);
  await P.leaveFullscreen();
});
test('preview error reports failure and attempts source restoration', async () => {
  const {P,source} = makePlatform({failOperation:'show'});let message = '';
  await P.preview(hdmi(2),rect,()=>{},e=>message=e);
  assert.match(message,/show denied/);
  assert.equal(source().number,1); assert.equal(P.videoStatus().owner,'none');
});
test('an application can be launched after the preview has been restored', async () => {
  const {P,calls} = makePlatform({delay:10});
  await P.preview(hdmi(2),rect,()=>{},()=>{});
  await P.stopPreview();
  P.launch('test.app',()=>{},()=>{});
  assert.ok(calls.indexOf('launch:test.app') > calls.lastIndexOf('set:1'));
});

test('external Samsung source change is never overwritten by preview cleanup', async () => {
  const {P,source,setCurrent,calls} = makePlatform();
  await P.preview(hdmi(2),rect,()=>{},()=>{});
  setCurrent(hdmi(4));
  await P.stopPreview();
  assert.equal(source().number,4);
  assert.equal(calls.includes('set:1'),false);
});
