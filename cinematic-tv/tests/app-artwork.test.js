const {test}=require('node:test');const assert=require('node:assert/strict');
let A;try{A=require('../src/js/app-artwork');}catch(e){}
test('installed icon is preferred even for known brands and prototype-key names',()=>{
 assert.ok(A,'native artwork policy exists');
 for(const name of ['YouTube','Disney+','BBC iPlayer','constructor'])assert.deepEqual(A.choice({name,icon:'/opt/usr/apps/package/shared/res/icon.png'}),{kind:'native',source:'/opt/usr/apps/package/shared/res/icon.png',label:name});
});
test('unsafe or missing icons use a readable name and never a guessed logo',()=>{
 assert.ok(A);for(const icon of ['', 'javascript:alert(1)','https://user:password@host.example/a.png','data:text/html,hello'])assert.equal(A.choice({name:'Channel 4',icon}).kind,'name');
 assert.equal(A.fit(1920,1080),16/9);assert.equal(A.fit(0,10),null);
});
