import { createId, truncate } from "../app/utils.js";
import { getStakeholder } from "../data/stakeholders.js";
import { unlockMission } from './missions/missionRuntime.js';

function ensureEventsState(state) {
  state.events ||= { firedIds: [], log: [] };
  state.events.firedIds ||= [];
  state.events.log ||= [];
  return state.events;
}

function markEventFired(state, eventId, meta = {}) {
  const events = ensureEventsState(state);
  if (!events.firedIds.includes(eventId)) {
    events.firedIds.push(eventId);
  }
  events.log.unshift({
    id: createId("event"),
    eventId,
    createdAt: new Date().toISOString(),
    ...meta
  });
}

function hasFired(state, eventId) {
  return ensureEventsState(state).firedIds.includes(eventId);
}

function addMailThread(state, thread) {
  const exists = state.mail.threads.some((item) => item.id === thread.id);
  if (exists) {
    return;
  }
  state.mail.threads.unshift(thread);
  state.mail.selectedThreadId = thread.id;
}

function pushActivity(state, label, tone = "info") {
  state.activity.unshift({
    id: createId("activity"),
    label,
    tone,
    time: state.sim.timeLabel
  });
}

function pushNotification(state, title, message, level = "info", ttl = 7000) {
  state.notifications.items.unshift({
    id: createId("notif_interrupt"),
    title,
    message,
    level,
    createdAt: new Date().toISOString(),
    expiresAt: Date.now() + ttl,
    unread: true
  });
}

function buildInterruptionThread({ id, missionId = null, senderId, subject, preview, priority = "normal", labels = ["followup"], body, timestamp }) {
  const stakeholder = getStakeholder(senderId);
  return {
    id,
    missionId,
    threadType: "followup",
    senderId,
    senderName: stakeholder?.name || senderId,
    senderRole: stakeholder?.role || "Stakeholder",
    subject,
    preview: truncate(preview || body, 86),
    priority,
    timestamp,
    unread: true,
    accepted: false,
    labels,
    attachments: [],
    messages: [
      {
        id: createId("message"),
        from: stakeholder?.name || senderId,
        role: stakeholder?.role || "Stakeholder",
        body
      }
    ]
  };
}

function fireMissionLoadingReminder(state, mission, missionState) {
  const eventId = `${mission.id}_loading_reminder`;
  if (hasFired(state, eventId) || !missionState?.acceptedAtMinutes) return false;
  const minutesSinceAccept = state.sim.totalMinutes - missionState.acceptedAtMinutes;
  if (minutesSinceAccept < 45 || state.analysis.databaseReady) return false;

  addMailThread(state, buildInterruptionThread({
    id: `thread_${eventId}`,
    missionId: mission.id,
    senderId: "mariana_soto",
    subject: "¿Ya abriste el export?",
    preview: "Antes de avanzar con la respuesta, confirma que el dataset esté cargado y limpio.",
    priority: "normal",
    labels: ["guidance", "followup"],
    timestamp: `Mon ${state.sim.timeLabel}`,
    body: "Te estoy viendo quieto con el pedido abierto. Antes de sacar conclusiones, entra a Archivos, carga el export y confirma que la base limpia esté lista. No respondas a negocio sin validar el dataset."
  }));
  pushActivity(state, `Interrupción: Mariana pidió confirmación de carga para ${mission.title}.`, "info");
  pushNotification(state, "Seguimiento técnico", "Mariana te recordó validar y cargar el export antes de contestar.", "info");
  markEventFired(state, eventId, { missionId: mission.id, type: "loading_reminder" });
  return true;
}

function fireMissionPressurePing(state, mission, missionState) {
  const eventId = `${mission.id}_pressure_ping`;
  if (hasFired(state, eventId) || !missionState?.acceptedAtMinutes || missionState?.status === "completed") return false;
  const minutesSinceAccept = state.sim.totalMinutes - missionState.acceptedAtMinutes;
  if (minutesSinceAccept < 140) return false;
  if (state.report.lastSubmission?.missionId === mission.id) return false;

  const senderId = mission.stakeholder?.id || "carla_mendez";
  const sender = getStakeholder(senderId);
  addMailThread(state, buildInterruptionThread({
    id: `thread_${eventId}`,
    missionId: mission.id,
    senderId,
    subject: `Necesito ETA de ${mission.title}`,
    preview: "Negocio ya está preguntando cuánto falta para tener una lectura usable.",
    priority: "high",
    labels: ["followup", "urgent"],
    timestamp: `Mon ${state.sim.timeLabel}`,
    body: `${sender?.name || 'Stakeholder'} volvió a escribir: necesito una ETA concreta. No hace falta una tesis; necesito saber si hoy vas a cerrar esta lectura y con qué grado de confianza la puedo mover.`
  }));
  pushActivity(state, `Interrupción: ${sender?.name || 'Stakeholder'} presionó por ETA en ${mission.title}.`, "warning");
  pushNotification(state, "Presión de negocio", "Entró un follow-up pidiendo ETA de la misión activa.", "warning", 8000);
  markEventFired(state, eventId, { missionId: mission.id, type: "pressure_ping" });
  return true;
}

