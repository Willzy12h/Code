/* Existing action IDs retain one visible destination in compact Settings. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.LauncherSettings=factory();}(typeof window!=='undefined'?window:this,function(){
 'use strict';
 function group(id,label,actions){return{id:id,label:label,actions:actions.split(' ').map(function(a){return a==='edit'?a:'setting-'+a;})};}
 var groups=[group('home','Home & Apps','focus recent quick profiles hidden manage-hidden search refresh edit'),group('appearance','Appearance','wallpaper wallpaper-credits adaptive effects custom dimming glow motion'),group('inputs','PC & Inputs','inputs pc preview preview-policy video-reset disconnected rename icons'),group('weather','Time & Weather','weather weather-refresh clock city unit'),group('return','Return & Exit','startup'),group('advanced','Advanced','setup network hold diagnostics about log-export resets backup reset')];
 function groupFor(action){return groups.find(function(g){return g.actions.indexOf(action)>=0;});}
 return{groups:groups,groupFor:groupFor};
}));
