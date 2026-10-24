# Arquitectura y decisiones

La inspección inicial cubrió el inventario de todos los módulos JS, herramientas y pruebas, sus imports y exports y los puntos de integración. El original usa módulos nativos sin build, WebGPURenderer, materiales TSL, modelos procedurales, controlador con colisiones y gravedad, cámaras, tráfico, audio y mapa Canvas. La geografía de Nueva York está acoplada a `city-config`, `road-network`, `city-grid` y `nyc-map`; no se reutiliza esa cuadrícula para México.

Uruapan conserva el motor Three.js y reutiliza los modelos, rig de peatones y controles originales mediante adaptadores. Su red y sus superficies provienen de OSM; el original sigue accesible desde `new-york.html`. Three.js se fija a 0.186.1 y se sirve localmente para evitar cambios de la rama dev del CDN.

El pipeline de Uruapan se ejecuta offline: Overpass → snapshot validado → proyección local métrica → polígonos/red dirigida → manifiesto y sectores. Runtime descarga únicamente archivos estáticos del mismo sitio. Cada sector tiene su propio ciclo de carga, creación y liberación. Los datos de colisión permanecen disponibles fuera del radio visual.

Ejes geográficos: X este, Z sur, Y arriba. Origen 19.42112, -102.06382. DEM opcional en rejilla; sin fuente fiable la altura base es cero, marcada en pantalla y documentación. Puentes/túneles conservan sus etiquetas; requieren elevación real para un soporte completo.
