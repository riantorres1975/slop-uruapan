import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const directory = new URL('../data/uruapan/source/', import.meta.url);
const bbox = (process.argv.find(a => a.startsWith('--bbox='))?.slice(7) || '19.410,-102.078,19.435,-102.048').split(',').map(Number);
if (bbox.length !== 4 || !bbox.every(Number.isFinite) || bbox[0] >= bbox[2] || bbox[1] >= bbox[3] || bbox[2] - bbox[0] > 0.2 || bbox[3] - bbox[1] > 0.2 || bbox[0] < 19.2 || bbox[2] > 19.7 || bbox[1] < -102.3 || bbox[3] > -101.8) throw new Error('Bbox inválido o fuera de Uruapan; importe áreas menores a 0.2 grados');
const query = `[out:json][timeout:90];(nwr[highway](${bbox});nwr[building](${bbox});nwr[leisure](${bbox});nwr[landuse](${bbox});nwr[natural](${bbox});nwr[waterway](${bbox});nwr[amenity](${bbox});nwr[tourism](${bbox});nwr[historic](${bbox}););out body geom;`;
await mkdir(directory, { recursive: true });
const endpoints = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
let success = false;
for (const endpoint of endpoints) {
  try {
    console.log(`Descargando ${bbox.join(',')} desde ${endpoint}`);
    const response = await fetch(endpoint, { method: 'POST', body: new URLSearchParams({ data: query }), signal: AbortSignal.timeout(110000), headers: { 'User-Agent': 'SlopUruapan/0.1 (static OSM import)' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const raw = await response.text();
    const data = JSON.parse(raw);
    if (data.remark || !Array.isArray(data.elements) || !data.elements.length || !data.elements.every(e => Number.isSafeInteger(e.id) && ['node', 'way', 'relation'].includes(e.type))) throw new Error(data.remark || 'Respuesta incompleta');
    // Do not replace the last usable snapshot until transfer and JSON validation succeed.
    await writeFile(new URL('osm.json.tmp', directory), raw);
    await rename(new URL('osm.json.tmp', directory), new URL('osm.json', directory));
    await writeFile(new URL('query.overpassql', directory), query + '\n');
    await writeFile(new URL('provenance.json', directory), JSON.stringify({ endpoint, bbox, fetchedAt: new Date().toISOString(), osmTimestamp: data.osm3s?.timestamp_osm_base, sha256: createHash('sha256').update(raw).digest('hex'), license: 'ODbL-1.0', attribution: '© OpenStreetMap contributors', copyright: 'https://www.openstreetmap.org/copyright' }, null, 2));
    console.log(`${data.elements.length} elementos guardados. Ejecute npm run osm:build.`);
    success = true; break;
  } catch (error) { console.error(error.message); }
}
if (!success) throw new Error('No se pudo descargar OSM; el snapshot anterior se conserva.');
