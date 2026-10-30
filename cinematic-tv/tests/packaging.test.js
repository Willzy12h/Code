'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
test('release identity, privilege and script staging are complete',()=>{
 const meta=require('../package.json'),xml=fs.readFileSync(path.join(root,'src/config.xml'),'utf8');
 assert.equal(meta.version,'0.5.3');assert.ok(xml.includes('version="'+meta.version+'"'));assert.ok(!xml.includes('example.org'));
 assert.ok(xml.includes('id="CinemTV001.Launcher"'));assert.ok(xml.includes('package="CinemTV001"'));
 assert.ok(xml.includes('http://tizen.org/privilege/package.info'));assert.ok(xml.includes('tizen:content-security-policy'));
 assert.ok(fs.existsSync(path.join(root,'src/assets/icon.png')));
 assert.ok(xml.includes('<icon src="icon.png"/>'));
 const icon=fs.readFileSync(path.join(root,'src/icon.png'));
 assert.equal(icon.readUInt32BE(16),117);assert.equal(icon.readUInt32BE(20),117);
 assert.equal(icon[25],6);assert.ok(icon.equals(fs.readFileSync(path.join(root,'src/assets/icon.png'))));assert.ok(icon.length<300*1024);assert.ok(fs.readFileSync(path.join(root,'src/js/app.js'),'utf8').includes("VERSION='"+meta.version+"'"));
 const built=cp.spawnSync(process.execPath,['scripts/build.js'],{cwd:root,encoding:'utf8'});assert.equal(built.status,0,built.stderr);
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'dist/BUILD-MANIFEST.json')));
 for(const f of ['js/model.js','js/features.js','js/recovery.js','js/platform.js','js/app.js','assets/icon.png'])assert.ok(manifest.files.some(x=>x.path===f),f);
 assert.ok(manifest.files.every(x=>!(/\.(p12|pfx|pem|key)$/.test(x.path))));
});
test('backup import rejects a missing or malformed settings object',()=>{
 const F=require('../src/js/features.js');
 for(const settings of [undefined,null,[],"bad",{version:999}])assert.throws(()=>F.restoreBackup(JSON.stringify({format:'cinematic-tv-preferences',version:2,settings})));
});
test('catalogue rejects malformed IDs and does not merge unrelated named apps',()=>{
 const M=require('../src/js/model.js');const c=M.catalogue([{id:{},name:'Object'}, {id:'a',name:'Netflix Helper',show:true},{id:'b',name:'Disney Clock',show:true},{id:'c',name:'Netflix',show:true}]);
 assert.equal(c.length,3);assert.ok(c.some(x=>x.name==='Netflix Helper'));assert.ok(c.some(x=>x.name==='Disney Clock'));
});
test('all saved IDs are bounded and recently used count is an integer',()=>{
 const M=require('../src/js/model.js');const s=M.load(JSON.stringify({version:1,favouriteIds:['app:'+('x'.repeat(10000)),'input:wrong:1','app:okay'],recentCount:3.4}));
 assert.deepEqual(s.favouriteIds,['app:okay']);assert.equal(s.recentCount,3);
});

test('signing helper permits the root launcher icon and rejects unrelated or unsafe root paths',()=>{
 const helper=fs.readFileSync(path.join(root,'scripts/Tizen-Local.ps1'),'utf8');
 const expression=helper.match(/\$file\.path -notmatch '([^']+)'/);assert.ok(expression);
 const rule=new RegExp(expression[1]);
 for(const name of ['icon.png','config.xml','index.html','assets/icon.png','js/app.js'])assert.ok(rule.test(name),name);
 for(const name of ['iconXpng','icon.png.bak','other.png','../icon.png','/icon.png','x/../icon.png','icon.png/../../key'])assert.ok(!rule.test(name)||/(^|\/)\.\.?($|\/)/.test(name),'Unsafe path accepted: '+name);
});
