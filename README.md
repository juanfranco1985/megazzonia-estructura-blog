# Laboratorio Megazzonia

Hub base para integrar el catalogo de proyectos del Laboratorio Megazzonia.
La web funciona como portafolio principal y conserva el simulador laboral de
analisis de datos como experiencia interna.

## Stack

- Web hub en `HTML/CSS/JavaScript` Vanilla
- Android host con `WebView`
- `sql.js` real con `WebAssembly`
- `Chart.js` real para visualizacion
- datasets locales por mision
- catalogo local de proyectos integrado al hub

## Estructura principal

- `../index.html` entrada limpia desde la carpeta principal del laboratorio
- `../blog-portafolio-export/` paquete exportable generado
- `android/app/src/main/assets/index.html`
- `android/app/src/main/assets/js/`
- `android/app/src/main/assets/css/`
- `android/app/src/main/assets/js/data/projectCatalog.js`
- `android/app/src/main/assets/js/ui/projectsView.js`
- `android/app/src/main/assets/js/ui/desktopHomeView.js`
- `docs/EXPORTACION_BLOG_PORTAFOLIO.md`
- `docs/BITACORA_EXPORTACION_PORTAFOLIO.md`
- `docs/PERFILES_PUBLICACION.md`
- `docs/QA_PUBLICACION.md`

## Como abrirlo

### Navegador

No abras `index.html` directamente con `file://`: el navegador bloquea los
modulos JavaScript por CORS. Usa una de estas opciones.

Opcion rapida desde la carpeta principal:

```powershell
.\abrir-laboratorio.bat
```

Para usar el portafolio con enlaces hacia proyectos hermanos, sirve la carpeta
principal del laboratorio:

```powershell
cd "C:\Documentos\Laboratorio Megazzonia"
cmd /c npm.cmd run dev
```

Luego abrir:

- `http://127.0.0.1:8090/`

### Export blog-portafolio

Desde la carpeta principal del laboratorio:

```powershell
cmd /c npm.cmd run export:portfolio
```

La salida queda en:

- `../blog-portafolio-export/`

Para probar esa carpeta como artefacto independiente:

```powershell
cd ..\blog-portafolio-export
python -m http.server 8091 --bind 127.0.0.1
```

Luego abrir:

- `http://127.0.0.1:8091/`

### Export para hosting

La version hosting es mas liviana y no elimina los proyectos pesados: solo no
los copia como demo ejecutable. En la web aparecen como ficha/captura con la
etiqueta `Demo completa local`.

```powershell
cmd /c npm.cmd run export:hosting
```

La salida queda en:

- `../blog-portafolio-hosting/`

Para probarla:

```powershell
cd ..\blog-portafolio-hosting
python -m http.server 8092 --bind 127.0.0.1
```

Luego abrir:

- `http://127.0.0.1:8092/`

### Android Studio

1. Abrir la carpeta `android/` como proyecto.
2. Esperar la sincronizacion de Gradle del modulo `app`.
3. Verificar que exista un dispositivo o emulador seleccionado.
4. Ejecutar la app desde el modulo `app`.

## Tests de smoke

Desde esta carpeta:

```powershell
node --test tests/*.mjs
```

Desde la carpeta principal, para validar exports de publicacion:

```powershell
cmd /c npm.cmd run qa:portfolio
```

## Estado actual

- portada redisenada como portafolio profesional
- catalogo de proyectos integrado
- miniaturas visuales para proyectos destacados
- fichas de caso con URLs limpias en `portfolio/projects/...`
- enlaces a proyectos web directos y README cuando existen
- builds estaticos portables generados para Flight Simulator, Motorcraft CODEX 2, transferencia de calor y analisis estructural
- guard contra apertura por `file://` para evitar errores CORS
- paquete exportable generado en `../blog-portafolio-export/`
- paquete liviano para hosting generado en `../blog-portafolio-hosting/`
- QA automatizado de rutas y recursos exportados
- simulador laboral preservado como modulo interno
- wrapper Android disponible para mostrar la version app del laboratorio
- plan de exportacion y bitacora de cambios disponibles en `docs/`

## Pendientes recomendados

1. ampliar capturas reales en proyectos que aun no tienen evidencia visual propia
2. hacer QA visual/manual de `../blog-portafolio-hosting/`
3. reclasificar u ocultar proyectos que requieren backend, Streamlit o Android antes de publicacion publica
4. sumar mas fichas de caso con problema, stack, decisiones y aprendizajes
5. revisar si alguna demo pesada merece version reducida propia para hosting
6. publicar la version web en una URL externa
