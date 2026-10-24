const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const read = name => readFileSync(join(__dirname, '..', name), 'utf8');
test('la entrada principal identifica Uruapan y carga su motor', () => {
  const html = read('index.html');
  assert.match(html, /<html lang="es">/);
  assert.match(html, /<title>SLOP URUAPAN/);
  assert.match(html, /<script type="module" src="\.\/js\/main\.js">/);
  assert.match(read('js/main.js'), /import '\.\/uruapan\/main\.js'/);
  const map = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  assert.equal(map.three, map['three/webgpu']);
  assert.ok(Object.values(map).every(path => path.startsWith('./vendor/three/')));
  assert.doesNotMatch(html, /Nueva York original/);
});
test('la ruta anterior abre Uruapan y no conserva otro simulador', () => {
  const html = read('new-york.html');
  assert.match(html, /<title>SLOP URUAPAN<\/title>/);
  assert.match(html, /http-equiv="refresh" content="0;url=\.\/"/);
  assert.doesNotMatch(html, /type="module"/);
  for(const name of ['js/nyc-geodata.js', 'js/nyc-map.js', 'tools/build-geodata.mjs']) assert.equal(existsSync(join(__dirname,'..',name)),false);
});
test('los controladores y materiales compartidos no importan geografía externa', () => {
  for(const name of ['js/controllers.js','js/cameras.js','js/tsl-materials.js']) assert.doesNotMatch(read(name), /from ['"]\.\/(?:nyc-|landmarks|city-grid)/);
  assert.match(read('js/controllers.js'), /this.world.groundHeight/);
  assert.match(read('js/controllers.js'), /this.world.bounds/);
});
