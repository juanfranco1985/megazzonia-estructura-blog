# Bitacora de exportacion del portafolio

## 2026-05-07 - Etapa 0 / Etapa 1

### Cambios

- Se creo `docs/EXPORTACION_BLOG_PORTAFOLIO.md`.
- Se creo esta bitacora.
- Se inicio la etapa de curaduria y documentacion para exportar el
  blog-portafolio.

### Diagnostico registrado

- El catalogo contiene 28 proyectos.
- Hay 18 proyectos con entrada navegable.
- Hay 18 proyectos documentados.
- Hay 6 proyectos marcados como `warning` o `neutral`.
- Las rutas declaradas en `entryPath`, `casePath` y `readmePath` resuelven sin
  enlaces rotos.

### Verificacion previa

- `node --test tests/*.mjs` en `LABORATORIO MEGAZZONIA estructura blog`: 38
  tests pasan.
- `node --test tests/*.mjs` en `Drone Factory`: 10 tests pasan.
- `npm run build` pasa en:
  - `FlightSimulatorClaude2`;
  - `Motorcraft CODEX 2`;
  - `Simulador de transferencia de calor en disipadores`;
  - `Software de Analisis estructural - copia`.

### Pendiente inmediato

- Actualizar README del hub con los documentos de exportacion.
- Ajustar detalles de lectura publica del catalogo si hace falta.
- Preparar etapa de evidencia visual.

### Nota tecnica

- Se probo declarar `"type": "module"` en el `package.json` raiz para eliminar
  advertencias de Node.
- El cambio se revirtio porque rompe la carga CommonJS de `sql-wasm.js` en la
  suite del simulador laboral: 3 tests SQL fallaban con `initSqlJs is not a
  function`.
- Decision: conservar las advertencias de Node y priorizar compatibilidad de
  tests/runtime.

## 2026-05-07 - Etapa 1

### Cambios

- Se actualizo `README.md` del hub para enlazar el plan de exportacion y la
  bitacora.
- Se actualizo el estado del README: Motorcraft CODEX 2 ya tiene build estatico
  generado.
- Se ajusto `android/app/src/main/assets/js/ui/projectsView.js` para que el
  catalogo lea como portfolio publico:
  - `Catalogo integrado` paso a `Proyectos del laboratorio`;
  - `Primer pase` y `No mueve carpetas` pasaron a mensajes publicables;
  - `Pendientes` paso a `A revisar`;
  - la nota interna de integracion paso a criterio de lectura publica.

### Verificacion

- Tras revertir el intento de `"type": "module"`, `node --test tests/*.mjs`
  vuelve a pasar en el simulador laboral: 38 tests.
- El resumen del catalogo se mantiene estable: 28 proyectos, 18 entradas web,
  18 documentados y 6 a revisar.
- `node --check` pasa en `projectsView.js`.
- El servidor local responde con HTTP 200 en `http://127.0.0.1:8090/`.

## 2026-05-07 - Etapa 2

### Cambios

- Se creo `portfolio/assets/screenshots/`.
- Se agrego `portfolio/assets/screenshots/SCREENSHOTS.md` con metodo, listado y
  notas de calidad.
- Se generaron capturas reales con Playwright + Microsoft Edge:
  - `demos/data-analyst-career-simulator.png`;
  - `demos/drone-factory.png`;
  - `demos/motorcraft-codex-2.png`;
  - `demos/flight-simulator-3d.png`;
  - `demos/heat-sink-simulator.png`;
  - `demos/analisis-estructural.png`;
  - `demos/consumo-electrico.png`;
  - `demos/south-american-runner.png`;
  - `cases/roi-analytics-android.png`;
  - `cases/solar-climate-dashboard.png`;
  - `cases/home-con-destacados.png`;
  - `cases/catalogo-con-miniaturas.png`.
- Se agrego `screenshotPath` a los proyectos principales dentro de
  `projectCatalog.js`.
- Se actualizaron `projectsView.js` y `desktopHomeView.js` para renderizar
  miniaturas.
- Se actualizaron `projects.css` y `portfolio-shell.css` para dar dimensiones
  estables a las imagenes.
- Se actualizo el cache-buster del hub a `megazzonia-20260507a` en:
  - `android/app/src/main/assets/index.html`;
  - `../index.html`;
  - `../abrir-laboratorio.bat`.
- Se ajusto el texto superior de `pendientes` a `a revisar`.

### Verificacion

- `node --check` pasa en:
  - `projectCatalog.js`;
  - `projectsView.js`;
  - `desktopHomeView.js`;
  - `shellView.js`.
