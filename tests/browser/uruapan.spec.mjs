import { test,expect } from '@playwright/test';
test.beforeEach(async({page})=>{page.on('console',m=>{if(m.type()==='error')page.__gpuErrors.push(m.text());});page.__gpuErrors=[];});
test.afterEach(async({page})=>{expect(page.__gpuErrors,'La consola de GPU debe estar libre de errores').toEqual([]);});
test('Uruapan carga datos y geometrías reales sin errores',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./');await page.waitForFunction(()=>window.uruapan?.ready,{timeout:120000});
  await expect(page.locator('#loading')).toBeHidden();
  await page.screenshot({path:'docs/screenshots/uruapan-inicio.png'});
  await page.locator('#start').click();
  const state=await page.evaluate(()=>({buildings:uruapan.data.stats.buildings,sectors:uruapan.sectors.loaded.size,errors:uruapan.sectors.errors,triangles:uruapan.renderer.info.render.triangles}));
  expect(state.buildings).toBeGreaterThan(0);expect(state.sectors).toBeGreaterThan(0);expect(state.errors).toEqual([]);expect(state.triangles).toBeGreaterThan(0);expect(errors).toEqual([]);
  await page.screenshot({path:'docs/screenshots/uruapan-centro.png'});
});
test('caminar, saltar, colisiones y cambiar cámaras en Uruapan',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('./');await page.waitForFunction(()=>window.uruapan?.ready);await page.locator('#start').click();
  const before=await page.evaluate(()=>uruapan.controllers.entities.person.position.toArray());
  await page.keyboard.down('w');await expect.poll(()=>page.evaluate(()=>uruapan.controllers.entities.person.speed)).toBeGreaterThan(1);await page.keyboard.up('w');
  const after=await page.evaluate(()=>uruapan.controllers.entities.person.position.toArray());expect(Math.hypot(after[0]-before[0],after[2]-before[2])).toBeGreaterThan(.1);
  await page.keyboard.down('Space');await expect.poll(()=>page.evaluate(()=>uruapan.controllers.entities.person.position.y)).toBeGreaterThan(.25);await page.keyboard.up('Space');
  await page.keyboard.press('v');await expect(page.locator('#camera-label')).toHaveText('Exterior baja');await page.keyboard.press('v');await expect(page.locator('#camera-label')).toContainText('Primera persona');await page.keyboard.press('v');await expect(page.locator('#camera-label')).toHaveText('Vista aérea');await page.keyboard.press('v');await expect(page.locator('#camera-label')).toHaveText('Cámara libre');
  const collision=await page.evaluate(()=>{const c=uruapan.controllers,b=uruapan.data.buildings.find(b=>b.ring.length===4),p=uruapan.controllers.entities.person.position.clone();const [a,d]=b.ring;p.set((a[0]+d[0])/2,.16,(a[1]+d[1])/2);const before=p.clone();c.resolveHorizontalCollision(p,.48);return p.distanceTo(before);});expect(collision).toBeGreaterThan(.1);
  await page.keyboard.press('r');expect(errors).toEqual([]);
});
test('automóvil, bicicleta, helicóptero y entrada/salida',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('./');await page.waitForFunction(()=>window.uruapan?.ready);await page.locator('#start').click();
  await page.evaluate(()=>{const c=uruapan.controllers,p=c.entities.car.position;c.teleportActiveTo(p.x+3,p.z,c.entities.car.heading);});await page.keyboard.press('f');await expect(page.locator('#mode-label')).toHaveText('AUTOMÓVIL');
  await page.keyboard.down('w');await expect.poll(()=>page.evaluate(()=>uruapan.controllers.entities.car.speed)).toBeGreaterThan(2);await page.keyboard.up('w');const speed=await page.evaluate(()=>uruapan.controllers.entities.car.speed);
  await page.keyboard.down('s');await expect.poll(()=>page.evaluate(()=>uruapan.controllers.entities.car.speed)).toBeLessThan(speed);await page.keyboard.up('s');await page.keyboard.press('r');
  await page.keyboard.press('f');await expect(page.locator('#mode-label')).toHaveText('A PIE');
  await page.locator('[data-mode="cyclist"]').click();await page.keyboard.down('w');await expect.poll(()=>page.evaluate(()=>uruapan.controllers.entities.cyclist.speed)).toBeGreaterThan(1);await page.keyboard.up('w');
  await page.locator('[data-mode="helicopter"]').click();const altitude=await page.evaluate(()=>uruapan.controllers.entities.helicopter.position.y);await page.keyboard.down('Space');await expect.poll(()=>page.evaluate(()=>uruapan.controllers.entities.helicopter.position.y)).toBeGreaterThan(altitude+.1);await page.keyboard.up('Space');
  await page.keyboard.press('r');await expect.poll(()=>page.evaluate(()=>uruapan.controllers.entities.helicopter.speed)).toBe(0);expect(errors).toEqual([]);
});
test('minimapa, GPS, tráfico, destinos y ajustes gráficos',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.goto('./');await page.waitForFunction(()=>window.uruapan?.ready);await page.locator('#start').click();
  await expect.poll(()=>page.evaluate(()=>uruapan.traffic.carMesh.count)).toBeGreaterThan(0);
  const before=await page.evaluate(()=>uruapan.traffic.cars.map(c=>[c.x,c.z]));await expect.poll(()=>page.evaluate(old=>uruapan.traffic.cars.some((c,i)=>Math.hypot(c.x-old[i][0],c.z-old[i][1])>.1),before)).toBe(true);
  await page.keyboard.press('m');await expect(page.locator('#full-map')).toBeVisible();await page.locator('#destination').selectOption('2');await page.locator('#route').click();await expect(page.locator('#route-status')).toContainText('km');await page.screenshot({path:'docs/screenshots/uruapan-mapa.png'});await page.locator('#go').click();await expect(page.locator('#full-map')).not.toBeVisible();
  await page.locator('#settings-open').click();await page.locator('#distance').selectOption('360');await page.locator('#resolution').selectOption('0.65');await page.locator('#time').selectOption('night');await page.locator('[data-close="settings"]').click();expect(await page.evaluate(()=>uruapan.sectors.radius)).toBe(360);expect(await page.evaluate(()=>uruapan.renderer.getPixelRatio())).toBe(.65);expect(errors).toEqual([]);
});
test('Nueva York original inicia con el motor fijado',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('new-york.html');await expect(page.locator('#loading-overlay')).toHaveClass(/hidden/,{timeout:150000});
  expect(errors).toEqual([]);await page.screenshot({path:'docs/screenshots/new-york.png'});
});
test('sectores descargan memoria, vuelven a cargar y soportan 1440p',async({page})=>{
  await page.setViewportSize({width:2560,height:1440});await page.goto('./');await page.waitForFunction(()=>window.uruapan?.ready);await page.locator('#start').click();
  await page.evaluate(()=>{uruapan.sectors.radius=360;uruapan.controllers.teleportActiveTo(-900,-650,0);});
  await expect.poll(()=>page.evaluate(()=>uruapan.sectors.evicted)).toBeGreaterThan(0);await expect.poll(()=>page.evaluate(()=>uruapan.sectors.pending.size)).toBe(0);
  const ids=await page.evaluate(()=>[...uruapan.sectors.loaded.keys()]);await page.locator('#home').click();await expect.poll(()=>page.evaluate(old=>[...uruapan.sectors.loaded.keys()].some(id=>!old.includes(id)),ids)).toBe(true);
  const state=await page.evaluate(()=>({loaded:uruapan.sectors.loaded.size,pending:uruapan.sectors.pending.size,errors:uruapan.sectors.errors}));expect(state.loaded).toBeLessThan(50);expect(state.pending).toBeLessThanOrEqual(3);expect(state.errors).toEqual([]);await page.screenshot({path:'docs/screenshots/uruapan-1440p.png'});
});
test('fallback WebGL2 dibuja la ciudad sin errores de shader',async({page})=>{
  await page.addInitScript(()=>Object.defineProperty(navigator,'gpu',{value:undefined}));await page.goto('./');await page.waitForFunction(()=>window.uruapan?.ready);await page.locator('#start').click();await expect(page.locator('#renderer-label')).toHaveText('WEBGL2');await expect.poll(()=>page.evaluate(()=>uruapan.renderer.info.render.triangles)).toBeGreaterThan(0);await page.locator('[data-mode="car"]').click();await page.keyboard.press('v');await page.screenshot({path:'docs/screenshots/uruapan-webgl2.png'});
});
