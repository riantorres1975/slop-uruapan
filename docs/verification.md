# Verificación de SLOP URUAPAN

La suite actual está dedicada a Uruapan. Los escenarios exclusivos del simulador anterior se retiraron junto con el código al que correspondían; se conservan en el historial Git.

## Código y datos

`npm test` verifica entrada, redirección histórica, movimiento, cámaras, controladores, colisiones, recuperación, luces, controles táctiles reutilizables, importación, proyección WGS84, alturas, huecos, grafos dirigidos, tráfico y muestreo DEM. La suite contiene 72 casos y no requiere Bash ni omite pruebas en Windows.

`npm run build` genera el sitio. `npm run check:static` verifica el grafo completo de imports bajo `/slop-uruapan/`, los 223 sectores, las licencias y la ausencia de los datos de la ciudad anterior en el paquete. El runtime carga 23 módulos en lugar de los 59 anteriores.

## Navegador

`npm run test:browser` usa Microsoft Edge en Windows y ejecuta ocho recorridos reales:

1. Carga de Uruapan, datos y geometrías sin errores de JS ni GPU.
2. Caminar, saltar, colisiones y cinco cámaras.
3. Automóvil, bicicleta, helicóptero, frenado y entrada/salida.
4. Minimapa, GPS, destinos, tráfico y ajustes.
5. La URL histórica redirige a Uruapan y carga su origen WGS84.
6. Descarga y recarga de sectores, liberación y viewport 1440p.
7. Modo compatible WebGL2 accesible por URL.
8. Perfil ligero con resolución reducida y sombras desactivadas.

Las capturas se generan desde el simulador real. La comprobación del navegador captura tanto excepciones como errores de consola GPU. En el ejecutor Linux sin GPU dedicada, el modo gráfico virtual no se certifica: la publicación automática utiliza las pruebas Node de Windows/Linux y la validación del paquete estático. La verificación visual se ejecuta localmente en Edge.

## Límites

El terreno sigue plano, los monumentos requieren modelos manuales y OSM no cubre todos los edificios. No se afirma una reconstrucción exacta ni un mínimo de FPS en todos los equipos. Los puentes/túneles con niveles no resueltos se conservan en datos y se omiten del recorrido. Véanse README y `data-format.md`.
