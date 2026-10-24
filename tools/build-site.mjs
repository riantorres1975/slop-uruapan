import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
await mkdir(new URL('../vendor/', import.meta.url), { recursive: true });
await cp(new URL('../node_modules/three/', import.meta.url), new URL('../vendor/three/', import.meta.url), { recursive: true, filter: p => !p.includes('node_modules/three/src') });
await mkdir(new URL('../dist/', import.meta.url), { recursive: true });
for (const name of ['index.html', 'new-york.html', 'css', 'js', 'data', 'vendor', 'LICENSE']) {
  await cp(`${root}${name}`, `${root}dist/${name}`, { recursive: true });
}
await writeFile(`${root}dist/.nojekyll`, '');
console.log('Build estático: dist/ (rutas relativas, dependencias locales)');
