import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { vendorThree } from './vendor-three.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const engine=await vendorThree();
// Only generated folders directly inside this checkout may be replaced.
for (const name of ['dist', 'vendor']) {
  const target=resolve(root,name);
  if(dirname(target)!==resolve(root)||basename(target)!==name)throw new Error('Destino de build fuera del checkout');
  await rm(target,{recursive:true,force:true});
}
await mkdir(new URL('../vendor/', import.meta.url), { recursive: true });
await cp(engine,new URL('../vendor/three/',import.meta.url),{recursive:true});
await mkdir(new URL('../dist/', import.meta.url), { recursive: true });
for (const name of ['index.html', 'new-york.html', 'css', 'js', 'data', 'vendor', 'LICENSE']) {
  await cp(`${root}${name}`, `${root}dist/${name}`, { recursive: true });
}
await writeFile(`${root}dist/.nojekyll`, '');
console.log('Build estático: dist/ (rutas relativas, dependencias locales)');
