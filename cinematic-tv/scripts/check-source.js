#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
for(const folder of ['src/js','scripts'])for(const file of fs.readdirSync(path.join(root,folder)).filter(x=>x.endsWith('.js'))){
 const target=path.join(root,folder,file),result=cp.spawnSync(process.execPath,['--check',target],{encoding:'utf8'});
 if(result.status!==0){process.stderr.write(result.stderr||'Syntax check failed');process.exit(1);}
}
console.log('All runtime and build JavaScript syntax checks passed.');
