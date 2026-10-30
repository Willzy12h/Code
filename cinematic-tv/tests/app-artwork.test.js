const {test}=require('node:test');const assert=require('node:assert/strict');
let A;try{A=require('../src/js/app-artwork');}catch(e){}
test('installed icon is preferred even for known brands and prototype-key names',()=>{
 assert.ok(A,'native artwork policy exists');
 for(const name of ['Crunchyroll','Disney+','Apple TV','constructor'])assert.deepEqual(A.choice({name,icon:'/opt/usr/apps/package/shared/res/icon.png'}),{kind:'native',source:'/opt/usr/apps/package/shared/res/icon.png',label:name});
});
test('unsafe or missing icons use a readable name and never a guessed logo',()=>{
 assert.ok(A);for(const icon of ['', 'javascript:alert(1)','https://user:password@host.example/a.png','data:text/html,hello'])assert.equal(A.choice({name:'Unknown app',icon}).kind,'name');
 assert.equal(A.fit(1920,1080),16/9);assert.equal(A.fit(0,10),null);
});

test('reported broken installed icons use pinned publisher assets, never another app or an inferred mark',()=>{
 const fs=require('node:fs'),crypto=require('node:crypto');
 const records=JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'../src/assets/brands/PUBLISHER-ARTWORK.json')));
 assert.equal(records.length,7);
 for(const record of records){
  const selected=A.choice({name:record.name,icon:'/opt/usr/apps/wrong/icon.png'});
  assert.equal(selected.kind,'publisher');assert.equal(selected.source,'assets/brands/'+record.file);
  const bytes=fs.readFileSync(require('node:path').join(__dirname,'../src',selected.source));
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),record.sha256);
  assert.ok(record.publisher);assert.ok(record.source.startsWith('https://apps.apple.com/'));
 }
 assert.equal(A.choice({name:'YouTube Music',icon:''}).kind,'name');
 assert.equal(A.choice({name:'__proto__',icon:''}).kind,'name');
});
