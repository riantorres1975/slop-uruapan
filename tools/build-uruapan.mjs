import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { project, bounds, inside, signedArea, buildingHeight, makeGraph, ORIGIN } from '../js/uruapan/geo.js';
const root = new URL('../data/uruapan/', import.meta.url);
const raw = await readFile(new URL('source/osm.json', root), 'utf8');
const source = JSON.parse(raw), provenance = JSON.parse(await readFile(new URL('source/provenance.json', root), 'utf8'));
if (!Array.isArray(source.elements) || source.remark || createHash('sha256').update(raw).digest('hex') !== provenance.sha256) throw new Error('Snapshot incompleto o checksum incorrecto');
const roads = [], buildings = [], areas = [], pois = [], warnings = [];
const byId = new Map(source.elements.map(e => [`${e.type}/${e.id}`, e]));
const valid = g => Array.isArray(g) && g.length >= 2 && g.every(p => p && Number.isFinite(p.lat) && Number.isFinite(p.lon));
const same = (a, b) => a.lat === b.lat && a.lon === b.lon;
function polygon(geometry, label) {
  if (!valid(geometry) || geometry.length < 4 || !same(geometry[0], geometry.at(-1))) { warnings.push(`${label}: anillo abierto/incompleto`); return null; }
  try {
    const points = geometry.slice(0, -1).map(p => project(p.lat, p.lon));
    if (Math.abs(signedArea(points)) < 2) throw new Error('Área degenerada');
    // Reject crossing edges rather than handing invalid polygons to the triangulator.
    const cross = (a,b,c) => (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
    for (let i=0;i<points.length;i++) for(let j=i+2;j<points.length;j++) {
      if(i===0 && j===points.length-1) continue;
      const a=points[i],b=points[(i+1)%points.length],c=points[j],d=points[(j+1)%points.length];
      if(cross(a,b,c)*cross(a,b,d)<0 && cross(c,d,a)*cross(c,d,b)<0) throw new Error('Autointersección');
    }
    return points;
  } catch(e) { warnings.push(`${label}: ${e.message}`); return null; }
}
function stitch(members, role, label) {
  const parts = members.filter(m => (m.role || 'outer') === role && m.type === 'way').map(m => m.geometry || byId.get(`way/${m.ref}`)?.geometry);
  if (parts.some(p => !valid(p))) { warnings.push(`${label}: miembros incompletos`); return null; }
  const remaining = parts.map(p => [...p]), rings = [];
  while (remaining.length) {
    let current = remaining.shift();
    while (!same(current[0], current.at(-1))) {
      const i = remaining.findIndex(p => same(current.at(-1), p[0]) || same(current.at(-1), p.at(-1)));
      if (i < 0) { warnings.push(`${label}: multipolígono abierto`); return null; }
      let next = remaining.splice(i,1)[0]; if (!same(current.at(-1), next[0])) next.reverse(); current.push(...next.slice(1));
    }
    const ring = polygon(current,label); if (!ring) return null; rings.push(ring);
  }
  return rings;
}
const relationWays = new Set();
for (const e of source.elements.filter(e => e.type === 'relation' && e.tags?.type === 'multipolygon')) {
  const outer=stitch(e.members,'outer',`relation/${e.id}`), inner=stitch(e.members,'inner',`relation/${e.id}`);
  if (!outer?.length || !inner) continue;
  if (inner.some(h => !outer.some(o => inside(o,h[0][0],h[0][1])))) {warnings.push(`relation/${e.id}: hueco sin exterior`);continue;}
  outer.forEach((ring,i) => addPolygon(e,ring,inner.filter(h=>inside(ring,...h[0])),i));
  e.members.filter(m=>m.type==='way').forEach(m=>relationWays.add(m.ref));
}
function addPolygon(e, ring, holes=[], part=0) {
  const tags=e.tags || {}, feature={id:`${e.type}/${e.id}/${part}`,ring,holes,tags,bounds:bounds(ring),name:tags.name || ''};
  if(tags.building && tags.building!=='no') buildings.push({...feature,...buildingHeight(tags,e.id)});
  else if(tags.leisure || tags.landuse || tags.natural || tags.waterway || tags.highway==='pedestrian' || tags.amenity==='marketplace') areas.push(feature);
}
for(const e of source.elements) {
  const tags=e.tags || {};
  if(e.type==='node' && tags.name && Number.isFinite(e.lat) && Number.isFinite(e.lon)) pois.push({id:`node/${e.id}`,name:tags.name,point:project(e.lat,e.lon),tags});
  if(e.type!=='way') continue;
  if(tags.highway && tags.area!=='yes') {
    if(!valid(e.geometry) || e.nodes?.length!==e.geometry.length) {warnings.push(`way/${e.id}: calle incompleta`);continue;}
    try {
      const points=e.geometry.map(p=>project(p.lat,p.lon));
      const drivable=!['footway','pedestrian','path','steps','cycleway','bridleway','construction','proposed','platform','corridor'].includes(tags.highway) && !['private','no'].includes(tags.access) && !['no','private'].includes(tags.motor_vehicle);
      const widthDefault={primary:13,secondary:11,tertiary:9,residential:7,service:4,footway:2,pedestrian:7,path:2,steps:2};
      const width=Number.parseFloat(tags.width) || widthDefault[tags.highway] || 6;
      roads.push({id:`way/${e.id}`,name:tags.name || '',points,nodeIds:e.nodes,tags,width:Math.max(1,Math.min(35,width)),widthSource:tags.width?'osm:width':'provisional:highway',drivable,grade:Number(tags.layer) || (tags.bridge && tags.bridge!=='no'?1:tags.tunnel && tags.tunnel!=='no'?-1:0)});
    } catch(error) {warnings.push(`way/${e.id}: ${error.message}`);}
  }
  if(!relationWays.has(e.id) && valid(e.geometry) && same(e.geometry[0],e.geometry.at(-1))) {
    const ring=polygon(e.geometry,`way/${e.id}`);if(ring)addPolygon(e,ring);
  }
}
if(!roads.length) throw new Error('No hay calles válidas');
const allPoints=roads.flatMap(r=>r.points), worldBounds=bounds(allPoints), size=240, sectors=new Map();
function sectorFor(point) {
  const x=Math.floor(point[0]/size),z=Math.floor(point[1]/size),id=`${x}_${z}`;
  if(!sectors.has(id))sectors.set(id,{id,x,z,roads:[],buildings:[],areas:[]});return sectors.get(id);
}
for(const road of roads)for(let i=0;i<road.points.length-1;i++){
  const a=road.points[i],b=road.points[i+1];sectorFor([(a[0]+b[0])/2,(a[1]+b[1])/2]).roads.push({...road,points:[a,b],nodeIds:road.nodeIds.slice(i,i+2)});
}
for(const [list,key] of [[buildings,'buildings'],[areas,'areas']])for(const feature of list){const b=feature.bounds;sectorFor([(b.minX+b.maxX)/2,(b.minZ+b.maxZ)/2])[key].push(feature);}
await mkdir(new URL('sectors/',root),{recursive:true});
for(const sector of sectors.values()) await writeFile(new URL(`sectors/${sector.id}.json`,root),JSON.stringify(sector));
const namedFeatures=[...areas,...buildings].filter(f=>f.name).map(f=>({id:f.id,name:f.name,point:[(f.bounds.minX+f.bounds.maxX)/2,(f.bounds.minZ+f.bounds.maxZ)/2],tags:f.tags}));
const manifest={version:1,origin:ORIGIN,bounds:worldBounds,sectorSize:size,provenance,terrain:{mode:'flat',datum:'relative',note:'Sin DEM verificado. Terreno plano provisional; no representa el relieve real.'},sectors:[...sectors.values()].map(s=>({id:s.id,x:s.x,z:s.z,url:`sectors/${s.id}.json`,buildings:s.buildings.length})),roads,buildings,areas,pois:[...pois,...namedFeatures],graph:makeGraph(roads),walkGraph:makeGraph(roads,true),stats:{roads:roads.length,buildings:buildings.length,areas:areas.length,sectors:sectors.size,provisionalHeights:buildings.filter(b=>b.heightSource.startsWith('provisional')).length,unsupportedGrades:roads.filter(r=>r.grade!==0).length},warnings};
await writeFile(new URL('manifest.json',root),JSON.stringify(manifest));
await writeFile(new URL('validation.json',root),JSON.stringify({stats:manifest.stats,warnings},null,2));
console.log(JSON.stringify(manifest.stats,null,2));console.log(`${warnings.length} advertencias documentadas en validation.json`);
