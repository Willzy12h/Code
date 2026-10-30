const {test}=require('node:test');
const assert=require('node:assert/strict');
const M=require('../src/js/model');
test('streaming preset resolves the seven real installed IDs and excludes Hue',()=>{
  const list=M.catalogue(['Hue Sync','Prime Video','YouTube','Disney+','Netflix','Apple TV','Paramount+','Crunchyroll'].map((name,i)=>({id:'native.'+i,name,show:true})), 'self');
  assert.equal(typeof M.streamingPreset,'function');
  assert.deepEqual(M.streamingPreset(list),['app:native.2','app:native.7','app:native.5','app:native.4','app:native.6','app:native.3','app:native.1']);
  assert.deepEqual(M.streamingPreset(list.filter(x=>x.name!=='YouTube')),['app:native.7','app:native.5','app:native.4','app:native.6','app:native.3','app:native.1']);
});
test('grid neighbours preserve columns and clamp incomplete rows',()=>{
  let N;try{N=require('../src/js/navigation');}catch(e){}
  assert.ok(N,'navigation helper is available');
  assert.equal(N.gridNeighbour(5,17,6,'ArrowRight'),5);
  assert.equal(N.gridNeighbour(5,17,6,'ArrowDown'),11);
  assert.equal(N.gridNeighbour(11,17,6,'ArrowDown'),16);
  assert.equal(N.gridNeighbour(16,17,6,'ArrowUp'),10);
  assert.equal(N.rowNeighbour(6,8,'ArrowRight'),7);
  assert.equal(N.rowNeighbour(7,8,'ArrowRight'),7);
});
