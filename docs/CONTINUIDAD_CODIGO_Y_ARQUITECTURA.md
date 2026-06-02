# Continuidad de código y arquitectura
## Guía rápida para retomar el proyecto

Fecha de exportación: 2026-04-16

## Estructura mental del código

### Capa Android host
Ruta principal:
- `android/app/src/main/`

Responsabilidad:
- contenedor Android
- WebView
- carga de la SPA local

### Capa web principal
Ruta principal:
- `android/app/src/main/assets/`

Responsabilidad:
- app web del simulador
- UI, estado, sistemas y datos

## Carpetas clave

### `js/app/`
Contiene:
- estado global
- constantes
- bootstrap general
- utilidades de integración entre UI y sistemas

### `js/domain/`
Contiene:
- tipos de misión
- modelos y shape de runtime
- contratos declarativos de dominio

### `js/systems/`
Es el corazón del simulador.
Contiene, entre otros:
- `sqlEngine`
- `missionRegistry`
- `missionFactory`
- `missionRuntime`
- `missionValidator`
- `missionScoring`
- `stakeholderEngine`
- `clockEngine`
- `interruptionSystem`
- `feedbackEngine`
- `checkinSystem`
- `agendaSystem`
- `meetingDecisionSystem`
- `followupTaskSystem`
- `miniDeliverableSystem`
- `businessReviewSystem`
- `careerImpactSystem`

### `js/ui/`
Contiene las vistas principales:
- escritorio/home
- inbox
- detalle de correo
- reporte
- carrera

### `js/data/`
Contiene:
- definiciones de misión
- datasets
- bundles locales por misión
- stakeholders

## Reglas para no romper la base

1. No volver a hardcodear lógica de misión dispersa en muchos archivos.
2. Mantener separada la definición declarativa de la misión de su estado runtime.
3. Cada sistema nuevo debe integrarse con:
   - estado
   - UI
   - trazabilidad
   - tests
4. No romper compatibilidad con Android Studio y VS Code.
5. Toda evolución debe seguir el documento maestro como guía rectora.

## Estado de continuidad
La base actual ya tiene suficiente estructura como para seguir creciendo por bloques. Lo importante no es recordar cada línea exacta del código, sino preservar:
- la arquitectura actual,
- los módulos activos,
- sus responsabilidades,
- y las consecuencias persistentes ya implementadas.