- Chequeo de rutas: `entryPath`, `casePath`, `readmePath` y `screenshotPath`
  resuelven sin faltantes.
- Tests:
  - simulador laboral: 38/38;
  - Drone Factory: 10/10.
- Capturas revisadas visualmente:
  - demos principales no salen en blanco;
  - la home muestra miniaturas destacadas;
  - el catalogo muestra miniaturas en cards.

### Pendientes visuales detectados

- La captura de Data Analyst Career Simulator muestra el modal de onboarding;
  conviene reemplazarla por una captura limpia de Correo/SQL en un pase futuro.
- Flight Simulator 3D esta capturado en setup inicial; una captura en vuelo seria
  mas fuerte para publicacion final.
- Los proyectos que siguen sin captura propia pueden quedar como articulos
  tecnicos o incorporarse en un segundo lote.

## 2026-05-07 - Etapa 3

### Cambios

- Se creo `scripts/export-blog-portfolio.mjs` en la raiz del laboratorio.
- Se agregaron scripts en `package.json`:
  - `export:portfolio`;
  - `dev:export`.
- Se actualizo `portfolioApp.js` para alinear imports con
  `megazzonia-20260507a`.
- Se corrigieron las fichas de caso en `portfolio/projects/*/index.html` para
  volver al portfolio con `portfolio=20260507a`.
- Se genero `blog-portafolio-export/` con:
  - hub web en la raiz;
  - simulador laboral y assets locales;
  - fichas de caso;
  - capturas reales;
  - builds `dist/` principales;
  - demos web estaticas seleccionadas;
  - READMEs tecnicos para proyectos sin demo web exportada;
  - `README_EXPORTABLE.md`;
  - `EXPORT_MANIFEST.json`;
  - `abrir-export.bat`.

### Decision tecnica

- La copia exportada reescribe `WORKSPACE_ROOT_PREFIX` de
  `../../../../../../` a `.` para que el catalogo resuelva rutas desde la raiz
  del paquete.
- Las fichas exportadas reemplazan el enlace de regreso al hub profundo de
  Android por `../../../index.html?portfolio=20260507a#projects`.
- Se excluyen `node_modules`, tests, logs, zips, caches y carpetas Android
  nativas secundarias.

### Verificacion

- `npm run export:portfolio` genera el paquete sin errores.
- `node --check` pasa en:
  - `scripts/export-blog-portfolio.mjs`;
  - `android/app/src/main/assets/js/portfolioApp.js`;
  - todos los JS exportados bajo `blog-portafolio-export/js`.
- Chequeo de rutas exportadas:
  - 28 proyectos;
  - 0 faltantes en `entryPath`, `casePath`, `readmePath` y `screenshotPath`.
- HTTP local desde el servidor raiz:
  - `http://127.0.0.1:8090/blog-portafolio-export/` responde 200;
  - `http://127.0.0.1:8090/blog-portafolio-export/portfolio/projects/drone-factory/`
    responde 200.
- HTTP local desde la carpeta exportada:
  - `http://127.0.0.1:8091/` responde 200.
- Busqueda de enlaces viejos en export:
  - sin `portfolio=20260502a` en JS/fichas;
  - sin regreso al path profundo de Android desde fichas exportadas.

### Riesgo detectado

- El paquete completo pesa aproximadamente 354 MiB.
- La mayor parte del peso esta en assets de `Endless Runner`, `Cronicas del
  ultimo piloto`, `Real Turn Pong`, `Champions Pong` y `Gato & Humano`.
- La captura con Playwright sobre el export servido por HTTP quedo en timeout
  esperando recursos; se mantiene como punto de QA visual en Etapa 4.

### Pendiente inmediato

- Decidir si se publica paquete completo o variante liviana.
- Revisar responsive y carga visual de home, catalogo, fichas y demos pesadas.

## 2026-05-07 - Etapa 3B / Perfil hosting

### Cambios

- Se agrego `docs/PERFILES_PUBLICACION.md`.
- Se agrego el perfil hosting al exportador:
  - `npm run export:hosting`;
  - salida `blog-portafolio-hosting/`;
  - servidor sugerido `python -m http.server 8092 --bind 127.0.0.1`.
- Se mantuvo el perfil completo:
  - `npm run export:portfolio`;
  - salida `blog-portafolio-export/`.
