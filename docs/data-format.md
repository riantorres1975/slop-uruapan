# Datos geográficos

`data/uruapan/source/osm.json` es el snapshot original de Overpass (`out body geom`). `provenance.json` conserva endpoint, bbox solicitado, fecha UTC, timestamp de OSM y SHA-256 de los bytes originales. `query.overpassql` permite reproducir la consulta. Las vías completas pueden sobrepasar el bbox solicitado: son geometrías reales de OSM, no extensiones inventadas.

`npm run osm:build` verifica el checksum y rechaza respuestas con `remark`, anillos abiertos, autointersecciones y relaciones incompletas. Ensambla miembros exteriores e interiores de multipolígonos, conserva huecos y evita duplicar sus ways. `validation.json` muestra conteos y descartes. No sustituye vías ausentes.

## Manifiesto v1

- `origin`: WGS84 19.42112, -102.06382. Proyección tangente local WGS84, X este / Z sur en metros, redondeada a centímetros. Adecuada a escala urbana; no es una transformación catastral.
- `bounds`, `sectorSize: 240`, `sectors`: índice de archivos `sectors/x_z.json` relativos al manifiesto.
- `roads`: `id` OSM, `name`, `points: [[x,z],…]`, `nodeIds`, `tags`, `width`, `widthSource`, `drivable`, `grade`.
- `buildings`: `ring`, `holes`, `bounds`, `tags`, `height`, `heightSource`. Altura OSM si existe; niveles OSM × 3 metros aproximados; en ausencia de ambos, 1–3 niveles deterministas y marcados provisionales.
- `areas`: polígonos de parques, plazas, agua y otros usos de suelo. El render no representa cada etiqueta con un modelo específico.
- `pois`: nombres y posiciones OSM de nodos y centros de áreas/edificios. Un centro de huella es un punto de referencia, no garantiza una entrada accesible.
- `graph`, `walkGraph`: nodos OSM con sufijo de nivel; aristas dirigidas con longitud, ancho e ID de vía. Las intersecciones dependen de nodos compartidos. Respeta `oneway=yes/1/-1`, rotondas y accesos básicos. No incluye restricciones de giro de relaciones, semáforos completos ni normas exhaustivas de circulación.

Los sectores contienen segmentos de calles por su punto medio y edificios/áreas por el centro de sus bounds. Se cargan hasta tres solicitudes simultáneas. Se cancelan solicitudes fuera del radio y se liberan geometrías e instancias al salir. El manifiesto conserva índices geográficos completos para colisión, mapa y rutas; sólo la geometría visual se carga por sectores. Para extensiones urbanas mucho mayores convendrá también paginar estos índices y dividir áreas extensas.

## Relieve

La escena usa altura relativa cero, explícitamente provisional. No se descargó ningún DEM ni se asigna una altitud geográfica ficticia a calles o edificios. Los 34 ways con bridge/tunnel/layer distinto de cero se conservan en datos pero se omiten del render y la navegación para evitar cruces imposibles.

`Terrain` valida y muestrea por interpolación bilineal una rejilla opcional con `source`, `datum`, `baseElevation`, `minX`, `minZ`, `step`, `width`, `height`, `values`. Rechaza extrapolación y valores no finitos. Hay tiles de terreno por sector y los controladores usan el mismo muestreador. El render principal sigue en modo plano: incorporar un DEM real requiere además drapear calles y áreas, bases de edificios, resolver puentes/túneles y verificar transiciones. No se afirma que el relieve real esté implementado.

## Ampliación

Descarga un bbox mayor usando `npm run osm:fetch -- --bbox=sur,oeste,norte,este`, ejecuta `npm run osm:build`, pruebas y build. El recorte debe permanecer en la región de Uruapan y medir como máximo 0.2° por eje. La descarga sustituye el snapshot tras validarlo; conserva mediante Git la versión anterior. No hay descarga de Overpass en el navegador.

Los datos originales y derivados son © OpenStreetMap contributors y se distribuyen bajo [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). Mantener acceso a esta base derivada y atribución visible al redistribuirla; la licencia MIT sólo cubre el código. Véanse [las condiciones de OSM](https://www.openstreetmap.org/copyright).
