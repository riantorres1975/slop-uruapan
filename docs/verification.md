# Registro de verificación

Entorno: Windows 11, PowerShell, Node.js, Microsoft Edge automatizado con Playwright. Fechas del snapshot: 24 de octubre de 2026 (UTC en `provenance.json`).

## Checkpoints

| Entrega | Commit | Verificación realizada |
| --- | --- | --- |
| A · Preparación | `1ba797f` | Fork y remotos verificados; 106 pruebas originales aprobadas y 7 pruebas Bash omitidas en Windows. Entrada NYC independiente. |
| B · Mapa OSM | `5535ed4` | 6 pruebas geográficas; build estático; navegador cargó sectores y geometrías; capturas iniciales. |
| C · Exploración | `77085b4` | 48 pruebas de controladores/cámaras/teleports; navegador verificó caminar, saltar, colisión y cinco cámaras. |
| D · Vehículos | `c7d1e16` | 37 pruebas de controladores/luces; navegador verificó acelerar, frenar, entrar/salir, bicicleta, helicóptero y recuperación. |
| E · Mapa y vida urbana | `a1fc5f1` | Pruebas de grafo/IA; navegador verificó mapa, ruta y ajustes. NYC abre al fijar el dev de Three.js requerido. Se corrigió una carrera de compilación/render. |
| F · Sectores | `620bd59` | Tiles, cancelación, liberación de instancias, LOD de fachadas, presupuesto de agentes y esquema DEM validado. 7 pruebas de navegador aprobadas, incluyendo la consola de GPU. |
| G · Publicación | Consultar `git log` | README, licencias, documentación de formato, build y workflow Pages. Resultado remoto depende de la ejecución registrada en Actions. |

## Cobertura

Resultado local: **114 pruebas Node aprobadas, 7 omitidas explícitamente y 0 fallidas; 7 pruebas de navegador aprobadas**. Las pruebas Node verifican el código original y la importación de Uruapan: proyección y orientación, coordenadas inversas, alturas con unidades, huecos, grafos dirigidos, conectividad, reservas de cruces, DEM y archivos reales. En Windows se omiten explícitamente siete pruebas heredadas que requieren un Bash POSIX con ejecutables de prueba; el importador de Uruapan es Node multiplataforma. La prueba heredada de regeneración de Nueva York utiliza una junction en Windows para evitar privilegios de symlink.

Playwright ejecuta carga de Uruapan sin errores de JS/GPU, caminar/saltar/colisiones/cámaras, automóvil/bicicleta/helicóptero/entrada/salida, mapa/rutas/tráfico/ajustes, carga real de Nueva York, sectores/1440p y fallback WebGL2. Las capturas se generan desde el navegador real, no son renders promocionales. La ejecución completa debe volver a pasar después de cada cambio de renderer o pipeline.

## Límites de la validación

No se ha certificado un mínimo de FPS en hardware dedicado. El HUD mide el rendimiento real, que incluye compilación inicial y depende del adaptador GPU. No se han validado todos los navegadores, móviles, accesibilidad de cada entrada OSM, normativa vial completa, monumentos exactos ni terreno real. La vista de NYC conserva su interfaz en inglés; la interfaz propia de Uruapan está en español.
