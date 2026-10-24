import * as THREE from 'three/webgpu';
import { BODY_SPECS,buildCarGeometry,createLoftedCarMaterial } from '../actor-models.js';
import { PersonCrowd,PersonRig } from '../pedestrians.js';
import { inFeature } from './geo.js';

// State follows directed OSM edges; sin cuadrículas ajenas ni conexiones por cruces geométricos.
export class GraphAgent{
  constructor(graph,edge,index=0){this.graph=graph;this.edge=edge;this.t=0;this.index=index;this.wait=0;this.steps=0;this.previous=null;this.x=0;this.z=0;this.heading=0;}
  advance(distance,reservations=null,now=0){
    let budget=distance;
    for(let step=0;step<8&&budget>0;step++){
      const edge=this.graph.edges[this.edge];if(!edge)return;
      const remaining=edge.length-this.t;
      if(budget<remaining){this.t+=budget;budget=0;break;}
      const node=this.graph.nodes[edge.to];
      if(reservations&&node.edges.length>2){const owner=reservations.get(edge.to);if(owner&&owner.index!==this.index&&owner.until>now){this.t=Math.max(0,edge.length-2);budget=0;break;}reservations.set(edge.to,{index:this.index,until:now+1.3});}
      const options=node.edges.filter(i=>this.graph.edges[i].to!==edge.from),list=options.length?options:node.edges;
      if(!list.length){this.t=edge.length;budget=0;break;}
      this.previous=this.edge;this.edge=list[(this.index+this.steps++)%list.length];budget-=remaining;this.t=0;
    }
    this.locate();
  }
  locate(offset=0){const e=this.graph.edges[this.edge];if(!e)return;const a=this.graph.nodes[e.from].point,b=this.graph.nodes[e.to].point,t=Math.max(0,Math.min(1,this.t/e.length)),dx=(b[0]-a[0])/e.length,dz=(b[1]-a[1])/e.length;this.x=a[0]+(b[0]-a[0])*t-dz*offset;this.z=a[1]+(b[1]-a[1])*t+dx*offset;this.heading=Math.atan2(dx,dz);}
}
export class UruapanTraffic{
  constructor(scene,data,terrain){
    this.data=data;this.terrain=terrain;this.cars=[];this.walkers=[];this.reservations=new Map();this.maxCars=24;this.maxPeople=28;this.targetCars=24;this.targetPeople=28;this.fpsAverage=60;this.frame=0;this.nextAdjust=0;
    const graph=data.graph,walk=data.walkGraph;
    const sorted=(g)=>g.edges.map((e,i)=>({i,d:Math.hypot(...g.nodes[e.from].point)})).sort((a,b)=>a.d-b.d).map(e=>e.i);
    const edges=sorted(graph),walking=sorted(walk);
    const geometry=buildCarGeometry(BODY_SPECS.sedan,true),colors=new Float32Array(40*3);
    const palette=[0xddd9cc,0x456f7c,0xa15f4c,0xc5b37c,0x354a55,0xc0c5c6];for(let i=0;i<40;i++)new THREE.Color(palette[i%palette.length]).toArray(colors,i*3);
    geometry.setAttribute('paintColor',new THREE.InstancedBufferAttribute(colors,3));geometry.setAttribute('carState',new THREE.InstancedBufferAttribute(new Float32Array(40*4),4));
    this.carMesh=new THREE.InstancedMesh(geometry,createLoftedCarMaterial(BODY_SPECS.sedan),40);this.carMesh.count=0;this.carMesh.frustumCulled=false;this.carMesh.castShadow=true;this.carMesh.receiveShadow=true;scene.add(this.carMesh);
    this.crowd=new PersonCrowd(48,{farDistance:45});this.crowd.meshes.forEach(m=>scene.add(m));
    for(let i=0;i<40&&edges.length;i++){const actor=new GraphAgent(graph,edges[(i*11)%Math.min(edges.length,350)],i);actor.t=graph.edges[actor.edge].length*.4;actor.locate();this.cars.push(actor);}
    for(let i=0;i<48&&walking.length;i++){const actor=new GraphAgent(walk,walking[(i*9)%Math.min(walking.length,300)],i);actor.rig=new PersonRig({seed:i*.71+1,scale:.92+(i%4)*.04,girth:1,hair:.3});actor.t=walk.edges[actor.edge].length*.6;actor.locate();this.walkers.push(actor);}
    this.dummy=new THREE.Object3D();this.ground=(_,x,z)=>terrain.sample(x,z)+.16;
  }
  relocate(actor,focus){const choices=[];for(let i=0;i<actor.graph.edges.length;i++){const p=actor.graph.nodes[actor.graph.edges[i].from].point,d=Math.hypot(p[0]-focus.x,p[1]-focus.z);if(d>40&&d<320)choices.push(i);}if(choices.length){actor.edge=choices[(actor.index*17+this.frame)%choices.length];actor.t=0;actor.locate();}}
  update(dt,elapsed,focus,rawDt,player){
    this.frame++;this.fpsAverage+=(1/Math.max(.001,rawDt)-this.fpsAverage)*(1-Math.exp(-rawDt*1.5));
    const clock=performance.now()/1000;
    if(clock>this.nextAdjust){this.nextAdjust=clock+2;this.targetCars=Math.min(this.maxCars,this.fpsAverage<25?10:this.fpsAverage<40?18:40);this.targetPeople=Math.min(this.maxPeople,this.fpsAverage<25?12:this.fpsAverage<40?20:48);for(const [key,reservation] of this.reservations)if(reservation.until<elapsed)this.reservations.delete(key);}
    let count=0;
    for(const actor of this.cars.slice(0,this.targetCars)){
      const distance=Math.hypot(actor.x-focus.x,actor.z-focus.z);if(distance>750){if(this.frame%30===actor.index%30)this.relocate(actor,focus);continue;}
      const edge=actor.graph.edges[actor.edge],d=actor.graph.nodes[edge.to].point;let speed=5+actor.index%5;
      // Short-range following and player clearance. This is intentionally a basic traffic simulation.
      for(const other of this.cars.slice(0,this.targetCars)){if(other!==actor&&other.edge===actor.edge&&other.t>actor.t&&other.t-actor.t<8)speed=0;}
      const dx=player.position.x-actor.x,dz=player.position.z-actor.z,ahead=dx*Math.sin(actor.heading)+dz*Math.cos(actor.heading),side=Math.abs(dx*Math.cos(actor.heading)-dz*Math.sin(actor.heading));
      if(ahead>-2&&ahead<10&&side<3&&player.position.y<3)speed=0;
      actor.advance(speed*dt,this.reservations,elapsed);actor.locate(Math.min(1.6,edge.width*.22));
      if(this.data.buildings.some(b=>inFeature(b,actor.x,actor.z)))continue;
      this.dummy.position.set(actor.x,this.ground(null,actor.x,actor.z),actor.z);this.dummy.rotation.set(0,actor.heading,0);this.dummy.scale.setScalar(1);this.dummy.updateMatrix();this.carMesh.setMatrixAt(count++,this.dummy.matrix);
    }
    this.carMesh.count=count;this.carMesh.instanceMatrix.needsUpdate=true;
    this.crowd.begin();
    for(const actor of this.walkers.slice(0,this.targetPeople)){
      const distance=Math.hypot(actor.x-focus.x,actor.z-focus.z);if(distance>600){if(this.frame%30===actor.index%30)this.relocate(actor,focus);continue;}
      if(actor.rig.placed&&distance>180&&this.frame%3!==actor.index%3){this.crowd.add(actor.rig,distance);continue;}
      const step=dt*(distance>180?3:1),edge=actor.graph.edges[actor.edge];actor.advance((1.1+actor.index%3*.2)*step);actor.locate(edge.width/2+.9);
      if(this.data.buildings.some(b=>inFeature(b,actor.x,actor.z)))continue;
      actor.rig.update(step,actor.x,actor.z,actor.heading,this.ground,null,0);this.crowd.add(actor.rig,distance);
    }
    this.crowd.end();
  }
}
