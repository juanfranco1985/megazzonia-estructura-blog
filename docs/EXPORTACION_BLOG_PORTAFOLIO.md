# Exportacion blog-portafolio

Estado inicial documentado: 2026-05-07

## Objetivo

Preparar Laboratorio Megazzonia como blog-portafolio exportable, sin perder la
estructura de laboratorio local. La prioridad es que el visitante vea primero
proyectos solidos, navegables y explicados como casos de producto/ingenieria.

## Criterios de publicacion

Un proyecto esta listo para frente publico si cumple al menos cuatro puntos:

- tiene una entrada navegable, build estatico o ficha tecnica clara;
- explica problema, decision tecnica, resultado y stack;
- no depende de rutas locales secretas ni servicios privados;
- muestra evidencia visual: captura, preview, video corto o demo embebida;
- declara como se ejecuta o que entorno necesita;
- no promete mas madurez de la que realmente tiene.

## Etapas

### Etapa 0 - Baseline y auditoria

Estado: completada.

- Se reviso el catalogo del hub.
- Se verifico que las rutas internas declaradas no esten rotas.
- Se ejecutaron tests principales del simulador laboral y Drone Factory.
- Se recompilaron builds Vite principales.
- Se identificaron proyectos fuertes, tecnicos y pendientes.

### Etapa 1 - Curaduria y documentacion

Estado: completada con QA automatizada y pasada editorial.

Objetivo:

- dejar un plan de exportacion;
- crear bitacora de cambios;
- separar proyectos "publicables ahora" de proyectos "tecnicos" y "pendientes";
- actualizar README del hub con estado real.

Resultado esperado:

- documentos de continuidad para saber que se hizo y que falta;
- lista clara de prioridades antes de exportar.
- README del hub actualizado con estado real;
- catalogo con lenguaje mas apto para lectura publica.

### Etapa 2 - Evidencia visual

Estado: completada en primer pase.

Objetivo:

- agregar capturas reales o previews mas honestos por proyecto destacado;
- priorizar capturas de demos web y casos mobile;
- evitar que fichas fuertes dependan solo de texto.

Resultado primer pase:

- se creo `portfolio/assets/screenshots/`;
- se generaron capturas de demos y casos principales;
- se agregaron miniaturas al catalogo y a la seleccion destacada;
- se documento el metodo de captura en `portfolio/assets/screenshots/SCREENSHOTS.md`.

Prioridad de capturas:

1. Data Analyst Career Simulator.
2. Drone Factory.
3. Motorcraft CODEX 2.
4. Flight Simulator 3D.
5. Heat Sink Simulator.
6. Analisis Estructural.
7. ROI Analytics Android.
8. South American Runner.

### Etapa 3 - Carpeta exportable

Estado: completada en primer pase.

Objetivo:

- preparar una carpeta unica de publicacion;
- copiar solo el hub, fichas, builds estaticos y assets necesarios;
- evitar depender de toda la carpeta de trabajo;
- documentar que proyectos quedan como articulos tecnicos sin demo.

Resultado primer pase:

- se creo `scripts/export-blog-portfolio.mjs` en la raiz del laboratorio;
- se agrego `npm run export:portfolio`;
- se genero `blog-portafolio-export/`;
- el hub exportado vive en la raiz de esa carpeta;
- el catalogo exportado reescribe `WORKSPACE_ROOT_PREFIX` a `.`;
- las fichas de caso exportadas vuelven a `../../../index.html#projects`;
- se agregaron dentro del paquete:
  - `README_EXPORTABLE.md`;
  - `EXPORT_MANIFEST.json`;
  - `abrir-export.bat`.

Nota de peso:

- el paquete completo pesa alrededor de 354 MiB;
- la mayor parte corresponde a juegos con audio e imagenes pesadas;
- para hosting publico conviene decidir en Etapa 4 si se conserva como paquete
  completo o si se genera una variante liviana.

### Etapa 3B - Perfil liviano para hosting

Estado: completada en primer pase.

Objetivo:

- mantener el paquete completo como backup navegable;
- generar una segunda carpeta preparada para hosting publico;
- aclarar en la UI que algunas demos pesadas quedan como ficha/captura;
- evitar que el usuario vea enlaces rotos o piense que los proyectos fueron
  eliminados.

