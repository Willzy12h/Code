'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const art=require('../src/js/artwork.js');
test('bundled brand marks are bounded inert path geometry with local provenance',()=>{
 assert.equal(Object.keys(art).length,10);
 for(const [name,mark] of Object.entries(art)){
  assert.match(mark.path,/^[Mm]/);assert.ok(mark.path.length<50000);assert.match(mark.path,/^[MmZzLlHhVvCcSsQqTtAa0-9., +eE-]+$/);assert.match(mark.fill,/^#[0-9a-f]{6}$/i);
 }
 const base=path.join(__dirname,'../src/assets/brands');const notice=JSON.parse(fs.readFileSync(path.join(base,'NOTICE.json')));
 assert.equal(notice.commit,'2f67e5d1a7e5cba43c79a0ebc00abcd95fb0ea30');assert.equal(notice.icons.length,10);
 assert.ok(fs.readFileSync(path.join(base,'LICENSE.txt'),'utf8').includes('CC0'));
 for(const item of notice.icons){assert.ok(art[item.name]);assert.match(item.sha256,/^[0-9a-f]{64}$/);assert.ok(item.upstream_svg.includes(notice.commit));}
});
