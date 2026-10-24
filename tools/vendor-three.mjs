import { createHash } from 'node:crypto';
import { readdir,readFile,writeFile,mkdir } from 'node:fs/promises';
import { resolve,dirname,relative,sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const revision='5e6eee6ce8757abde7105aba35a358feac986e91';
const base=`https://cdn.jsdelivr.net/gh/mrdoob/three.js@${revision}/`;
const root=fileURLToPath(new URL('../',import.meta.url));
export const cache=resolve(root,'.cache','three',revision);
export async function vendorThree(){
  const pending=['build/three.webgpu.js','build/three.tsl.js','LICENSE'],seen=new Set(),hashes={};
  async function scan(directory){for(const entry of await readdir(directory,{withFileTypes:true})){const path=resolve(directory,entry.name);if(entry.isDirectory())await scan(path);else if(entry.name.endsWith('.js')){const source=await readFile(path,'utf8');for(const match of source.matchAll(/['"]three\/addons\/([^'"\s]+)['"]/g))pending.push('examples/jsm/'+match[1]);}}}
  await scan(resolve(root,'js'));
  async function load(path){
    if(!/^[\w./-]+$/.test(path)||path.includes('..'))throw new Error('Ruta Three inválida');
    const file=resolve(cache,path);if(!file.startsWith(cache+sep))throw new Error('Archivo fuera del cache');
    let source;
    try{source=await readFile(file,'utf8');}catch{
      for(let attempt=0;attempt<3;attempt++){
        try{const response=await fetch(new URL(path,base),{signal:AbortSignal.timeout(30000)});if(!response.ok)throw new Error(`Three ${path}: HTTP ${response.status}`);source=await response.text();break;}catch(e){if(attempt===2)throw e;}
      }
      await mkdir(dirname(file),{recursive:true});await writeFile(file,source);
    }
    hashes[path]=createHash('sha256').update(source).digest('hex');
    if(path.endsWith('.js'))for(const [,specifier] of source.matchAll(/(?:\bfrom\s*|\bimport\s*)['"](\.[^'"\n]+)['"]/g)){
      const url=new URL(specifier,new URL(path,base));if(!url.href.startsWith(base))throw new Error(`Import fuera del snapshot: ${specifier}`);pending.push(url.href.slice(base.length));
    }
  }
  while(pending.length){const batch=[];while(pending.length&&batch.length<6){const path=pending.shift();if(seen.has(path))continue;seen.add(path);batch.push(load(path));}await Promise.all(batch);}
  const integrityFile=resolve(root,'tools','three-integrity.json');
  let expected=null;try{expected=JSON.parse(await readFile(integrityFile,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
  if(expected){for(const [path,hash] of Object.entries(hashes))if(expected.files[path]!==hash)throw new Error(`Integridad de Three no verificada: ${path}. Revisa la actualización explícitamente.`);}
  else await writeFile(integrityFile,JSON.stringify({revision,license:'MIT',source:base,files:Object.fromEntries(Object.entries(hashes).sort())},null,2)+'\n');
  console.log(`Three.js dev fijado: ${revision.slice(0,8)}, ${seen.size} archivos verificados`);
  return cache;
}
