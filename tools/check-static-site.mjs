import { readFile,stat } from 'node:fs/promises';
const base=new URL('https://example.test/slop-uruapan/'),root=new URL('../dist/',import.meta.url),visited=new Set();
async function read(url){if(!url.href.startsWith(base.href))throw new Error(`Ruta fuera del subdirectorio: ${url}`);const path=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname;const local=new URL(path.slice(base.pathname.length),root);await stat(local);return readFile(local,'utf8');}
for(const entry of ['index.html','new-york.html']){
  const documentURL=new URL(entry,base),html=await read(documentURL),map=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  const resolve=(specifier,parent)=>{
    if(specifier.startsWith('.'))return new URL(specifier,parent);
    const key=Object.keys(map).sort((a,b)=>b.length-a.length).find(k=>specifier===k||(k.endsWith('/')&&specifier.startsWith(k)));
    if(!key)throw new Error(`Import sin resolver ${specifier} desde ${parent}`);
    return new URL(map[key]+specifier.slice(key.length),documentURL);
  };
  async function module(url){if(visited.has(url.href))return;visited.add(url.href);const source=await read(url);for(const [,specifier] of source.matchAll(/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)['"]([^'"\n]+)['"]/g)){if(specifier.startsWith('.')||specifier.startsWith('three'))await module(resolve(specifier,url));}}
  for(const [,path] of html.matchAll(/(?:href|src)="(\.[^"#]+)"/g)){const url=new URL(path,documentURL);await read(url);if(url.pathname.endsWith('.js'))await module(url);}
  for(const path of Object.values(map))if(path.endsWith('.js'))await module(new URL(path,documentURL));
}
const manifest=JSON.parse(await read(new URL('data/uruapan/manifest.json',base)));
for(const sector of manifest.sectors)await read(new URL(sector.url,new URL('data/uruapan/',base)));
for(const license of ['LICENSE','vendor/three/LICENSE','data/uruapan/LICENSE.md'])await read(new URL(license,base));
console.log(`Paquete válido en /slop-uruapan/: ${visited.size} módulos, ${manifest.sectors.length} sectores y licencias presentes.`);
