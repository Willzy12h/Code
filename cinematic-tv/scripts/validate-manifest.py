"""Project-specific manifest and resource gate. Not the Samsung SDK validator."""
from pathlib import Path
import xml.etree.ElementTree as ET
import json,hashlib,re
root=Path(__file__).resolve().parents[1]
ns={'w':'http://www.w3.org/ns/widgets','t':'http://tizen.org/ns/widgets'}
config=ET.parse(root/'src/config.xml').getroot();meta=json.loads((root/'package.json').read_text(encoding='utf-8'))
assert config.attrib['version']==meta['version']=='0.5.5'
app=config.find('t:application',ns);assert app.attrib['id']=='CinemTV001.Launcher' and app.attrib['package']=='CinemTV001'
assert config.find('t:profile',ns).attrib['name']=='tv-samsung'
assert config.find('t:content-security-policy',ns) is not None
priv={p.attrib['name'] for p in config.findall('t:privilege',ns)}
allowed={'application.info','application.launch','package.info','tv.window','filesystem.read','internet'}
assert priv=={'http://tizen.org/privilege/'+n for n in allowed},priv
assert config.find('t:service',ns) is None
assert config.find('t:setting',ns).attrib['background-support']=='enable'
# Explicit user-authorised experimental background return; no service or extra privilege.
assert (root/'src/js/background-return.js').is_file()
assert (root/'src/js/return-worker.js').is_file()
for selector in ('w:content','w:icon'):
    assert (root/'src'/config.find(selector,ns).attrib['src']).is_file()
manifest=json.loads((root/'dist/BUILD-MANIFEST.json').read_text(encoding='utf-8'))
for item in manifest['files']:
    assert hashlib.sha256((root/'dist/webapp'/item['path']).read_bytes()).hexdigest()==item['sha256']
html=(root/'src/index.html').read_text(encoding='utf-8')
for src in re.findall(r'<script src="([^"]+)"',html):assert (root/'dist/webapp'/src).is_file(),src
print(json.dumps({'result':'PASS','version':meta['version'],'source_files':len(manifest['files']),'scope':'project manifest/resource checks only'}))
