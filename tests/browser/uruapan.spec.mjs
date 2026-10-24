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
test('Nueva York original inicia con el motor fijado',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('new-york.html');await expect(page.locator('#loading-overlay')).toHaveClass(/hidden/,{timeout:150000});
  expect(errors).toEqual([]);await page.screenshot({path:'docs/screenshots/new-york.png'});
});
