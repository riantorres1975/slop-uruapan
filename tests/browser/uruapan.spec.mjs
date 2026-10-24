import { test,expect } from '@playwright/test';
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
test('Nueva York original inicia con el motor fijado',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('new-york.html');await expect(page.locator('#loading-overlay')).toHaveClass(/hidden/,{timeout:150000});
  expect(errors).toEqual([]);await page.screenshot({path:'docs/screenshots/new-york.png'});
});
