import * as THREE from 'three/webgpu';
import { closestPoint,nearestNode,route,unproject } from './geo.js';
import { nearestRoadPosition } from './controllers.js';
import { landmarkRegistry } from './landmarks.js';

export class UruapanMap{
  constructor(data,controllers,cameras,traffic=null){
    this.data=data;this.controllers=controllers;this.cameras=cameras;this.traffic=traffic;this.path=[];this.last=0;this.scale=0.43;this.direction=new THREE.Vector3();
    this.landmarks=landmarkRegistry(data);this.destinations=this.landmarks.filter(p=>p.point);
    this.destinations.unshift({name:'Centro Histórico · Plaza Mártires',point:[0,0]});
    const select=document.getElementById('destination');this.destinations.forEach((p,i)=>{const option=new Option(p.name,String(i));select.add(option);});
    for(const id of ['map-open','map-expand'])document.getElementById(id).onclick=()=>this.open();
    document.getElementById('route').onclick=()=>this.calculate();document.getElementById('go').onclick=()=>this.go();document.getElementById('map-home').onclick=()=>{this.controllers.home();this.cameras.initialized=false;this.renderFull();};
    addEventListener('keydown',e=>{if(e.code==='KeyM'&&!e.repeat&&!['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)){const dialog=document.getElementById('full-map');if(dialog.open)dialog.close();else if(!document.querySelector('dialog[open]'))this.open();}});
    document.getElementById('minimap').onclick=()=>this.open();
    document.getElementById('minimap').addEventListener('wheel',e=>{e.preventDefault();this.scale=Math.max(.15,Math.min(1.2,this.scale*(e.deltaY>0?.85:1.15)));},{passive:false});
  }
  open(){this.controllers.resetInput();document.getElementById('full-map').showModal();this.renderFull();}
  destination(){const value=document.getElementById('destination').value;return value===''?null:this.destinations[Number(value)];}
  calculate(){
    const destination=this.destination();if(!destination)return;
    const p=this.controllers.getActiveEntity().position,graph=this.controllers.activeMode==='person'?this.data.walkGraph:this.data.graph;
    this.path=route(graph,nearestNode(graph,[p.x,p.z]),nearestNode(graph,destination.point));
    const distance=this.path.slice(1).reduce((sum,b,i)=>sum+Math.hypot(b[0]-this.path[i][0],b[1]-this.path[i][1]),0);
    document.getElementById('route-status').textContent=this.path.length?`${destination.name} · ${(distance/1000).toFixed(2)} km sobre la red OSM. Acceso final al sitio no modelado; sin restricciones de giro.`:'No hay una ruta conectada para este modo. Prueba a pie o elige otro destino.';
    this.renderFull();
  }
  go(){const d=this.destination();if(!d)return;const p=nearestRoadPosition(this.data,...d.point);this.controllers.teleportActiveTo(p.x,p.z,p.heading);this.cameras.initialized=false;document.getElementById('full-map').close();}
  draw(canvas,center,scale,yaw=0,full=false){
    const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=full?'#dfdfd0':'#203c40';ctx.fillRect(0,0,w,h);
    ctx.save();ctx.translate(w/2,h/2);ctx.rotate(yaw);ctx.scale(scale,scale);ctx.translate(-center[0],-center[1]);
    const line=(points)=>{ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));};
    for(const area of this.data.areas){line(area.ring);ctx.closePath();for(const hole of area.holes || []){hole.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();}ctx.fillStyle=area.tags.natural==='water'?(full?'#91bdc4':'#36626d'):(full?'#a6bf9a':'#355c4f');ctx.fill('evenodd');}
    ctx.lineCap='round';ctx.lineJoin='round';
    for(const road of this.data.roads){if(road.grade!==0)continue;line(road.points);ctx.lineWidth=(road.width+3);ctx.strokeStyle=full?'#c7c9bb':'#526966';ctx.stroke();line(road.points);ctx.lineWidth=Math.max(road.width,2/scale);ctx.strokeStyle=full?'#f6f4e8':'#8d9b8b';ctx.stroke();}
    for(const b of this.data.buildings){line(b.ring);ctx.closePath();ctx.fillStyle=full?'#baaa8e':'#b19e79';ctx.fill();}
    if(this.path.length){line(this.path);ctx.strokeStyle=full?'#25868a':'#d5e3a4';ctx.lineWidth=4/scale;ctx.stroke();}
    if(this.traffic)for(const actor of this.traffic.cars){ctx.fillStyle=full?'#d68a57':'#ecae72';ctx.fillRect(actor.x-1.5/scale,actor.z-1.5/scale,3/scale,3/scale);}
    for(const [mode,e] of Object.entries(this.controllers.entities))if(mode!==this.controllers.activeMode){ctx.fillStyle=full?'#716b61':'#bda47b';ctx.beginPath();ctx.arc(e.position.x,e.position.z,3/scale,0,Math.PI*2);ctx.fill();}
    if(full){ctx.font=`${12/scale}px sans-serif`;ctx.textAlign='center';for(const poi of this.destinations){ctx.fillStyle='#265457';ctx.beginPath();ctx.arc(...poi.point,5/scale,0,Math.PI*2);ctx.fill();ctx.fillText(poi.name,poi.point[0],poi.point[1]-12/scale);}const seen=new Set();for(const road of this.data.roads){if(!road.name||seen.has(road.name)||road.points.length<2)continue;seen.add(road.name);if(seen.size%4)continue;const p=road.points[Math.floor(road.points.length/2)];ctx.fillStyle='#4a625b';ctx.font=`${9/scale}px sans-serif`;ctx.fillText(road.name,...p);}}
    const p=this.controllers.getActiveEntity();ctx.translate(p.position.x,p.position.z);ctx.rotate(-p.heading);ctx.scale(1/scale,1/scale);ctx.beginPath();ctx.moveTo(0,9);ctx.lineTo(-6,-7);ctx.lineTo(0,-4);ctx.lineTo(6,-7);ctx.closePath();ctx.fillStyle=full?'#a45332':'#d5e3a4';ctx.strokeStyle=full?'#fff':'#112b30';ctx.lineWidth=2;ctx.fill();ctx.stroke();ctx.restore();
    ctx.fillStyle=full?'#1e514c':'#d5e3a4';ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.save();ctx.translate(w-20,22);ctx.rotate(yaw);ctx.fillText('N',0,0);ctx.restore();ctx.fillStyle=full?'#3e5550':'#a4b8b4';ctx.font='9px sans-serif';ctx.fillRect(14,h-18,100*scale,2);ctx.textAlign='left';ctx.fillText('100 m',14,h-23);
  }
  renderFull(){const b=this.data.bounds,c=[(b.minX+b.maxX)/2,(b.minZ+b.maxZ)/2],canvas=document.getElementById('large-map');this.draw(canvas,c,Math.min(canvas.width/(b.maxX-b.minX+200),canvas.height/(b.maxZ-b.minZ+200)),0,true);}
  update(now){if(now-this.last<160)return;this.last=now;const p=this.controllers.getActiveEntity().position,dir=this.cameras.camera.getWorldDirection(this.direction);const yaw=-Math.atan2(dir.x,-dir.z);this.draw(document.getElementById('minimap'),[p.x,p.z],this.scale,yaw);
    const geo=unproject(p.x,p.z);document.getElementById('coordinates').textContent=`${geo.lat.toFixed(5)}° N · ${Math.abs(geo.lon).toFixed(5)}° O`;
    let name='Centro Histórico',best=Infinity;for(const road of this.data.roads){if(!road.name)continue;for(let i=0;i<road.points.length-1;i++){const q=closestPoint([p.x,p.z],road.points[i],road.points[i+1]),d=Math.hypot(q[0]-p.x,q[1]-p.z);if(d<best){best=d;name=road.name;}}}document.getElementById('street').textContent=best<80?name:'Uruapan · zona importada';if(document.getElementById('full-map').open)this.renderFull();
  }
}
