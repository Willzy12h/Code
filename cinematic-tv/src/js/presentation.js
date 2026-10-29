/* Small presentation calculations; no native calls, storage or network. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.LauncherPresentation=factory();}(typeof window!=='undefined'?window:this,function(){
 'use strict';
 function innerRect(r,width,height){
  var pad=6*height/1080,x=Math.max(0,r.left+pad),y=Math.max(0,r.top+pad),right=Math.min(width,r.left+r.width-pad),bottom=Math.min(height,r.top+r.height-pad);
  if(![x,y,right,bottom,width,height].every(Number.isFinite)||right<=x||bottom<=y)throw new Error('Preview frame is outside the viewport');
  return [x,y,right-x,bottom-y].map(function(v){return Math.round(v)+'px';});
 }
 function percentages(rect,width,height){return rect.map(function(v,i){return (parseFloat(v)/(i%2?height:width)*100).toFixed(5)+'%';});}
 function dayKey(date,zone){try{return new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}catch(e){return date.toDateString();}}
 function dimming(now,data){
  var rise,set,zone=data&&data.timezone,daily=data&&data.daily,key=dayKey(now,zone),seconds=now.getTime()/1000;
  if(daily&&Array.isArray(daily.sunrise)&&Array.isArray(daily.sunset))daily.sunrise.slice(0,7).some(function(value,i){
   var end=daily.sunset[i];if(!Number.isFinite(value)||!Number.isFinite(end)||value<1e9||end<=value||end-value>86400||Math.abs(seconds-value)>129600)return false;
   if(dayKey(new Date(value*1000),zone)!==key)return false;rise=value;set=end;return true;
  });
  function blend(t,a,b,from,to){return from+(to-from)*Math.max(0,Math.min(1,(t-a)/(b-a)));}
  if(rise!==undefined){if(seconds<rise-1800||seconds>set+1800)return .5;if(seconds<rise+1800)return blend(seconds,rise-1800,rise+1800,.5,.3);if(seconds>set-1800)return blend(seconds,set-1800,set+1800,.3,.5);return .3;}
  var hour=now.getHours()+now.getMinutes()/60;
  try{if(zone){var parts=new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'numeric',minute:'numeric',hourCycle:'h23'}).formatToParts(now);hour=Number(parts.find(function(p){return p.type==='hour';}).value)+Number(parts.find(function(p){return p.type==='minute';}).value)/60;}}catch(e){}
  if(hour<7.75||hour>=21.25)return .5;if(hour<8.25)return blend(hour,7.75,8.25,.5,.3);if(hour<17.75)return .3;if(hour<18.25)return blend(hour,17.75,18.25,.3,.4);if(hour<20.75)return .4;return blend(hour,20.75,21.25,.4,.5);
 }
 function undo(state,record){var next=Object.assign({},state);next.favouriteIds=(state.favouriteIds||[]).slice();next.hiddenAppIds=(state.hiddenAppIds||[]).slice();
  if(record.type==='hide')next.hiddenAppIds=next.hiddenAppIds.filter(function(id){return id!==record.id;});
  if(record.type==='favourite'&&next.favouriteIds.indexOf(record.id)<0)next.favouriteIds.splice(Math.max(0,Math.min(next.favouriteIds.length,record.index)),0,record.id);
  return next;
 }
 return{innerRect:innerRect,percentages:percentages,dimming:dimming,undo:undo};
}));
