# Data Analyst Career Simulator

Estado actualizado: 2026-04-29

## Resumen ejecutivo

Simulador laboral de analisis de datos construido como web app modular dentro de `android/app/src/main/assets/`.

El proyecto ya no es una demo lineal de una sola mision. La experiencia actual combina trabajo analitico real con presion laboral simulada: correos, stakeholders, datasets, SQL en navegador, reportes, deadlines, reuniones, follow-ups y progresion profesional persistente.

## Entrada principal

```text
android/app/src/main/assets/simulator.html?v=dacs-20260429b#home
```

El portfolio principal usa `index.html` como hub separado. El simulador queda aislado en `simulator.html` para evitar mezclar identidad visual y estado del portfolio.

## Misiones actuales

### 1. `mission_001_sales_cleaning`

- Titulo: Canal semanal con mayor venta.
- Stakeholder: Carla Mendez, Gerente Comercial.
- Objetivo: limpiar ventas semanales y detectar el canal con mayor revenue.
- Resultado esperado: `Web`.

### 2. `mission_002_web_category_mix`

- Titulo: Categoria lider dentro del canal Web.
- Stakeholder: Nicolas Ortega, Lider de Marketing.
- Objetivo: detectar que categoria lidera revenue dentro del canal Web.
- Resultado esperado: `SaaS`.

### 3. `mission_003_ops_risk_region`

- Titulo: Region con mas pedidos problematicos.
- Stakeholder: Lucia Ferraro, Operations Lead.
- Objetivo: detectar que region concentra mas pedidos con friccion operativa.
- Resultado esperado: `East`.

## Stakeholders integrados

- Carla Mendez: Gerente Comercial.
- Nicolas Ortega: Lider de Marketing.
- Mariana Soto: Analista Senior / Jefa Directa.
- Lucia Ferraro: Operations Lead.

## Capacidades actuales

### Experiencia de uso

- Home propio del simulador.
- Navegacion completa: Inicio, Correo, Archivos, SQL, Reporte y Carrera.
- Guia de primeros pasos.
- Reinicio visible de progreso local.
- Tema visual oscuro con acentos verdes y marrones.

### Nucleo de misiones

- Registro central de misiones.
- Factory y runtime de mision.
- Validacion declarativa.
- Scoring separado.
- Desbloqueo progresivo.
- Estados `active`, `queued`, `revision_required` y completado.

### Trabajo analitico

- Datasets locales por mision.
- SQL real sobre `sql.js`.
- Historial de queries.
- Validacion de resultados.
- Reporte con metrica, grafico y conclusion ejecutiva.

### Presion laboral

- Reloj laboral.
- Deadlines operativos.
- Penalizacion por atraso.
- Interrupciones contextuales.
- Follow-ups por inaccion o demora.
- Check-ins ejecutivos.

### Coordinacion

- Agenda de reuniones.
- Asistencia o perdida de reuniones.
- Ventanas de foco.
- Tareas derivadas de reuniones.
- Mini-entregables y respuestas de negocio.

### Progresion profesional

- Prestigio.
- Score tecnico.
- Confianza por stakeholder.
- Reputacion por area.
- Seniority.
- Compensacion simulada.
- Carga laboral y riesgo de burnout.
- Performance reviews.

## Stack

- HTML/CSS/JavaScript modular.
- `sql.js` con WebAssembly.
- `Chart.js`.
- Datasets locales.
- Persistencia con estado global serializable.
- Node test runner.
- Android WebView como host opcional.

## Verificacion

Desde `LABORATORIO MEGAZZONIA estructura blog`:

```powershell
node --test tests/*.mjs
```

Estado actual de la suite: 38 tests.

## Lectura de portfolio

El valor principal del proyecto esta en la integracion de sistemas:

- UI navegable.
- Datos reales consultables por SQL.
- Validacion de entregables.
- Feedback contextual.
- Simulacion de presion laboral.
- Consecuencias persistentes en carrera y relaciones.

## Proximas mejoras recomendadas

1. Mas misiones por area: producto, marketing, operaciones y finanzas.
2. Capturas reales para la ficha de portfolio.
3. Publicacion standalone separada del hub.
4. Mayor feedback visual en validaciones SQL y reportes.
5. Metricas de progreso por ciclo de analisis.
