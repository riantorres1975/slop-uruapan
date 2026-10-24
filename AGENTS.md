# SLOP URUAPAN

## Arquitectura
- Aplicación estática ES modules, Three.js WebGPURenderer y TSL. Sin frameworks.
- El proyecto contiene únicamente Uruapan. `js/main.js` carga `js/uruapan/main.js`. La ruta histórica `new-york.html` sólo redirige al inicio; no contiene otro simulador.
- `index.html`, `js/uruapan/` y los componentes compartidos de `js/` implementan Uruapan. Ejes: X este, Y arriba, Z sur; 1 unidad = 1 metro.
- El motor publicado es un snapshot dev exacto: `tools/vendor-three.mjs` y `tools/three-integrity.json`. Requiere red sólo en el primer build, después usa `.cache/three/`. No cambiar el snapshot sin pruebas GPU completas.
- `tools/fetch-uruapan.mjs` descarga OSM sólo durante preparación. `tools/build-uruapan.mjs` valida y genera sectores estáticos en `data/uruapan/`.
- Separar datos, generación visual, simulación, controladores, mapa y UI. Reutilizar modelos y controles del motor original.
- Sin DEM fiable: terreno plano explícitamente provisional. Nunca inventar calles, huellas, monumentos ni alturas presentadas como mediciones.

## Reglas
- `origin`: riantorres1975/slop-uruapan; `upstream`: mrdoob/slop-newyork. Nunca hacer push a upstream ni reescribir ramas remotas.
- Desarrollo: `feat/uruapan`. Checkpoints por entrega A–G con pruebas antes del commit.
- Mantener LICENSE MIT original y atribución OSM visible; datos derivados bajo ODbL, código bajo MIT.
- Windows 11 / PowerShell: scripts Node multiplataforma, rutas con espacios. No depender de Bash para Uruapan.
- Modelos y fachadas provisionales deben identificarse; edificios emblemáticos reemplazables con GLB.
- No introducir secretos. No convertir pruebas omitidas o verificaciones bloqueadas en éxitos.

## Comandos
- `npm ci`, `npm run build`, `npm run dev` (http://localhost:4173/slop-uruapan/).
- `npm test`: pruebas del motor y geografía de Uruapan; no requiere Bash ni omite casos en Windows.
- `npm run check:static`: valida módulos, sectores, licencias y ausencia de datos de otra ciudad en el paquete.
- `npm run test:browser`: Playwright sobre el servidor local, capturas y controles reales.
- `npm run osm:fetch -- --bbox=19.410,-102.078,19.435,-102.048` y `npm run osm:build`.

## Calidad
- Validar coordenadas, polígonos cerrados, huecos, referencias de nodos, sentido vial y separación de niveles.
- No conectar puentes y túneles por cruces geométricos; usar nodos OSM y nivel.
- Mantener reproducible la generación desde el snapshot original. Red sólo en descarga, nunca Overpass en runtime.
- Liberar geometrías de sectores descargados y mantener colisiones aunque no estén dibujados.
- Uruapan usa salida de color simple; sus materiales no deben escribir en un G-buffer de reflejos. No ejecutar render mientras se precompilan los shaders.
- Verificar Uruapan, la redirección histórica, rutas de subdirectorio, cámaras, movimiento y vehículos en navegador cuando esté disponible.
- No reintroducir datos, cámaras ni lógica geográfica de otra ciudad. Conservar las atribuciones y LICENSE del motor de Mr.doob.
