#!/usr/bin/env node
'use strict';
/* Assemble a clean, deterministic WEB PROJECT. This is not a signed .wgt. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const src = path.join(root, 'src');
const dist = path.join(root, 'dist', 'webapp');
const files = ['config.xml', 'index.html', 'css/styles.css', 'js/recovery.js', 'js/model.js', 'js/features.js', 'js/wallpapers.js', 'js/artwork.js', 'js/presentation.js', 'js/platform.js', 'js/app.js', 'assets/brands/LICENSE.txt', 'assets/brands/DISCLAIMER.txt', 'assets/brands/NOTICE.json', 'assets/cinematic-mark.svg', 'assets/icon.png', 'assets/wallpaper.jpg', 'assets/wallpaper-twilight.jpg', 'assets/wallpaper-dawn.jpg'];
const index = fs.readFileSync(path.join(src, 'index.html'), 'utf8');
const manifest = fs.readFileSync(path.join(src, 'config.xml'), 'utf8');
const meta = require(path.join(root, 'package.json'));
if (!manifest.includes('version="' + meta.version + '"')) throw Error('package.json version and Tizen manifest disagree');
if (!manifest.includes('profile name="tv-samsung"')) throw Error('TV profile absent from config.xml');
for (const f of files) if (!fs.existsSync(path.join(src, f))) throw Error('Source asset missing: ' + f);
for (const f of ['css/styles.css', 'js/recovery.js', 'js/model.js', 'js/features.js', 'js/wallpapers.js', 'js/artwork.js', 'js/presentation.js', 'js/platform.js', 'js/app.js']) {
  if (!index.includes('"' + f + '"')) throw Error('Unreferenced entrypoint dependency: ' + f);
}
if (fs.existsSync(path.dirname(dist))) fs.rmSync(path.dirname(dist), {recursive:true,force:true});
fs.mkdirSync(dist, {recursive:true});
const hashes = [];
for (const rel of files) {
  const contents = fs.readFileSync(path.join(src, rel));
  const to = path.join(dist, rel); fs.mkdirSync(path.dirname(to), {recursive:true}); fs.writeFileSync(to,contents);
  hashes.push({path:rel, sha256:crypto.createHash('sha256').update(contents).digest('hex'), bytes:contents.length});
}
fs.writeFileSync(path.join(root, 'dist', 'BUILD-MANIFEST.json'), JSON.stringify({name:meta.name,version:meta.version,kind:'unsigned Tizen web project; signing required',files:hashes},null,2) + '\n');
console.log('Built unsigned Tizen web project: dist/webapp (' + files.length + ' files, ' + hashes.reduce((a,f)=>a+f.bytes,0) + ' bytes).');
console.log('No .wgt is generated: installable TV packages require a Samsung TV certificate.');
