# QA de publicacion

Fecha: 2026-05-08

## Alcance

La Etapa 4 valida que los artefactos exportados puedan publicarse sin enlaces
rotos obvios y con una lectura publica coherente.

Artefactos revisados:

- `blog-portafolio-hosting/`
- `blog-portafolio-export/`

## Comandos

Generar ambos perfiles:

```powershell
cmd /c npm.cmd run export:portfolio
cmd /c npm.cmd run export:hosting
```

Ejecutar QA:

```powershell
cmd /c npm.cmd run qa:portfolio
```

QA por perfil:

```powershell
node scripts/qa-blog-portfolio.mjs --profile=hosting
node scripts/qa-blog-portfolio.mjs --profile=complete
```

## Resultado actual

### Hosting

- carpeta: `blog-portafolio-hosting/`
- peso: 10.46 MiB
- limite configurado: 25 MiB
- proyectos en catalogo: 28
- faltantes en catalogo: 0
- faltantes en HTML: 0

### Completo

- carpeta: `blog-portafolio-export/`
- peso: 354.97 MiB
- limite configurado: 420 MiB
- proyectos en catalogo: 28
- faltantes en catalogo: 0
- faltantes en HTML: 0

## Correcciones realizadas durante QA

- Data Analyst Career Simulator en export ahora apunta a `simulator.html` del
  paquete, no al path profundo de Android.
- Analisis Estructural copia sus imagenes de ficha al export.
- Solar Climate Dashboard copia capturas y dataset sample al export.
- ROI Analytics Android ya no ofrece descargar un APK que no forma parte del
  hosting; queda como build local verificado.
- El QA ignora URLs dinamicas dentro de templates JavaScript embebidos.
- Las fichas de caso vuelven al portfolio por `index.html#projects`, no por el
  path fuente del hub Android.
- Data Analyst Career Simulator enlaza `docs/ESTADO_ACTUAL_PROYECTO.md` en la
  publicacion exportada.
- Las fichas reemplazan lenguaje interno por copy publico:
  `Mejoras destacadas`, `Como se reproduce` y notas de preservacion.

## Chequeos funcionales complementarios

- Hub: 38/38 tests OK.
- Drone Factory: 10/10 tests OK.
- HTTP local:
  - `http://127.0.0.1:8090/blog-portafolio-hosting/` responde 200;
  - `http://127.0.0.1:8090/blog-portafolio-hosting/portfolio/projects/data-analyst-career-simulator/` responde 200;
  - `http://127.0.0.1:8090/blog-portafolio-hosting/portfolio/projects/drone-factory/` responde 200;
  - `http://127.0.0.1:8090/blog-portafolio-hosting/docs/ESTADO_ACTUAL_PROYECTO.md` responde 200.

## Pendientes manuales

- Revisar visualmente home, catalogo y fichas en navegador.
- Confirmar responsive en movil.
- Decidir si las demos pesadas necesitan versiones reducidas propias para
  hosting.
- Revisar texto final antes de publicar en URL externa.
