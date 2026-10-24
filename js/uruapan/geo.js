// WGS84 tangent plane, sufficient for a city-sized extent. North is -Z.
export const ORIGIN = { lat: 19.42112, lon: -102.06382 };
const phi = ORIGIN.lat * Math.PI / 180;
const e2 = 6.69437999014e-3, a = 6378137;
const kx = Math.PI / 180 * a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2) * Math.cos(phi);
const kz = Math.PI / 180 * a * (1 - e2) / (1 - e2 * Math.sin(phi) ** 2) ** 1.5;
export function project(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat - ORIGIN.lat) > 0.3 || Math.abs(lon - ORIGIN.lon) > 0.3) throw new Error('Coordenada fuera de Uruapan');
  return [Math.round((lon - ORIGIN.lon) * kx * 100) / 100, Math.round((ORIGIN.lat - lat) * kz * 100) / 100];
}
export function unproject(x, z) { return { lat: ORIGIN.lat - z / kz, lon: ORIGIN.lon + x / kx }; }
export function signedArea(ring) { return ring.reduce((s, p, i) => { const q = ring[(i + 1) % ring.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2; }
export function inside(ring, x, z) {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const p = ring[i], q = ring[j];
    if ((p[1] > z) !== (q[1] > z) && x < (q[0] - p[0]) * (z - p[1]) / (q[1] - p[1]) + p[0]) c = !c;
  }
  return c;
}
export function inFeature(feature, x, z) { return inside(feature.ring, x, z) && !(feature.holes || []).some(h => inside(h, x, z)); }
export function bounds(points) { return { minX: Math.min(...points.map(p => p[0])), maxX: Math.max(...points.map(p => p[0])), minZ: Math.min(...points.map(p => p[1])), maxZ: Math.max(...points.map(p => p[1])) }; }
export function closestPoint(p, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz || 1)));
  return [a[0] + t * dx, a[1] + t * dz];
}
export function buildingHeight(tags, id) {
  const raw = String(tags.height || '').trim();
  const match = /^(\d+(?:\.\d+)?)\s*(m|ft|')?$/.exec(raw);
  const height = match ? Number(match[1]) * (match[2] === 'ft' || match[2] === "'" ? 0.3048 : 1) : NaN;
  if (height > 1 && height < 250) return { height, heightSource: 'osm:height' };
  const levels = Number(tags['building:levels']);
  if (levels >= 1 && levels <= 60) return { height: levels * 3, heightSource: 'osm:levels (3 m/nivel aproximados)' };
  return { height: (1 + Math.abs(Number(id)) % 3) * 3, heightSource: 'provisional:1-3-niveles' };
}
export function makeGraph(roads, pedestrian = false) {
  const nodes = {}, edges = [];
  for (const road of roads) {
    if (!pedestrian && (!road.drivable || road.grade !== 0)) continue;
    if (pedestrian && (road.tags.foot === 'no' || ['motorway', 'motorway_link'].includes(road.tags.highway) || road.grade !== 0)) continue;
    const one = pedestrian ? 0 : road.tags.oneway === '-1' ? -1 : road.tags.oneway === 'yes' || road.tags.oneway === '1' || road.tags.junction === 'roundabout' ? 1 : 0;
    for (let i = 0; i < road.points.length - 1; i++) {
      const a = `${road.nodeIds[i]}:${road.grade}`, b = `${road.nodeIds[i + 1]}:${road.grade}`;
      nodes[a] ||= { id: a, point: road.points[i], edges: [] }; nodes[b] ||= { id: b, point: road.points[i + 1], edges: [] };
      const length = Math.hypot(road.points[i + 1][0] - road.points[i][0], road.points[i + 1][1] - road.points[i][1]);
      if (length < 0.2) continue;
      const add = (from, to) => { const edge = { from, to, length, width: road.width, roadId: road.id, name: road.name }; nodes[from].edges.push(edges.length); edges.push(edge); };
      if (one >= 0) add(a, b); if (one <= 0) add(b, a);
    }
  }
  return { nodes, edges };
}
export function nearestNode(graph, point) {
  let best = null, dist = Infinity;
  for (const n of Object.values(graph.nodes)) { const d = Math.hypot(n.point[0] - point[0], n.point[1] - point[1]); if (d < dist) { dist = d; best = n.id; } }
  return best;
}
export function route(graph, start, end) {
  if (!graph.nodes[start] || !graph.nodes[end]) return [];
  const costs = new Map([[start, 0]]), previous = new Map(), open = new Set([start]);
  while (open.size) {
    let current = null;
    for (const id of open) if (current === null || costs.get(id) < costs.get(current)) current = id;
    open.delete(current); if (current === end) break;
    for (const index of graph.nodes[current].edges) {
      const edge = graph.edges[index], cost = costs.get(current) + edge.length;
      if (cost < (costs.get(edge.to) ?? Infinity)) { costs.set(edge.to, cost); previous.set(edge.to, current); open.add(edge.to); }
    }
  }
  if (!costs.has(end)) return [];
  const path = [end]; while (path[0] !== start) path.unshift(previous.get(path[0]));
  return path.map(id => graph.nodes[id].point);
}