- Se agrego `hosting.hideEntry` a demos pesadas en `projectCatalog.js`.
- Se actualizaron `projectsView.js` y `desktopHomeView.js` para:
  - detectar `window.__MEGAZZONIA_PUBLICATION_PROFILE__ = "hosting"`;
  - ocultar botones de demo pesada en hosting;
  - mostrar la etiqueta `Demo completa local`;
  - explicar que la demo no se borro y queda en el paquete completo/local.
- Se ajusto `portfolio/styles/case.css` para capturas estaticas en fichas.
- En la exportacion hosting, la ficha de South American Runner reemplaza el
  iframe de demo por captura y nota de preservacion.

### Resultado

- `blog-portafolio-export/` conserva el paquete completo.
- `blog-portafolio-hosting/` queda como artefacto publico liviano.
- Las demos pesadas no se eliminan: solo no se copian al perfil hosting.

### Verificacion

- `npm run export:portfolio` pasa.
- `npm run export:hosting` pasa.
- Peso aproximado:
  - completo: 354 MiB;
  - hosting: 9.4 MiB.
- Chequeo de rutas hosting:
  - 28 proyectos;
  - 0 faltantes considerando que `hosting.hideEntry` oculta demos no copiadas.
- Render HTML del catalogo en perfil hosting:
  - muestra nota de `version hosting`;
  - muestra `Demo completa local`;
  - oculta enlaces a `Endless Runner/index.html`;
  - oculta enlaces a `Real Turn Pong/index.html`.
- HTTP local desde servidor raiz:
  - `http://127.0.0.1:8090/blog-portafolio-hosting/` responde 200;
  - `http://127.0.0.1:8090/blog-portafolio-hosting/portfolio/projects/south-american-runner/`
    responde 200.

### Pendiente inmediato

- QA visual manual de `blog-portafolio-hosting/` antes de publicar.
- Revisar si alguna demo pesada necesita una version reducida independiente
  para poder abrirse tambien en hosting.

## 2026-05-08 - Etapa 4 / QA publicacion

### Cambios

- Se creo `scripts/qa-blog-portfolio.mjs`.
- Se agrego `qa:portfolio` a `package.json`.
- Se creo `docs/QA_PUBLICACION.md`.
- Se actualizaron los exports para copiar recursos chicos que estaban
  referenciados por fichas:
  - imagenes de `Software de Analisis estructural - copia`;
  - capturas y dataset sample de `9 - Solar Climate Dashboard`.
- En export, Data Analyst Career Simulator reescribe el enlace profundo de
  Android a `../../../simulator.html?v=dacs-20260429b#home`.
- ROI Analytics Android ya no expone link directo a `app-debug.apk`; queda como
  APK debug verificado localmente y enlaza al README/build local.

### Verificacion automatizada

- `node scripts/qa-blog-portfolio.mjs --profile=hosting`:
  - OK;
  - 28 proyectos;
  - 10.42 MiB;
  - 0 faltantes en catalogo;
  - 0 faltantes HTML.
- `node scripts/qa-blog-portfolio.mjs --profile=complete`:
  - OK;
  - 28 proyectos;
  - 354.93 MiB;
  - 0 faltantes en catalogo;
  - 0 faltantes HTML.

### Verificacion funcional

- `npm run export:portfolio` genera `blog-portafolio-export/`.
- `npm run export:hosting` genera `blog-portafolio-hosting/`.
- `npm run qa:portfolio` queda disponible como chequeo repetible.

### Pendiente inmediato

- QA visual/manual en navegador real:
  - home;
  - catalogo;
  - fichas principales;
  - responsive mobile.
- Pulir copy publico final antes de publicar.

## 2026-05-08 - Etapa 4B / Pulido editorial y enlaces publicos

### Cambios

- Se ajusto el home del portfolio para comunicar la diferencia entre demos
  directas, fichas de caso y paquete completo sin lenguaje interno.
- Se actualizaron destacados, metricas y criterios de publicacion del catalogo.
- Se cambio la categoria `Pendientes de empaquetado` por `Exploracion tecnica`.
- Las fichas de caso dejaron de usar `Upgrade aplicado` y `Ejecucion local`;
  ahora muestran `Mejoras destacadas` y `Como se reproduce`.
- Drone Factory y Consumo Electrico ya no muestran URLs locales con
  `127.0.0.1` dentro de la ficha publica.
- Las fichas vuelven al portfolio con `../../../index.html#projects`, no con
  el path profundo del hub Android.
- En export, la documentacion del simulador tambien se copia a `docs/` y Data
  Analyst Career Simulator enlaza esa ruta publica.
