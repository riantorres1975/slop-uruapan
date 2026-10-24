# Arquitectura de SLOP URUAPAN

Aplicación estática de módulos ES, Three.js WebGPURenderer y TSL. El repositorio contiene un único simulador: Uruapan. La entrada `index.html` carga `js/main.js`, que delega en `js/uruapan/main.js`. La ruta histórica `new-york.html` sólo redirige al inicio para conservar enlaces existentes.

## Geografía real

El pipeline se ejecuta antes de publicar: Overpass → snapshot validado → proyección local métrica → polígonos y red dirigida → manifiesto y sectores estáticos. En ejecución no se consulta Overpass.

Ejes: X este, Y arriba, Z sur; una unidad equivale a un metro. Origen: 19.42112, -102.06382. El mapa, las rutas, el tráfico y las colisiones utilizan únicamente las calles y huellas de Uruapan. Sin DEM fiable, el terreno permanece plano y se identifica como provisional.

## Módulos

| Módulo | Responsabilidad |
| --- | --- |
| `js/uruapan/geo.js` | Proyección, polígonos con huecos, alturas y rutas |
| `js/uruapan/world.js` | Huellas extruidas, fachadas, árboles, pavimento y ciclo de sectores |
| `js/uruapan/terrain.js` | Muestreador de alturas; rejillas con fuente y datum obligatorios |
| `js/uruapan/controllers.js` | Inyección de límites y suelo del manifiesto, aparición y entrada/salida |
| `js/uruapan/cameras.js` | Cinco cámaras de Uruapan: seguimiento, exterior, cabina, aérea y libre |
| `js/uruapan/traffic.js` | Agentes sobre aristas OSM dirigidas, cruces y presupuesto dinámico |
| `js/uruapan/map.js` | Minimap, mapa ampliado, nombres reales, destinos y GPS |
| `js/uruapan/landmarks.js` | Sitios identificados en OSM y puntos de integración de GLB |
| `js/controllers.js` | Movimiento, vehículos y colisiones; requiere un mundo con límites y suelo inyectados |
| `js/cameras.js` | Cámaras de seguimiento sin posiciones escénicas geográficas fijas |
| `js/actor-models.js`, `js/pedestrians.js` | Modelos y rigs procedurales compartidos, adaptados del motor de Mr.doob |
| `js/tsl-materials.js` | Uniformes, pintura y sombra de contacto; sin geografía ni G-buffer externo |
| `js/city-config.js` | Utilidades de entrada; no contiene calles, límites ni edificios |

La configuración geográfica de la ciudad anterior, sus generadores, datos, mapas y shaders específicos se retiraron del árbol actual. El historial Git conserva el código original. La atribución de Mr.doob y la licencia MIT se mantienen.

## Renderizado y rendimiento

El snapshot de Three.js se fija al commit `5e6eee6ce8757abde7105aba35a358feac986e91`. El build descarga y verifica hashes, y publica sólo los módulos necesarios. La aplicación resuelve 23 módulos propios/del motor y 223 sectores estáticos; no importa otro mapa.

Los shaders se precompilan antes de iniciar el bucle. La salida es de color simple. La geometría estática se fusiona por material dentro de cada sector, con instancias para fachadas y vegetación. Se cancelan solicitudes fuera del radio, se liberan geometrías e instancias al descargar sectores y se mantienen los índices de colisión. Los detalles de fachada se ocultan a más de 200 m y la población se adapta al rendimiento.

WebGPU se utiliza de forma preferente. `?renderer=webgl&quality=low&resolution=0.65` activa el modo compatible, también disponible si falla el arranque. El perfil ligero desactiva sombras y antialias desde el inicio.
