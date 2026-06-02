# Prompt Maestro del Proyecto
## Simulador Laboral de Análisis de Datos

Este proyecto debe evolucionar como un **simulador laboral analítico**, no como una demo, un quiz ni una app educativa lineal.

## Identidad del producto
El jugador encarna a un analista de datos dentro de una empresa ficticia. Debe recibir pedidos, analizar datos, responder stakeholders, gestionar tiempo, atender reuniones, sostener visibilidad, resolver follow-ups, absorber interrupciones y construir trayectoria profesional.

## Principios rectores
1. **Autenticidad laboral primero**.
   Todo cambio debe parecerse al trabajo real de un analista.
2. **Consecuencias persistentes**.
   Las decisiones deben impactar confianza, reputación, foco, trayectoria y carga laboral.
3. **Crecimiento modular**.
   Cada bloque nuevo debe integrarse sin romper la base existente.
4. **Separación entre definición y runtime**.
   Las misiones deben mantenerse declarativas; la ejecución debe vivir en runtime y sistemas.
5. **Compatibilidad de desarrollo**.
   El proyecto debe seguir siendo importable y editable tanto en Android Studio como en VS Code.
6. **No simplificar el simulador hacia una demo lineal**.
   Cada mejora debe empujar más hacia oficina viva, presión real y coordinación organizacional.

## Qué ya existe y debe preservarse
- Android host + WebView
- SPA modular en assets web
- sistema declarativo de misiones
- motor SQL real
- múltiples stakeholders
- confianza y reputación por persona
- reputación por área
- reloj laboral y deadlines
- interrupciones y eventos simples
- feedback contextual
- revisiones iterativas
- multitarea ligera
- check-ins y pedidos de estado
- agenda operativa con reuniones y foco
- decisiones derivadas de reuniones
- follow-ups derivados
- mini-entregables
- respuesta de negocio a mini-entregables
- trayectoria profesional emergente

## Restricciones de implementación
- no volver a hardcodear lógica de misión en archivos dispersos
- no mezclar definición declarativa con estado runtime
- no romper tests existentes sin reemplazarlos por cobertura equivalente o mejor
- no eliminar sistemas previos salvo refactor explícito y seguro
- no convertir la UX en algo infantil o excesivamente gamificado

## Forma correcta de seguir avanzando
Cada bloque nuevo debe responder a:
1. qué sistema amplía,
2. qué consecuencia persistente agrega,
3. cómo mejora la autenticidad laboral,
4. cómo impacta UI, estado y tests,
5. cómo preserva continuidad con la arquitectura vigente.

## Áreas de expansión prioritarias
- choques de agenda y saturación laboral real
- validación analítica más tolerante y profunda
- nuevas misiones de churn, cohortes, QA de KPI, conciliación y reporting ejecutivo
- organización más viva, con memoria más profunda por stakeholder
- carrera profesional más rica: especialización, seniority, performance review, burnout

## Regla de continuidad
Siempre tomar como base:
- `docs/ESTADO_ACTUAL_PROYECTO.md`
- `docs/CAMBIOS_POR_REALIZAR.md`
- `docs/CONTINUIDAD_CODIGO_Y_ARQUITECTURA.md`
- este `docs/PROMPT_MAESTRO_PROYECTO.md`

Si hay duda entre una mejora técnica aislada y una mejora que haga al simulador más auténtico, debe priorizarse la segunda siempre que no rompa la base técnica.
