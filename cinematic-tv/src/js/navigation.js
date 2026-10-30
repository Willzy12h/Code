/* Index navigation keeps focus independent of animated tile geometry. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.LauncherNavigation=factory();}(typeof window!=='undefined'?window:this,function(){
  'use strict';
  function rowNeighbour(index,count,key){return Math.max(0,Math.min(count-1,index+(key==='ArrowRight'?1:key==='ArrowLeft'?-1:0)));}
  function gridNeighbour(index,count,columns,key){
    if(!count)return -1;var row=Math.floor(index/columns),column=index%columns;
    if(key==='ArrowLeft')return column?index-1:index;
    if(key==='ArrowRight')return column<columns-1&&index+1<count?index+1:index;
    if(key==='ArrowUp')return row?index-columns:index;
    if(key==='ArrowDown')return (row+1)*columns<count?Math.min(count-1,index+columns):index;
    return index;
  }
  return{rowNeighbour:rowNeighbour,gridNeighbour:gridNeighbour};
}));