function fireOverdueEscalation(state, mission, missionState) {
  const eventId = `${mission.id}_overdue_escalation`;
  if (hasFired(state, eventId) || !missionState?.isOverdue || missionState?.status === "completed") return false;
  const senderId = mission.stakeholder?.id || "carla_mendez";
  addMailThread(state, buildInterruptionThread({
    id: `thread_${eventId}`,
    missionId: mission.id,
    senderId,
    subject: `La entrega de ${mission.title} ya está fuera de horario`,
    preview: "La misión entró en estado vencido y ahora genera presión adicional.",
    priority: "high",
    labels: ["followup", "urgent"],
    timestamp: `Mon ${state.sim.timeLabel}`,
    body: "El horario comprometido ya se pasó. Entrega igual, aunque sea con observaciones y disclaimer. Necesito visibilidad del estado real ahora, no silencio."
  }));
  pushActivity(state, `Escalada: ${mission.title} quedó bajo seguimiento por atraso.`, "warning");
  pushNotification(state, "Escalada por atraso", "La misión vencida ya generó seguimiento explícito del stakeholder.", "warning", 8200);
  markEventFired(state, eventId, { missionId: mission.id, type: "overdue_escalation" });
  return true;
}

function fireAmbientOpsNotice(state) {
  const eventId = "ambient_ops_notice_midday";
  if (hasFired(state, eventId)) return false;
  if ((state.sim.totalMinutes || 0) < 12 * 60 + 10) return false;
  addMailThread(state, {
    id: `thread_${eventId}`,
    missionId: null,
    threadType: "ambient",
    senderId: "mariana_soto",
    senderName: "Mariana Soto",
    senderRole: "Analista Senior / Jefa Directa",
    subject: "Cierre de mediodía: actualiza estado si quedas en algo crítico",
    preview: "A las 12:30 consolidamos pendientes calientes. Si estás trabado, avisa antes.",
    priority: "low",
    timestamp: `Mon ${state.sim.timeLabel}`,
    unread: true,
    accepted: false,
    labels: ["ambient", "followup"],
    attachments: [],
    messages: [
      {
        id: createId("message"),
        from: "Mariana Soto",
        role: "Analista Senior / Jefa Directa",
        body: "Voy a consolidar pendientes antes del corte de mediodía. Si alguna misión quedó bloqueada o con riesgo de deadline, déjala explícita en tu estado."
      }
    ]
  });
  pushActivity(state, "Interrupción interna: Mariana pidió actualización de estado antes del cierre de mediodía.", "info");
  pushNotification(state, "Corte interno", "Entró una nota de seguimiento operativo de mitad de jornada.", "info");
  markEventFired(state, eventId, { type: "ambient_ops_notice" });
  return true;
}


function firePriorityConflictMission(state, mission, missionState) {
  const activeMissionId = state.missions.activeId;
  if (activeMissionId !== 'mission_002_web_category_mix') return false;
  const activeMissionState = state.missions.states?.[activeMissionId];
  const eventId = 'mission_003_ops_priority_conflict';
  if (hasFired(state, eventId) || !activeMissionState?.acceptedAtMinutes) return false;
  const minutesSinceAccept = state.sim.totalMinutes - activeMissionState.acceptedAtMinutes;
  if (minutesSinceAccept < 35) return false;
  if (mission.id !== 'mission_003_ops_risk_region') return false;

  state.missions.states[mission.id] = unlockMission(state.missions.states[mission.id] || missionState, 'ops_interrupt');
  addMailThread(state, buildInterruptionThread({
    id: 'thread_mission_003_ops_interrupt',
    missionId: mission.id,
    senderId: 'lucia_ferraro',
    subject: 'Necesito cambiar prioridad: operaciones entra en caliente',
    preview: 'Hay un corte operativo y necesito la región con más pedidos problemáticos antes del cierre de tarde.',
    priority: 'high',
    labels: ['mission', 'urgent', 'priority_shift'],
    timestamp: `Mon ${state.sim.timeLabel}`,
    body: 'Te saco unos minutos de marketing porque me explotó seguimiento operativo. Necesito un corte corto con la región que más pedidos problemáticos concentra esta semana. Pending, refunded y cancelled cuentan como riesgo. Si puedes, toma este pedido primero y después vuelve al análisis anterior.'
  }));
  pushActivity(state, 'Cambio de prioridad: operaciones abrió una misión urgente mientras marketing seguía en curso.', 'warning');
  pushNotification(state, 'Cambio de prioridad', 'Entró una misión urgente de Operaciones que compite con la carga actual.', 'warning', 8200);
  markEventFired(state, eventId, { missionId: mission.id, type: 'priority_conflict_unlock' });
  return true;
}

export function evaluateInterruptionEvents(state) {
  ensureEventsState(state);
  let fired = 0;
  for (const mission of state.missions.catalog || []) {
    const missionState = state.missions.states?.[mission.id];
    if (!missionState?.isVisible) continue;
    fired += fireMissionLoadingReminder(state, mission, missionState) ? 1 : 0;
    fired += fireMissionPressurePing(state, mission, missionState) ? 1 : 0;
    fired += fireOverdueEscalation(state, mission, missionState) ? 1 : 0;
    fired += firePriorityConflictMission(state, mission, missionState) ? 1 : 0;
  }
  fired += fireAmbientOpsNotice(state) ? 1 : 0;
  return fired;
}
