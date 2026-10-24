import { ThirdPersonControllerManager } from '../controllers.js';
import { closestPoint, nearestNode } from './geo.js';

export function nearestRoadPosition(data,x,z){
  let best=null,distance=Infinity;
  for(const road of data.roads){if(!road.drivable||road.grade!==0)continue;
    for(let i=0;i<road.points.length-1;i++){const a=road.points[i],b=road.points[i+1],point=closestPoint([x,z],a,b),d=Math.hypot(x-point[0],z-point[1]);if(d<distance){distance=d;best={x:point[0],z:point[1],heading:Math.atan2(b[0]-a[0],b[1]-a[1])+(road.tags.oneway==='-1'?Math.PI:0)};}}
  }
  return best || {x:0,z:0,heading:0};
}
export class UruapanControllers extends ThirdPersonControllerManager{
  constructor(scene,data,terrain){
    const colliders=data.buildings.map(b=>({...b.bounds,ring:b.ring,holes:b.holes,minY:terrain.sample((b.bounds.minX+b.bounds.maxX)/2,(b.bounds.minZ+b.bounds.maxZ)/2)+.16,maxY:terrain.sample((b.bounds.minX+b.bounds.maxX)/2,(b.bounds.minZ+b.bounds.maxZ)/2)+.16+b.height}));
    super(scene,colliders,{bounds:data.bounds,groundHeight:(x,z)=>terrain.sample(x,z)+.16});
    this.data=data;this.terrain=terrain;
    // The original models are retained; all positions, bounds and terrain are local to Uruapan.
    for(const e of Object.values(this.entities))e.position.set(100000,1000,100000);
    const spawn=nearestRoadPosition(data,0,0);
    for(const [index,mode] of ['car','cyclist','helicopter','person'].entries()){
      super.setMode(mode);
      const p=mode==='person'?{x:0,z:0,heading:0}:nearestRoadPosition(data,spawn.x+index*12,spawn.z+index*12);
      this.teleportActiveTo(p.x,p.z,p.heading,mode==='helicopter'?65:null);
    }
    super.setMode('person');this.poseCharacters(0);
  }
  chooseMode(mode){
    if(!this.entities[mode])return;
    this.resetInput();super.setMode(mode);
    this.refreshVisibility();
  }
  refreshVisibility(){
    // The person is the rider while driving, so its separate world rig is hidden.
    this.entities.person.mesh.visible=this.activeMode==='person';
    for(const mesh of this.entities.person.crowd.meshes)mesh.visible=this.activeMode==='person';
  }
  home(){
    const p=this.activeMode==='person'?{x:0,z:0,heading:0}:nearestRoadPosition(this.data,0,0);
    this.teleportActiveTo(p.x,p.z,p.heading,this.activeMode==='helicopter'?65:null);
  }
  enterExit(){
    const active=this.getActiveEntity();
    if(this.activeMode==='person'){
      const car=this.entities.car;
      if(active.position.distanceTo(car.position)>7)return 'Acércate al automóvil (menos de 7 m) para entrar con F.';
      this.chooseMode('car');return 'Al volante · F para salir';
    }
    const p={x:active.position.x+Math.cos(active.heading)*3.4,z:active.position.z-Math.sin(active.heading)*3.4,heading:active.heading};
    this.chooseMode('person');this.teleportActiveTo(p.x,p.z,p.heading);return 'A pie · F cerca de un automóvil para entrar';
  }
  update(dt,elapsed){super.update(dt,elapsed);this.refreshVisibility();}
}
