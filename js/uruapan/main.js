import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
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
  const sectors=new SectorManager(scene,data,base,terrain),camera=new THREE.PerspectiveCamera(56,innerWidth/innerHeight,.1,8000);camera.position.set(-120,110,180);
  const orbit=new OrbitControls(camera,renderer.domElement);orbit.target.set(60,0,-20);orbit.update();
  const focus={x:0,z:0};
  for(let i=0;i<5;i++){status.textContent=`Construyendo sectores OSM… ${sectors.loaded.size}`;await sectors.update(focus);}
  window.uruapan={renderer,scene,camera,data,sectors,terrain,focus,orbit,ready:false};
  document.getElementById('data-summary').textContent=`${data.stats.roads} vías · ${data.stats.buildings} edificios OSM · ${data.stats.sectors} sectores. ${data.stats.provisionalHeights} alturas provisionales. ${data.stats.unsupportedGrades} vías elevadas/túneles omitidas hasta disponer de DEM.`;
  for(const id of ['settings','help'])document.getElementById(`${id}-open`).onclick=()=>document.getElementById(id).showModal();
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>document.getElementById(b.dataset.close).close());
  document.getElementById('start').onclick=()=>document.getElementById('welcome').close();
  let last=performance.now(),frames=0,timer=0;
  renderer.setAnimationLoop(now=>{const raw=(now-last)/1000;last=now;frames++;timer+=raw;orbit.update();renderer.render(scene,camera);sectors.update(focus);if(timer>.5){document.getElementById('fps').textContent=Math.round(frames/timer);frames=0;timer=0;}document.getElementById('sectors').textContent=`${sectors.loaded.size} sectores visibles · ${sectors.pending.size} en carga`;});
  addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});
  await renderer.compileAsync(scene,camera);document.getElementById('loading').hidden=true;window.uruapan.ready=true;document.getElementById('welcome').showModal();
}
boot().catch(error=>{console.error(error);document.getElementById('loading-status').textContent=`No se pudo iniciar: ${error.message}. Recarga o usa un navegador con WebGPU/WebGL2.`;document.querySelector('#loading progress').hidden=true;});
