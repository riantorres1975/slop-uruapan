// Optional verified elevation grid, stored relative to an explicit vertical datum.
export class Terrain {
  constructor(grid=null){this.grid=grid;if(grid){if(!grid.source||!grid.datum||!Number.isFinite(grid.step)||grid.step<=0||grid.width<2||grid.height<2||grid.values.length!==grid.width*grid.height||!grid.values.every(Number.isFinite))throw new Error('DEM inválido o sin procedencia');}}
  sample(x,z){
    const g=this.grid;if(!g)return 0;
    const fx=(x-g.minX)/g.step,fz=(z-g.minZ)/g.step;
    if(fx<0||fz<0||fx>g.width-1||fz>g.height-1)throw new Error('Fuera del DEM: no se extrapolan alturas');
    const ix=Math.min(g.width-2,Math.floor(fx)),iz=Math.min(g.height-2,Math.floor(fz)),tx=fx-ix,tz=fz-iz;
    const at=(dx,dz)=>g.values[(iz+dz)*g.width+ix+dx]-g.baseElevation;
    return (at(0,0)*(1-tx)+at(1,0)*tx)*(1-tz)+(at(0,1)*(1-tx)+at(1,1)*tx)*tz;
  }
}
