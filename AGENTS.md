# SLOP URUAPAN

## Arquitectura
- Aplicación estática ES modules, Three.js WebGPURenderer y TSL. Sin frameworks.
- `new-york.html` conserva la experiencia original; `js/main.js` y módulos NYC siguen independientes.
- `index.html` y `js/uruapan/` implementan Uruapan. Ejes: X este, Y arriba, Z sur; 1 unidad = 1 metro.
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
- `npm test`: pruebas originales y geográficas. Pruebas heredadas Bash se omiten en Windows.
- `npm run test:browser`: Playwright sobre el servidor local, capturas y controles reales.
- `npm run osm:fetch -- --bbox=19.410,-102.078,19.435,-102.048` y `npm run osm:build`.

## Calidad
- Validar coordenadas, polígonos cerrados, huecos, referencias de nodos, sentido vial y separación de niveles.
- No conectar puentes y túneles por cruces geométricos; usar nodos OSM y nivel.
- Mantener reproducible la generación desde el snapshot original. Red sólo en descarga, nunca Overpass en runtime.
- Liberar geometrías de sectores descargados y mantener colisiones aunque no estén dibujados.
- Verificar entradas NYC/Uruapan, rutas de subdirectorio, cámaras, movimiento y vehículos en navegador cuando esté disponible.
