# Arquitectura y decisiones

La inspección inicial cubrió el inventario de todos los módulos JS, herramientas y pruebas, sus imports y exports y los puntos de integración. El original usa módulos nativos sin build, WebGPURenderer, materiales TSL, modelos procedurales, controlador con colisiones y gravedad, cámaras, tráfico, audio y mapa Canvas. La geografía de Nueva York está acoplada a `city-config`, `road-network`, `city-grid` y `nyc-map`; no se reutiliza esa cuadrícula para México.

Uruapan conserva el motor Three.js y reutiliza los modelos, rig de peatones y controles originales mediante adaptadores. Su red y sus superficies provienen de OSM; el original sigue accesible desde `new-york.html`. Ambas entradas sirven el build y los addons dev que requiere el original, fijados al commit `5e6eee6ce8757abde7105aba35a358feac986e91`. El build descarga desde jsDelivr los módulos necesarios a `.cache/three/`, verifica sus hashes contra `tools/three-integrity.json` y los copia al sitio. No hay dependencia del CDN de Three.js durante la ejecución. El paquete npm Three.js se usa para ejecutar los tests Node, no como motor publicado.

El pipeline de Uruapan se ejecuta offline: Overpass → snapshot validado → proyección local métrica → polígonos/red dirigida → manifiesto y sectores. Runtime descarga únicamente archivos estáticos del mismo sitio. Cada sector tiene su propio ciclo de carga, creación y liberación. Los datos de colisión permanecen disponibles fuera del radio visual.

Ejes geográficos: X este, Z sur, Y arriba. Origen 19.42112, -102.06382. DEM opcional en rejilla; sin fuente fiable la altura base es cero, marcada en pantalla y documentación. Puentes/túneles conservan sus etiquetas; requieren elevación real para un soporte completo.

## Módulos de Uruapan

| Módulo | Responsabilidad |
| --- | --- |
| `geo.js` | Proyección, geometría, alturas y búsqueda de rutas |
| `world.js` | Extrusiones de huellas, fachadas instanciadas, árboles, pavimento, tiles y ciclo de vida de sectores |
| `terrain.js` | Interfaz de altura y validación de rejillas DEM; runtime plano |
| `controllers.js` | Adaptación de los controladores originales a límites, suelos y puntos de aparición locales |
| `cameras.js` | Seguimiento original, primera persona, aérea y libre; protección de cámara contra edificios |
| `traffic.js` | Agentes sobre aristas OSM dirigidas, reservas de cruces, seguimiento básico, peatones con rig original y presupuesto dinámico |
| `map.js` | Canvas 2D, orientación con cámara, calles, POI, minimapa, mapa ampliado y rutas |
| `landmarks.js` | Registro de prioridades OSM y función de carga futura de GLB |
| `main.js` | Inicialización, iluminación, interfaz en español, controles y bucle |

`js/controllers.js` recibe un tercer argumento opcional `world`. La entrada NYC no lo pasa y conserva los límites y colisiones originales. Para Uruapan se añaden huellas poligonales con huecos y alturas; el automóvil usa un radio conservador alrededor de su carrocería para estas huellas. Las colisiones se consultan en una rejilla espacial heredada. No se eliminan colliders cuando se descarga un sector visual.

Los shaders se precompilan antes de iniciar el bucle para no superponer modificaciones del estado del renderer. Los materiales de sombra de contacto originales incluyen `mrtNode` dirigido al G-buffer de reflejos de NYC. El adaptador de Uruapan elimina ese MRT en sus actores, porque esta entrada sólo usa un attachment de color; conservarlo generaba una estructura WGSL vacía y pipelines inválidos. Las pruebas capturan tanto excepciones como errores de consola de GPU.

La geometría estática se fusiona por material dentro de cada sector; ventanas, puertas, balcones, luminarias y vegetación usan instancias. Los detalles de fachadas se ocultan a más de 200 m, el crowd usa su LOD original y el número de agentes se adapta cada dos segundos de reloj. No hay un objetivo de 60 FPS demostrado para todos los equipos.
