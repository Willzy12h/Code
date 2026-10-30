#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),C=require('../src/js/wallpaper-catalogue');
const catalogue=JSON.parse(fs.readFileSync(path.join(root,'src/assets/wallpapers/catalogue.json'),'utf8'));
C.validate(catalogue);
const data='/* Generated from the pinned catalogue by scripts/sync-wallpaper-data.js. */\n(function(root){root.LauncherWallpaperData='+JSON.stringify(catalogue).replace(/</g,'\\u003c')+';})(typeof window!=="undefined"?window:this);\n';
const target=path.join(root,'src/js/wallpaper-data.js');
if(process.argv.includes('--check')){
 if(!fs.existsSync(target)||fs.readFileSync(target,'utf8').replace(/\r\n/g,'\n')!==data)throw Error('Wallpaper data is stale; run node scripts/sync-wallpaper-data.js');
}else fs.writeFileSync(target,data);