- Se suavizo la ficha ROI Analytics Android para explicar el cierre tecnico
  como decision de producto, no como pendiente interno.

### Verificacion

- `node --check`:
  - `projectCatalog.js`;
  - `desktopHomeView.js`;
  - `projectsView.js`;
  - `scripts/export-blog-portfolio.mjs`.
- `cmd /c npm.cmd run export:portfolio`:
  - OK;
  - `blog-portafolio-export/`;
  - 44 entradas copiadas.
- `cmd /c npm.cmd run export:hosting`:
  - OK;
  - `blog-portafolio-hosting/`;
  - 42 entradas copiadas.
- `cmd /c npm.cmd run qa:portfolio`:
  - completo OK, 28 proyectos, 354.97 MiB, 0 faltantes;
  - hosting OK, 28 proyectos, 10.46 MiB, 0 faltantes.
- Tests:
  - hub: 38/38 OK;
  - Drone Factory: 10/10 OK.
- HTTP local con servidor en `127.0.0.1:8090`:
  - `/blog-portafolio-hosting/` responde 200;
  - `/portfolio/projects/data-analyst-career-simulator/` responde 200;
  - `/portfolio/projects/drone-factory/` responde 200;
  - `/docs/ESTADO_ACTUAL_PROYECTO.md` responde 200.

### Pendiente inmediato

- QA visual manual en navegador:
  - home;
  - catalogo;
  - fichas principales;
  - ancho mobile.
- Decidir si la publicacion externa se hace desde `blog-portafolio-hosting/`
  como version liviana final o si se prepara una variante con alguna demo pesada
  reducida.

## 2026-05-13 - Etapa 5A / Curaduria editorial del blog

### Cambios

- Se agrego una capa de madurez editorial al catalogo:
  - `Insignia`;
  - `Caso tecnico`;
  - `Demo web`;
  - `Articulo tecnico`;
  - `Demo local`;
  - `Exploracion`.
- Se definieron 7 proyectos insignia para primera lectura:
  - Data Analyst Career Simulator;
  - Drone Factory;
  - 3D Motor Winding Lab;
  - Flight Simulator 3D;
  - Simulador de transferencia de calor;
  - Analisis Estructural;
  - ROI Analytics Android.
- Se actualizo la home del portfolio para comunicar mejor:
  - que Laboratorio Megazzonia es un blog-portafolio tecnico;
  - que no todos los proyectos tienen la misma jerarquia;
  - que la version hosting prioriza lectura publica, capturas y demos livianas.
- Se agrego filtro de `Madurez` al catalogo.
- Las tarjetas del catalogo ahora muestran una etiqueta editorial ademas del
  estado tecnico.
- Se actualizo el cache-buster a `megazzonia-20260513a`.
- Se ajusto el exportador para reescribir enlaces de fichas con
  `portfolio=20260507a` hacia `portfolio=20260513a`.

### Verificacion inicial

- `node --check` pasa en:
  - `projectCatalog.js`;
  - `desktopHomeView.js`;
  - `projectsView.js`;
  - `portfolioApp.js`;
  - `scripts/export-blog-portfolio.mjs`.
- `cmd /c npm.cmd run export:hosting`:
  - OK;
  - `blog-portafolio-hosting/`;
  - 42 entradas copiadas.
- `cmd /c npm.cmd run export:portfolio`:
  - OK;
  - `blog-portafolio-export/`;
  - 44 entradas copiadas.
- `cmd /c npm.cmd run qa:portfolio`:
  - completo OK, 28 proyectos, 354.98 MiB, 0 faltantes;
  - hosting OK, 28 proyectos, 10.47 MiB, 0 faltantes.
- Tests:
  - hub: 38/38 OK;
  - Drone Factory: 10/10 OK.
- Capturas QA con Playwright + Microsoft Edge:
  - `portfolio/assets/screenshots/qa-home-20260513.png`;
  - `portfolio/assets/screenshots/qa-projects-20260513.png`;
  - `portfolio/assets/screenshots/qa-home-mobile-20260513.png`;
  - `portfolio/assets/screenshots/qa-projects-mobile-20260513.png`.

### Pendiente inmediato

- Reemplazar la captura principal del Data Analyst Career Simulator por una
  pantalla limpia de Correo/SQL/Reporte.
- Pulir fichas individuales de los 7 proyectos insignia.
- Agregar metadatos SEO/Open Graph antes de publicacion externa.

## 2026-05-13 - Etapa 5B / Evidencia de proyectos insignia

### Cambios