Resultado primer pase:

- se agrego `npm run export:hosting`;
- se genero `blog-portafolio-hosting/`;
- el perfil hosting pesa alrededor de 9.4 MiB;
- la UI detecta `window.__MEGAZZONIA_PUBLICATION_PROFILE__ = "hosting"`;
- las tarjetas pesadas muestran `Demo completa local`;
- los botones de demo pesada se ocultan en hosting;
- South American Runner reemplaza iframe de demo por captura estatica en su
  ficha hosting;
- se documento la diferencia en `docs/PERFILES_PUBLICACION.md`.

### Etapa 4 - QA de publicacion

Estado: completada en primer pase.

Objetivo:

- ejecutar servidor local desde la carpeta exportable;
- verificar links, estilos, responsive y demos;
- revisar texto publico;
- marcar proyectos incompletos como internos o pendientes.

Resultado primer pase:

- se creo `scripts/qa-blog-portfolio.mjs`;
- se agrego `npm run qa:portfolio`;
- se documento el resultado en `docs/QA_PUBLICACION.md`;
- el perfil hosting queda con 0 faltantes de catalogo y 0 faltantes HTML;
- el perfil completo queda con 0 faltantes de catalogo y 0 faltantes HTML;
- se corrigieron enlaces/recursos rotos detectados en fichas.

Resultado pasada 4B:

- el home y catalogo explican mejor que la version hosting prioriza carga
  rapida y conserva las experiencias pesadas como ficha/captura;
- las fichas principales reemplazan lenguaje interno por lenguaje de portfolio;
- los enlaces de regreso al portfolio ya no apuntan al path profundo del hub
  Android;
- Data Analyst Career Simulator exporta su documentacion publica bajo `docs/`;
- verificacion actual:
  - hosting: 28 proyectos, 10.46 MiB, 0 faltantes;
  - completo: 28 proyectos, 354.97 MiB, 0 faltantes;
  - tests hub: 38/38 OK;
  - tests Drone Factory: 10/10 OK.

Pendiente manual:

- revision visual en navegador real;
- responsive movil;
- lectura final de copy antes de publicar.

### Etapa 5 - Pulido de proyectos pendientes

Estado: pendiente.

Objetivo:

- decidir si se completan, se documentan como investigacion o se ocultan del
  frente publico.

## Clasificacion actual

### Publicables con buena base

- Data Analyst Career Simulator.
- Drone Factory.
- Motorcraft CODEX 2.
- Flight Simulator 3D.
- Heat Sink Simulator.
- Analisis Estructural.
- Simulador de Consumo Electrico.
- South American Runner.
- ROI Analytics Android, como caso mobile.
- Solar Climate Dashboard, como caso tecnico con Streamlit.

### Publicables como articulo tecnico

- Solar Year Historical Database.
- Product Research Engine.
- Solar Agriculture Planning System, si se documenta el entorno.
- AI/Product research y proyectos Python con resultados reproducibles.

### Requieren trabajo antes de frente publico

- Amazon Deals.
- Cuaderno Musical Inteligente.
- Astronomical Solar Calendar Engine.
- Proyecto NPT - sistema solar.
- Laboratorio virtual de mecanica de fluidos.

## Riesgos antes de exportar

- Muchas rutas actuales funcionan porque se sirve la raiz completa del
  laboratorio. Una publicacion parcial romperia enlaces si no se empaqueta bien.
- Faltan capturas reales en varias fichas.
- Algunos proyectos requieren backend, Streamlit, Android o configuracion local.
- Hay proyectos con valor tecnico pero sin historia editorial todavia.

## Regla de trabajo

Cada cambio nuevo debe registrarse en
`docs/BITACORA_EXPORTACION_PORTAFOLIO.md`, incluyendo:

- fecha;
- etapa;
- archivos tocados;
- motivo;
- verificacion realizada.

## Siguiente decision operativa

La siguiente etapa debe ser pulido visual/manual de `blog-portafolio-hosting/`:
capturas finales, responsive, copy publico y decision de publicacion externa.
`blog-portafolio-export/` queda como paquete completo/local.
