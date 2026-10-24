import * as THREE from 'three/webgpu';
import { UruapanControllers } from './controllers.js';
import { UruapanCameras } from './cameras.js';
import { SectorManager } from './world.js';
import { Terrain } from './terrain.js';

async function boot(){
  const status=document.getElementById('loading-status');
  const renderer=new THREE.WebGPURenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
  document.getElementById('viewport').append(renderer.domElement);await renderer.init();
  document.getElementById('renderer-label').textContent=renderer.backend.isWebGPUBackend?'WEBGPU':'WEBGL2';
  status.textContent='Leyendo calles y huellas reales de OpenStreetMap…';
  const base=new URL('../../data/uruapan/',import.meta.url),response=await fetch(new URL('manifest.json',base));
  if(!response.ok)throw new Error(`Datos geográficos: HTTP ${response.status}`);
  const data=await response.json(),terrain=new Terrain();
  const scene=new THREE.Scene();scene.background=new THREE.Color(0xaac4cd);scene.fog=new THREE.FogExp2(0xaac4cd,0.00065);
  const hemi=new THREE.HemisphereLight(0xe2f0ff,0x9b8870,2);scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xffe2b2,3.2);sun.position.set(-180,280,120);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-120,right:120,top:120,bottom:-120,near:1,far:800});sun.shadow.bias=-0.0003;scene.add(sun,sun.target);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(16000,16000),new THREE.MeshStandardNodeMaterial({color:0xb4ae9c,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-0.03;ground.receiveShadow=true;scene.add(ground);
  const sectors=new SectorManager(scene,data,base,terrain),controllers=new UruapanControllers(scene,data,terrain),cameras=new UruapanCameras(renderer.domElement,controllers),camera=cameras.camera;
  const focus=controllers.getActiveEntity().position;
  for(let i=0;i<5;i++){status.textContent=`Construyendo sectores OSM… ${sectors.loaded.size}`;await sectors.update(focus);}
  window.uruapan={renderer,scene,camera,data,sectors,terrain,focus,controllers,cameras,ready:false};
  document.getElementById('data-summary').textContent=`${data.stats.roads} vías · ${data.stats.buildings} edificios OSM · ${data.stats.sectors} sectores. ${data.stats.provisionalHeights} alturas provisionales. ${data.stats.unsupportedGrades} vías elevadas/túneles omitidas hasta disponer de DEM.`;
  for(const id of ['settings','help'])document.getElementById(`${id}-open`).onclick=()=>document.getElementById(id).showModal();
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>document.getElementById(b.dataset.close).close());
  document.getElementById('start').onclick=()=>document.getElementById('welcome').close();
  const updateMode=()=>{document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===controllers.activeMode));document.getElementById('mode-label').textContent=({person:'A PIE',car:'AUTOMÓVIL',cyclist:'BICICLETA',helicopter:'HELICÓPTERO'})[controllers.activeMode];};
  document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{controllers.chooseMode(b.dataset.mode);cameras.initialized=false;updateMode();});
  const changeCamera=()=>{cameras.cycle();document.getElementById('camera-label').textContent=cameras.getActivePreset().name;};
  document.getElementById('camera-cycle').onclick=changeCamera;
  const home=()=>{controllers.home();cameras.initialized=false;};document.getElementById('home').onclick=home;
  addEventListener('keydown',e=>{if(document.querySelector('dialog[open]')||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||e.repeat)return;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();const mode=({Digit1:'person',Digit2:'car',Digit3:'cyclist',Digit4:'helicopter'})[e.code];if(mode){controllers.chooseMode(mode);cameras.initialized=false;updateMode();}if(e.code==='KeyV')changeCamera();if(e.code==='KeyR')home();if(e.code==='KeyF'){document.getElementById('control-hint').textContent=controllers.enterExit();updateMode();}});
  for(const dialog of document.querySelectorAll('dialog')){dialog.addEventListener('close',()=>controllers.resetInput());}
  let last=performance.now(),frames=0,timer=0;
  let elapsed=0,nextSectorUpdate=0;
  renderer.setAnimationLoop(now=>{const raw=Math.max(0,(now-last)/1000),dt=Math.min(raw,.05);last=now;frames++;timer+=raw;elapsed+=dt;
    const paused=Boolean(document.querySelector('dialog[open]'));if(paused)controllers.resetInput();
    controllers.update(paused||cameras.activePresetId==='free'?0:dt,elapsed);cameras.update(paused?0:dt,elapsed);
    const active=controllers.getActiveEntity();window.uruapan.focus=active.position;
    sun.position.set(active.position.x-180,280,active.position.z+120);sun.target.position.set(active.position.x,0,active.position.z);sun.target.updateMatrixWorld();
    renderer.render(scene,camera);if(now>nextSectorUpdate){sectors.update(cameras.activePresetId==='free'?camera.position:active.position);nextSectorUpdate=now+180;}
    if(timer>.5){document.getElementById('fps').textContent=Math.round(frames/timer);document.getElementById('speed').textContent=Math.round(Math.abs(active.speed)*3.6);document.getElementById('altitude').textContent=`${Math.round(active.position.y)} m`;frames=0;timer=0;}
    document.getElementById('sectors').textContent=`${sectors.loaded.size} sectores visibles · ${sectors.pending.size} en carga`;
  });
  addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});
  await renderer.compileAsync(scene,camera);document.getElementById('loading').hidden=true;window.uruapan.ready=true;document.getElementById('welcome').showModal();
}
boot().catch(error=>{console.error(error);document.getElementById('loading-status').textContent=`No se pudo iniciar: ${error.message}. Recarga o usa un navegador con WebGPU/WebGL2.`;document.querySelector('#loading progress').hidden=true;});