- Se agrego una seccion uniforme de `Proyecto insignia` en las 7 fichas
  principales:
  - Data Analyst Career Simulator;
  - Drone Factory;
  - 3D Motor Winding Lab;
  - Flight Simulator 3D;
  - Simulador de transferencia de calor;
  - Analisis Estructural;
  - ROI Analytics Android.
- Cada ficha ahora declara:
  - madurez;
  - evidencia;
  - valor de portfolio;
  - siguiente mejora.
- Se reemplazo el preview sintetico de Data Analyst Career Simulator por una
  captura real del simulador.
- Se agrego modo de captura no intrusivo al simulador con `capture=sql`,
  `capture=report` o `capture=mail`, solo para generar evidencia visual sin
  mostrar onboarding.
- Se actualizo `portfolio/assets/screenshots/SCREENSHOTS.md` para reflejar que
  `data-analyst-career-simulator.png` ya no muestra el modal inicial.

### Verificacion

- `node --check` pasa en `main.js`.
- `node --test tests/*.mjs` en el hub: 38/38 OK.
- `node --test tests/*.mjs` en Drone Factory: 10/10 OK.
- `cmd /c npm.cmd run export:hosting`:
  - OK;
  - `blog-portafolio-hosting/`;
  - 42 entradas copiadas.
- `cmd /c npm.cmd run export:portfolio`:
  - OK;
  - `blog-portafolio-export/`;
  - 44 entradas copiadas.
- `cmd /c npm.cmd run qa:portfolio`:
  - completo OK, 28 proyectos, 355.94 MiB, 0 faltantes;
  - hosting OK, 28 proyectos, 11.43 MiB, 0 faltantes.
- Captura nueva generada:
  - `portfolio/assets/screenshots/demos/data-analyst-career-simulator.png`.
- Capturas QA generadas:
  - `portfolio/assets/screenshots/qa-data-case-20260513.png`;
  - `portfolio/assets/screenshots/qa-projects-20260513.png`.

### Pendiente inmediato

- Agregar metadatos SEO/Open Graph antes de publicacion externa.
- Reemplazar en una etapa futura las capturas de Flight Simulator y ROI
  Analytics por escenas reales mas representativas.

## 2026-05-13 - Etapa 5C / SEO y captura Flight en vuelo

### Cambios

- Se agregaron metadatos `description`, Open Graph y Twitter Card en:
  - entrada raiz `index.html`;
  - hub principal del portfolio;
  - las 10 fichas individuales publicadas en `portfolio/projects`.
- Se agrego el modo `capture=flight` al Flight Simulator:
  - inicia la demo automaticamente;
  - acepta el primer contrato disponible;
  - oculta el tablero de contratos;
  - deja visible HUD, ruta, minimapa y escena 3D activa para evidencia visual.
- Se reemplazo `portfolio/assets/screenshots/demos/flight-simulator-3d.png`
  por una captura real en vuelo con contrato activo.
- La ficha de Flight Simulator ahora embebe la demo con `capture=flight`.
- Se verifico la captura real de ROI Analytics Android, pero queda bloqueada
  hasta disponer de un dispositivo Android o AVD:
  - `adb devices` no lista dispositivos conectados;
  - `emulator -list-avds` no devuelve AVDs disponibles.

### Verificacion

- `cmd /c npm.cmd run build` en Flight Simulator: OK.
- Captura Playwright + Microsoft Edge:
  - `portfolio/assets/screenshots/demos/flight-simulator-3d.png`.
- `node --test tests/*.mjs` en el hub: 38/38 OK.
- `node --test tests/*.mjs` en Drone Factory: 10/10 OK.
- `cmd /c npm.cmd run export:hosting`:
  - OK;
  - `blog-portafolio-hosting/`;
  - 42 entradas copiadas.
- `cmd /c npm.cmd run export:portfolio`:
  - OK;
  - `blog-portafolio-export/`;
  - 44 entradas copiadas.
- `cmd /c npm.cmd run qa:portfolio`:
  - completo OK, 28 proyectos, 356.36 MiB, 0 faltantes;
  - hosting OK, 28 proyectos, 11.85 MiB, 0 faltantes.
- Se confirmo que `blog-portafolio-hosting/index.html` y la ficha de Flight
  exportada contienen metadatos Open Graph/Twitter y `capture=flight`.

### Pendiente inmediato

- Generar captura real de ROI Analytics Android cuando exista un emulador o
  dispositivo conectado.
- Redactar una pagina tecnica breve para Flight Simulator sobre generacion
  procedural, contratos y decisiones de performance.
