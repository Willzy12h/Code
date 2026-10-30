const {test}=require('node:test');const assert=require('node:assert/strict');let S;try{S=require('../src/js/settings');}catch(e){}
test('all legacy settings retain a unique grouped destination',()=>{
 assert.ok(S,'compact settings registry exists');assert.equal(S.groups.length,6);
 const actions=['inputs','setup','startup','profiles','pc','focus','preview','preview-policy','video-reset','recent','quick','network','weather','weather-refresh','clock','city','unit','wallpaper','wallpaper-credits','adaptive','effects','custom','dimming','glow','motion','hold','disconnected','rename','hidden','search','refresh','diagnostics','icons','about','log-export','resets','backup','manage-hidden','reset'].map(x=>'setting-'+x).concat(['edit']);
 for(const action of actions){assert.ok(S.groupFor(action),action);assert.equal(S.groups.filter(g=>g.actions.includes(action)).length,1,action);}
});
test('wallpaper preference import sanitises topics, source and rotation',()=>{
 const M=require('../src/js/model');let s=M.load(JSON.stringify({version:1,wallpaper:'curated',wallpaperTopics:['scenery','cities','script','__proto__'],wallpaperRotation:false}));
 assert.equal(s.wallpaper,'curated');assert.deepEqual(s.wallpaperTopics,['scenery','cities']);assert.equal(s.wallpaperRotation,false);
});
