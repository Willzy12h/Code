const test=require('node:test'),assert=require('node:assert/strict');
const U=require('../src/js/presentation.js');
test('inner video rectangle preserves six-pixel scaled inset and stays in viewport',()=>{
 assert.deepEqual(U.innerRect({left:100,top:50,width:800,height:460},1920,1080),['106px','56px','788px','448px']);
 assert.deepEqual(U.innerRect({left:200,top:100,width:1600,height:920},3840,2160),['212px','112px','1576px','896px']);
 assert.throws(()=>U.innerRect({left:-20,top:0,width:10,height:10},1920,1080));
});
test('solar dimming uses the saved location day and sunrise/sunset blend',()=>{
 const day=Date.UTC(2026,9,29)/1000,data={timezone:'Europe/London',daily:{sunrise:[day+7*3600],sunset:[day+17*3600]}};
 for(const [hour,want] of [[2,.5],[7,.4],[12,.3],[17,.4],[23,.5]])assert.ok(Math.abs(U.dimming(new Date((day+hour*3600)*1000),data)-want)<.001);
 assert.equal(U.dimming(new Date(2026,9,29,12),null),.3);assert.equal(U.dimming(new Date(2026,9,29,19),null),.4);assert.equal(U.dimming(new Date(2026,9,29,23),null),.5);
 assert.ok(Number.isFinite(U.dimming(new Date(),{timezone:'bad',daily:{sunrise:[NaN],sunset:[0]}})));
});
test('undo applies one delta without replacing unrelated pins or hidden choices',()=>{
 const s={favouriteIds:['a','c','new'],hiddenAppIds:['x','y']};
 assert.deepEqual(U.undo(s,{type:'favourite',id:'b',index:1}).favouriteIds,['a','b','c','new']);
 assert.deepEqual(U.undo(s,{type:'hide',id:'x'}).hiddenAppIds,['y']);
 assert.deepEqual(U.undo(s,{type:'favourite',id:'a',index:1}).favouriteIds,s.favouriteIds);
 assert.deepEqual(s,{favouriteIds:['a','c','new'],hiddenAppIds:['x','y']});
});
