import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { inside, inFeature, closestPoint } from './geo.js';

const palette = [0xe7cfad,0xc89576,0xdacdc0,0xd1ad67,0xc9d2c4,0xc57c62,0xe4ddd1,0x98a7ac];
export function createMaterials() {
  const standard = color => new THREE.MeshStandardNodeMaterial({ color, roughness:0.92 });
  return { walls:palette.map(standard),road:standard(0x454d50),sidewalk:standard(0xb8b1a3),plaza:standard(0xc6b99e),green:standard(0x608364),water:standard(0x427d88),roof:standard(0x937f69),glass:standard(0x30484d),door:standard(0x624c3d),trunk:standard(0x6c5542),leaf:standard(0x3d694f),metal:standard(0x445551),light:new THREE.MeshBasicNodeMaterial({color:0xffdf99}) };
}
function shapeOf(feature) {
  // Shape XY is mapped to world X/-Z by rotation; this keeps upward normals.
  const shape = new THREE.Shape(feature.ring.map(p=>new THREE.Vector2(p[0],-p[1])));
  for(const hole of feature.holes || [])shape.holes.push(new THREE.Path(hole.map(p=>new THREE.Vector2(p[0],-p[1]))));
  return shape;
}
function surface(feature,y,height=0) {
  const shape=shapeOf(feature);
  const g=height?new THREE.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false,steps:1}):new THREE.ShapeGeometry(shape);
  g.rotateX(-Math.PI/2);g.translate(0,y,0);return g;
}
function strip(a,b,width,y) {
  const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
  const g=new THREE.PlaneGeometry(width,length+0.15);g.rotateX(-Math.PI/2);g.rotateY(Math.atan2(b[0]-a[0],b[1]-a[1]));g.translate((a[0]+b[0])/2,y,(a[1]+b[1])/2);return g;
}
function batchInstances(group,geometry,material,transforms,name) {
  if(!transforms.length){geometry.dispose();return;}
  const mesh=new THREE.InstancedMesh(geometry,material,transforms.length), dummy=new THREE.Object3D();
  mesh.name=name;
  transforms.forEach((t,i)=>{dummy.position.set(...t.p);dummy.rotation.set(0,t.r || 0,0);dummy.scale.set(...t.s);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
  mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
}
export function buildSector(data,materials,terrain) {
  const group=new THREE.Group();group.name=`Sector ${data.id}`;
  const batches=new Map(), windows=[],doors=[],balconies=[],trunks=[],leaves=[],poles=[],lamps=[];
  const add=(g,m)=>{if(!batches.has(m))batches.set(m,[]);batches.get(m).push(g);};
  for(const road of data.roads) {
    if(road.grade!==0)continue; // No fictitious bridge elevations or ground crossings.
    const [a,b]=road.points,y=terrain.sample((a[0]+b[0])/2,(a[1]+b[1])/2);
    add(strip(a,b,road.width+3,y+0.10),materials.sidewalk);
    add(strip(a,b,road.width,y+0.13),road.drivable?materials.road:materials.plaza);
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]),dx=(b[0]-a[0])/length,dz=(b[1]-a[1])/length;
    // Decorative street lamps: positions are a procedural approximation, never geographic claims.
    if(road.drivable && length>24)for(let t=12;t<length;t+=42){const x=a[0]+dx*t-dz*(road.width/2+0.8),z=a[1]+dz*t+dx*(road.width/2+0.8);poles.push({p:[x,y+2.8,z],s:[0.09,5.4,0.09]});lamps.push({p:[x,y+5.6,z],s:[0.6,0.18,0.6]});}
  }
  for(const area of data.areas) {
    const water=area.tags.natural==='water'||area.tags.waterway==='riverbank';
    const green=area.tags.leisure==='park'||area.tags.leisure==='garden'||['forest','grass','recreation_ground'].includes(area.tags.landuse)||['wood','scrub','grassland'].includes(area.tags.natural);
    const y=terrain.sample((area.bounds.minX+area.bounds.maxX)/2,(area.bounds.minZ+area.bounds.maxZ)/2);
    add(surface(area,y+0.06),water?materials.water:green?materials.green:materials.plaza);
    if(green){const b=area.bounds;for(let x=b.minX+5;x<b.maxX;x+=17)for(let z=b.minZ+5;z<b.maxZ;z+=17){if(!inFeature(area,x,z)||data.buildings.some(f=>inFeature(f,x,z)))continue;const onRoad=data.roads.some(r=>{const p=closestPoint([x,z],...r.points);return Math.hypot(x-p[0],z-p[1])<r.width/2+2;});if(onRoad)continue;const h=4+Math.abs(Math.sin(x*12+z))*3;trunks.push({p:[x,y+h/2,z],s:[0.24,h,0.24]});leaves.push({p:[x,y+h,z],s:[2.5,h*0.5,2.5]});}}
  }
  for(const building of data.buildings) {
    const b=building.bounds,cx=(b.minX+b.maxX)/2,cz=(b.minZ+b.maxZ)/2,y=terrain.sample(cx,cz)+0.16,h=building.height;
    const seed=Number(building.id.split('/')[1]) || 1;
    add(surface(building,y,h),materials.walls[seed%palette.length]);
    add(surface(building,y+h+0.04),materials.roof);
    const levels=Math.max(1,Math.round(h/3));
    for(let i=0;i<building.ring.length;i++){
      const a=building.ring[i],c=building.ring[(i+1)%building.ring.length],length=Math.hypot(c[0]-a[0],c[1]-a[1]);
      if(length<3)continue;
      const angle=Math.atan2(c[0]-a[0],c[1]-a[1]),n=Math.min(18,Math.floor(length/3.4));
      for(let j=0;j<n;j++)for(let floor=0;floor<Math.min(8,levels);floor++){
        const t=(j+0.5)/n,p=[a[0]+(c[0]-a[0])*t,y+1.7+floor*3,a[1]+(c[1]-a[1])*t];
        windows.push({p,s:[0.12,1.12,1.3],r:angle});
        if(floor===1 && j%3===0)balconies.push({p:[p[0],p[1]-0.8,p[2]],s:[0.8,0.1,1.65],r:angle});
      }
      if(i===0)doors.push({p:[(a[0]+c[0])/2,y+1.1,(a[1]+c[1])/2],s:[0.15,2.2,1.3],r:angle});
    }
  }
  for(const [material,geometries] of batches){
    // Common attribute schema for both extrusions and planes (position, normal, uv).
    const normalized=geometries.map(g=>g.index?g.toNonIndexed():g);
    const merged=mergeGeometries(normalized,false);
    if(!merged)throw new Error(`No se pudo crear geometría del sector ${data.id}`);
    const mesh=new THREE.Mesh(merged,material);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
    for(const g of new Set([...geometries,...normalized]))g.dispose();
  }
  for(const [material,items,name] of [[materials.glass,windows,'Ventanas'],[materials.door,doors,'Puertas'],[materials.roof,balconies,'Balcones'],[materials.trunk,trunks,'Troncos'],[materials.metal,poles,'Alumbrado provisional'],[materials.light,lamps,'Luminarias']])batchInstances(group,new THREE.BoxGeometry(1,1,1),material,items,name);
  batchInstances(group,new THREE.IcosahedronGeometry(1,1),materials.leaf,leaves,'Árboles provisionales');
  return group;
}
export class SectorManager {
  constructor(scene,manifest,base,terrain){this.scene=scene;this.manifest=manifest;this.base=base;this.terrain=terrain;this.materials=createMaterials();this.loaded=new Map();this.pending=new Set();this.radius=600;this.generation=0;this.errors=[];}
  async update(position) {
    this.focus={x:position.x,z:position.z};
    const size=this.manifest.sectorSize,wanted=new Set();
    const near=this.manifest.sectors.filter(s=>Math.hypot((s.x+0.5)*size-position.x,(s.z+0.5)*size-position.z)<this.radius+size);
    near.sort((a,b)=>Math.hypot((a.x+.5)*size-position.x,(a.z+.5)*size-position.z)-Math.hypot((b.x+.5)*size-position.x,(b.z+.5)*size-position.z));
    near.forEach(s=>wanted.add(s.id));this.wanted=wanted;
    for(const [id,group] of this.loaded)if(!wanted.has(id)){this.scene.remove(group);group.traverse(o=>o.geometry?.dispose());this.loaded.delete(id);}
    const next=near.filter(s=>!this.loaded.has(s.id)&&!this.pending.has(s.id));
    await Promise.all(next.slice(0,Math.max(0,3-this.pending.size)).map(async s=>{
      this.pending.add(s.id);
      try{const response=await fetch(new URL(s.url,this.base));if(!response.ok)throw new Error(`Sector ${s.id}: HTTP ${response.status}`);const data=await response.json();if(!this.wanted.has(s.id))return;const group=buildSector(data,this.materials,this.terrain);this.scene.add(group);this.loaded.set(s.id,group);}
      catch(e){this.errors.push(e.message);console.error(e);}
      finally{this.pending.delete(s.id);}
    }));
  }
  dispose(){for(const group of this.loaded.values()){this.scene.remove(group);group.traverse(o=>o.geometry?.dispose());}this.loaded.clear();for(const m of Object.values(this.materials).flat())m.dispose();}
}
