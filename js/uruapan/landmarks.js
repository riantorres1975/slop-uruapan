// Model slots always use positions present in the imported OSM snapshot.
export const PRIORITIES=['Monumento a los Mártires de Uruapan','Mercado de Antojitos','Parque Nacional Barranca del Cupatitzio','Parroquia de San Francisco'];
export function landmarkRegistry(data){return PRIORITIES.map(name=>{const poi=data.pois.find(p=>p.name===name);return {name,osmId:poi?.id || null,point:poi?.point || null,status:poi?'huella/área OSM; modelo manual pendiente':'sin posición OSM en este recorte',modelUrl:null};});}
export async function loadLandmarkModel(slot,parent){
  if(!slot.point || !slot.modelUrl)return null;
  const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
  const gltf=await new GLTFLoader().loadAsync(slot.modelUrl);gltf.scene.position.set(slot.point[0],0,slot.point[1]);parent.add(gltf.scene);return gltf.scene;
}
