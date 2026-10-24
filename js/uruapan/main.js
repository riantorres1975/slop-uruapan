import * as THREE from 'three/webgpu';
import { UruapanControllers } from './controllers.js';
import { UruapanCameras } from './cameras.js';
import { SectorManager } from './world.js';
import { Terrain } from './terrain.js';
import { UruapanMap } from './map.js';
import { UruapanTraffic } from './traffic.js';
import { cityUniforms } from '../tsl-materials.js';

async function boot(){
  const status=document.getElementById('loading-status');
  const params=new URLSearchParams(location.search),initialQuality=['low','medium','high'].includes(params.get('quality'))?params.get('quality'):'medium';
  const initialResolution=['0.65','1','1.5'].includes(params.get('resolution'))?Number(params.get('resolution')):1;
  document.getElementById('quality').value=initialQuality;document.getElementById('resolution').value=String(initialResolution);
  const renderer=new THREE.WebGPURenderer({antialias:initialQuality!=='low',powerPreference:'high-performance',forceWebGL:params.get('renderer')==='webgl'});
  renderer.setPixelRatio(initialResolution);renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=initialQuality!=='low';
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
  document.getElementById('viewport').append(renderer.domElement);await renderer.init();
  document.getElementById('renderer-label').textContent=renderer.backend.isWebGPUBackend?'WEBGPU':'WEBGL2';
  status.textContent='Leyendo calles y huellas reales de OpenStreetMap…';
  const base=new URL('../../data/uruapan/',import.meta.url),response=await fetch(new URL('manifest.json',base));
  if(!response.ok)throw new Error(`Datos geográficos: HTTP ${response.status}`);
  const data=await response.json(),terrain=new Terrain();
  const scene=new THREE.Scene();scene.background=new THREE.Color(0xaac4cd);scene.fog=new THREE.FogExp2(0xaac4cd,0.00065);
  const hemi=new THREE.HemisphereLight(0xe2f0ff,0x9b8870,2);scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xffe2b2,3.2);sun.position.set(-180,280,120);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-120,right:120,top:120,bottom:-120,near:1,far:800});sun.shadow.bias=-0.0003;scene.add(sun,sun.target);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(16000,16000),new THREE.MeshStandardNodeMaterial({color:0xb4ae9c,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-0.03;ground.receiveShadow=true;scene.add(ground);
  const sectors=new SectorManager(scene,data,base,terrain),controllers=new UruapanControllers(scene,data,terrain),cameras=new UruapanCameras(renderer.domElement,controllers),camera=cameras.camera;
  sectors.radius=initialQuality==='low'?360:initialQuality==='high'?1000:600;document.getElementById('distance').value=String(sectors.radius);
  const focus=controllers.getActiveEntity().position;
  for(let i=0;i<5;i++){status.textContent=`Construyendo sectores OSM… ${sectors.loaded.size}`;await sectors.update(focus);}
  const traffic=new UruapanTraffic(scene,data,terrain),map=new UruapanMap(data,controllers,cameras,traffic);
  traffic.maxCars=initialQuality==='low'?10:initialQuality==='high'?40:24;traffic.maxPeople=initialQuality==='low'?12:initialQuality==='high'?48:28;
  window.uruapan={renderer,scene,camera,data,sectors,terrain,focus,controllers,cameras,traffic,map,ready:false};
  document.getElementById('data-summary').textContent=`${data.stats.roads} vías · ${data.stats.buildings} edificios OSM · ${data.stats.sectors} sectores. ${data.stats.provisionalHeights} alturas provisionales. ${data.stats.unsupportedGrades} vías elevadas/túneles omitidas hasta disponer de DEM.`;
  for(const id of ['settings','help'])document.getElementById(`${id}-open`).onclick=()=>document.getElementById(id).showModal();
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>document.getElementById(b.dataset.close).close());
  let started=false;
  document.getElementById('start').onclick=()=>{controllers.resetInput();document.getElementById('welcome').close();started=true;cameras.initialized=false;};
  const updateMode=()=>{document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===controllers.activeMode));document.getElementById('mode-label').textContent=({person:'A PIE',car:'AUTOMÓVIL',cyclist:'BICICLETA',helicopter:'HELICÓPTERO'})[controllers.activeMode];};
  document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{controllers.chooseMode(b.dataset.mode);cameras.initialized=false;updateMode();});
  const changeCamera=()=>{cameras.cycle();document.getElementById('camera-label').textContent=cameras.getActivePreset().name;};
  document.getElementById('camera-cycle').onclick=changeCamera;
  const home=()=>{controllers.home();cameras.initialized=false;};document.getElementById('home').onclick=home;
  addEventListener('keydown',e=>{if(document.querySelector('dialog[open]')||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||e.repeat)return;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();const mode=({Digit1:'person',Digit2:'car',Digit3:'cyclist',Digit4:'helicopter'})[e.code];if(mode){controllers.chooseMode(mode);cameras.initialized=false;updateMode();}if(e.code==='KeyV')changeCamera();if(e.code==='KeyR')home();if(e.code==='KeyF'){document.getElementById('control-hint').textContent=controllers.enterExit();updateMode();}});
  document.getElementById('resolution').onchange=e=>{renderer.setPixelRatio(Number(e.target.value));renderer.setSize(innerWidth,innerHeight);};
  document.getElementById('distance').onchange=e=>{sectors.radius=Number(e.target.value);};
  document.getElementById('quality').onchange=e=>{const q=e.target.value;renderer.shadowMap.enabled=q!=='low';sectors.radius=q==='low'?360:q==='high'?1000:600;document.getElementById('distance').value=String(sectors.radius);traffic.maxCars=q==='low'?10:q==='high'?40:24;traffic.maxPeople=q==='low'?12:q==='high'?48:28;traffic.nextAdjust=0;};
  const dayColor=new THREE.Color(0xaac4cd),nightColor=new THREE.Color(0x122b40),sunDay=new THREE.Color(0xffe2b2),sunNight=new THREE.Color(0x9cbce6);
  let night=0;
  let last=performance.now(),frames=0,timer=0;
  let elapsed=0,nextSectorUpdate=0;
  // compileAsync temporarily changes renderer state. Finish before starting the render loop.
  cameras.update(0,0);await renderer.compileAsync(scene,camera);last=performance.now();
  renderer.setAnimationLoop(now=>{const raw=Math.max(0,(now-last)/1000),dt=Math.min(raw,.05);last=now;frames++;timer+=raw;elapsed+=dt;
    const paused=Boolean(document.querySelector('dialog[open]'));if(paused)controllers.resetInput();
    controllers.update(paused||cameras.activePresetId==='free'?0:dt,elapsed);cameras.update(paused?0:dt,elapsed);
    if(!started){camera.position.set(-120,110,180);camera.lookAt(60,0,-20);}
    const active=controllers.getActiveEntity();window.uruapan.focus=active.position;
    traffic.update(paused?0:dt,elapsed,active.position,raw,active);map.update(now);
    const time=document.getElementById('time').value,targetNight=time==='night'?1:time==='cycle'?(1-Math.cos(elapsed/60))*.5:0;night+=(targetNight-night)*(1-Math.exp(-dt*2));
    sun.intensity=3.2*(1-night)+.45*night;sun.color.copy(sunDay).lerp(sunNight,night);hemi.intensity=2*(1-night)+.55*night;scene.background.copy(dayColor).lerp(nightColor,night);scene.fog.color.copy(scene.background);cityUniforms.uInteriorGlow.value=.4+night;sectors.materials.light.color.setHex(night>.3?0xffdf99:0xbbb7a0);
    sun.position.set(active.position.x-180,time==='day'?400:280,active.position.z+120);sun.target.position.set(active.position.x,0,active.position.z);sun.target.updateMatrixWorld();
    renderer.render(scene,camera);if(now>nextSectorUpdate){sectors.update(cameras.activePresetId==='free'?camera.position:active.position);nextSectorUpdate=now+180;}
    if(timer>.5){document.getElementById('fps').textContent=Math.round(frames/timer);document.getElementById('speed').textContent=Math.round(Math.abs(active.speed)*3.6);document.getElementById('altitude').textContent=`${Math.round(active.position.y)} m`;frames=0;timer=0;}
    document.getElementById('sectors').textContent=`${sectors.loaded.size} sectores visibles · ${sectors.pending.size} en carga`;
  });
  addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});
  renderer.render(scene,camera);document.getElementById('loading').hidden=true;window.uruapan.ready=true;document.getElementById('welcome').showModal();
}
boot().catch(error=>{console.error(error);document.getElementById('loading-status').textContent='No se pudo iniciar la vista 3D. Prueba el modo compatible o actualiza el navegador.';document.querySelector('#loading progress').hidden=true;const link=document.getElementById('compatible'),url=new URL(location.href);url.searchParams.set('renderer','webgl');url.searchParams.set('quality','low');url.searchParams.set('resolution','0.65');link.href=url.href;link.hidden=false;});
