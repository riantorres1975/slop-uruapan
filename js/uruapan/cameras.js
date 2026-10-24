import * as THREE from 'three/webgpu';
import { CameraSystem } from '../cameras.js';
export const PRESETS=[{id:'chase',name:'Tercera persona',category:'follow',fov:56},{id:'action',name:'Exterior baja',category:'follow',fov:60},{id:'pov',name:'Primera persona / cabina',category:'follow',fov:68},{id:'aerial',name:'Vista aérea',category:'scenic',fov:52},{id:'free',name:'Cámara libre',category:'scenic',fov:60}];
export class UruapanCameras extends CameraSystem{
  constructor(canvas,controllers){super(canvas,controllers);this.index=0;this.camera.far=8000;this.camera.updateProjectionMatrix();this.freePosition=new THREE.Vector3();}
  getActivePreset(){return PRESETS.find(p=>p.id===this.activePresetId)||PRESETS[0];}
  cycle(){this.index=(this.index+1)%PRESETS.length;const p=PRESETS[this.index];this.activePresetId=p.id;this.initialized=false;this.followEntity=null;this.camera.fov=p.fov;this.camera.updateProjectionMatrix();if(p.id==='free'){this.freePosition.copy(this.camera.position);this.freeYaw=this.controllerManager.getActiveEntity().heading+this.orbitYawOffset;this.orbitYawOffset=0;}}
  update(dt,elapsed){
    const entity=this.controllerManager.getActiveEntity();
    if(this.activePresetId==='aerial'){
      const yaw=this.orbitYawOffset,distance=200*this.zoomMultiplier;
      this.camera.position.set(entity.position.x+Math.sin(yaw)*distance,entity.position.y+160*this.zoomMultiplier,entity.position.z+Math.cos(yaw)*distance);
      this.camera.lookAt(entity.position);this.currentPos.copy(this.camera.position);return;
    }
    if(this.activePresetId==='free'){
      const yaw=this.freeYaw+this.orbitYawOffset,k=this.controllerManager.keys,v=(k.boost?65:22)*dt,forward=(Number(k.forward)-Number(k.backward))*v,side=(Number(k.right)-Number(k.left))*v;
      this.freePosition.x+=Math.sin(yaw)*forward-Math.cos(yaw)*side;this.freePosition.z+=Math.cos(yaw)*forward+Math.sin(yaw)*side;this.freePosition.y=Math.max(.6,this.freePosition.y+(Number(k.up)-Number(k.down))*v);
      this.camera.position.copy(this.freePosition);this.camera.lookAt(this.freePosition.x+Math.sin(yaw)*20,this.freePosition.y-this.orbitPitchOffset*25,this.freePosition.z+Math.cos(yaw)*20);this.currentPos.copy(this.camera.position);return;
    }
    super.update(dt,elapsed);
    // Clip the follow boom against footprint bounds, before it enters a wall.
    if(this.activePresetId!=='pov'){
      const target=entity.position.clone().add(new THREE.Vector3(0,1.7,0)),direction=this.camera.position.clone().sub(target),length=direction.length();
      const ray=new THREE.Ray(target,direction.normalize()),hit=new THREE.Vector3();let safe=length;
      for(const c of this.controllerManager.colliders){const box=new THREE.Box3(new THREE.Vector3(c.minX,c.minY,c.minZ),new THREE.Vector3(c.maxX,c.maxY,c.maxZ));if(ray.intersectBox(box,hit)){const d=hit.distanceTo(target);if(d>0.2&&d<safe)safe=Math.max(.3,d-.5);}}
      if(safe<length){this.camera.position.copy(target).addScaledVector(direction,safe);this.camera.lookAt(target);}
    }
    this.currentPos.copy(this.camera.position);
  }
}
