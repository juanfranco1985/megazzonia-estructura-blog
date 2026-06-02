
import { createId, truncate } from "../app/utils.js";
import { getStakeholder } from "../data/stakeholders.js";
import { getMissionById, getMissionOrPrimary } from "../data/missions.js";
import { applyStakeholderInteraction } from "./stakeholders/stakeholderEngine.js";

function ensureCheckinsState(state) {
  state.checkins ||= { items: [], pendingIds: [], completedIds: [], missedIds: [] };
  state.checkins.items ||= [];
  state.checkins.pendingIds ||= [];
  state.checkins.completedIds ||= [];
  state.checkins.missedIds ||= [];
  return state.checkins;
}

function getCheckinById(state, checkinId) {
  return ensureCheckinsState(state).items.find((item) => item.id === checkinId) || null;
}

function hasPendingCheckinForMission(state, missionId, type) {
  return ensureCheckinsState(state).items.some((item) => item.missionId === missionId && item.requestType === type && item.status === 'pending');
}

function addCheckinThread(state, thread) {
  if (state.mail.threads.some((item) => item.id === thread.id)) {
    return;
  }
  state.mail.threads.unshift(thread);
  state.mail.selectedThreadId = thread.id;
}

function pushActivity(state, label, tone = 'info') {
  state.activity.unshift({ id: createId('activity'), label, tone, time: state.sim.timeLabel });
}

function pushNotification(state, title, message, level = 'info', ttl = 7200) {
  state.notifications.items.unshift({
    id: createId('notif_checkin'),
    title,
    message,
    level,
    createdAt: new Date().toISOString(),
    expiresAt: Date.now() + ttl,
    unread: true
  });
}

function createCheckinThread(state, { checkinId, missionId = null, senderId, subject, preview, body, priority = 'normal', labels = ['checkin'] }) {
  const stakeholder = getStakeholder(senderId);
  return {
    id: `thread_${checkinId}`,
    missionId,
    checkinId,
    threadType: 'checkin',
    senderId,
    senderName: stakeholder?.name || senderId,
    senderRole: stakeholder?.role || 'Stakeholder',
    subject,
    preview: truncate(preview || body, 96),
    priority,
    timestamp: `Mon ${state.sim.timeLabel}`,
    unread: true,
    accepted: false,
    labels,
    attachments: [],
    messages: [{ id: createId('message'), from: stakeholder?.name || senderId, role: stakeholder?.role || 'Stakeholder', body }]
  };
}

function registerCheckin(state, checkin) {
  const bucket = ensureCheckinsState(state);
  bucket.items.unshift(checkin);
  if (!bucket.pendingIds.includes(checkin.id)) {
    bucket.pendingIds.unshift(checkin.id);
  }
}

function buildMissionStatusLine(state, missionId) {
  const mission = missionId ? getMissionById(missionId) : null;
  const missionState = missionId ? state.missions.states?.[missionId] : null;
  if (!mission || !missionState) {
    return 'No tengo una misión activa crítica en este momento.';
  }
  if (missionState.needsRevision) {
    return `Estoy sobre ${mission.title}. La entrega quedó en revisión ${missionState.currentRevisionRound || 1} y estoy corrigiendo antes del próximo reenvío.`;
  }
  if (state.report.lastSubmission?.missionId === missionId) {
    return `Ya envié una versión de ${mission.title} y estoy monitoreando feedback.`;
  }
  if (state.terminal.lastResult && state.missions.activeId === missionId) {
    return `Ya corrí el análisis principal de ${mission.title} y estoy cerrando la síntesis ejecutiva.`;
  }
  if (state.analysis.databaseReady && state.missions.activeId === missionId) {
    return `Tengo el dataset de ${mission.title} cargado y estoy validando el corte antes de comunicar resultado.`;
  }
  if (missionState.status === 'queued') {
    return `${mission.title} quedó en espera por un cambio de prioridad. La retomo al liberar la urgencia actual.`;
  }
  return `La misión ${mission.title} sigue abierta y la tengo en seguimiento operativo.`;
}

function buildExecutiveStatusBody(state, checkin) {
  const activeMissionId = state.missions.activeId;
  const queuedMissionIds = Object.entries(state.missions.states || {}).filter(([, item]) => item?.status === 'queued').map(([missionId]) => missionId);
  const focusMissionId = checkin.missionId || activeMissionId;
  const focusMission = focusMissionId ? getMissionOrPrimary(focusMissionId) : null;
  const deadlineLabel = focusMissionId && state.missions.states?.[focusMissionId]?.deadlineAtMinutes
    ? `Deadline operativo: ${state.missions.states[focusMissionId].deadlineAtMinutes - state.sim.totalMinutes >= 0 ? 'vigente' : 'vencido'}.`
    : 'Sin deadline crítico inmediato.';
  const queueLabel = queuedMissionIds.length
    ? `Además tengo ${queuedMissionIds.length} pedido${queuedMissionIds.length > 1 ? 's' : ''} en espera: ${queuedMissionIds.map((missionId) => getMissionOrPrimary(missionId)?.title || missionId).join(' · ')}.`
    : 'No tengo cola adicional crítica fuera del foco actual.';
  return [
    `Estado ejecutivo enviado a las ${state.sim.timeLabel}.`,
    buildMissionStatusLine(state, focusMissionId),
    deadlineLabel,
    queueLabel,
    focusMission ? `Siguiente paso comprometido: ${focusMission.title}.` : 'Siguiente paso comprometido: sostener el foco actual.'
  ].join(' ');
}

function applyRelationshipDelta(state, stakeholderId, trustDelta = 0, reputationDelta = 0) {
  applyStakeholderInteraction(state, stakeholderId, {
    trustDelta,
    reputationDelta,
    outcomeLabel: trustDelta >= 0 ? "status_update_sent" : "status_update_missed"
  });
}

function fireExecutiveStatusRequest(state, mission, missionState) {
  const eventId = `${mission.id}_executive_status_request`;
  if (state.events.firedIds.includes(eventId) || !missionState?.acceptedAtMinutes || missionState?.status === 'completed') return false;
  const minutesSinceAccept = state.sim.totalMinutes - missionState.acceptedAtMinutes;
  if (minutesSinceAccept < 85 || hasPendingCheckinForMission(state, mission.id, 'executive_status')) return false;

  const requesterId = mission.stakeholder?.id || 'carla_mendez';
  const checkinId = `checkin_${mission.id}_executive_status`;
  registerCheckin(state, {
    id: checkinId,
    missionId: mission.id,
    requesterId,
    requestType: 'executive_status',
    status: 'pending',
    requestedAtMinutes: state.sim.totalMinutes,
    dueAtMinutes: state.sim.totalMinutes + 50,
    respondedAtMinutes: null,
    threadId: `thread_${checkinId}`,
    summaryPrompt: 'Enviar estado ejecutivo corto con riesgo, avance y siguiente paso.'
  });
  addCheckinThread(state, createCheckinThread(state, {
    checkinId,
    missionId: mission.id,
    senderId: requesterId,
    subject: `Necesito estado ejecutivo de ${mission.title}`,
    preview: 'Pásame un status corto: avance, riesgo y si llegamos al próximo corte.',
    body: 'Antes del próximo corte necesito un estado ejecutivo corto. Dime en qué punto estás, si ves riesgo sobre el deadline y qué paso sigue. No necesito detalle técnico largo; necesito visibilidad.',
    priority: 'high',
    labels: ['checkin', 'executive', 'status_request']
  }));
  pushActivity(state, `${getStakeholder(requesterId)?.name || 'Stakeholder'} pidió un estado ejecutivo de ${mission.title}.`, 'warning');
  pushNotification(state, 'Check-in ejecutivo', 'Entró un pedido de estado ejecutivo que requiere respuesta corta y clara.', 'warning');
  state.events.firedIds.push(eventId);
  state.events.log.unshift({ id: createId('event'), eventId, createdAt: new Date().toISOString(), missionId: mission.id, type: 'executive_status_request' });
  return true;
}

function fireManagerCheckin(state) {
  const eventId = 'manager_midday_checkin';
  if (state.events.firedIds.includes(eventId)) return false;
  const queuedMissionIds = Object.entries(state.missions.states || {}).filter(([, item]) => item?.status === 'queued').map(([missionId]) => missionId);
  if (!queuedMissionIds.length) return false;
  if (state.sim.totalMinutes < 12 * 60 + 15) return false;
  const checkinId = 'checkin_manager_queue_midday';
  registerCheckin(state, {
    id: checkinId,
    missionId: state.missions.activeId || null,
    requesterId: 'mariana_soto',
    requestType: 'priority_alignment',
    status: 'pending',
    requestedAtMinutes: state.sim.totalMinutes,
    dueAtMinutes: state.sim.totalMinutes + 40,
    respondedAtMinutes: null,
    threadId: `thread_${checkinId}`,
    summaryPrompt: 'Confirmar foco actual, cola en espera y criterio de prioridad.'
  });
  addCheckinThread(state, createCheckinThread(state, {
    checkinId,
    missionId: state.missions.activeId || null,
    senderId: 'mariana_soto',
    subject: 'Necesito alineación rápida de prioridades',
    preview: 'Dime qué mantienes en foco y qué queda en cola para el cierre intermedio.',
    body: 'Veo pedidos compitiendo por tu atención. Antes del corte intermedio quiero una actualización corta: qué mantienes en foco, qué queda en cola y por qué. Necesito alineación, no detalle técnico completo.',
    priority: 'high',
    labels: ['checkin', 'manager', 'priority_alignment']
  }));
  pushActivity(state, 'Mariana abrió un check-in rápido de prioridades.', 'warning');
  pushNotification(state, 'Alineación de prioridades', 'Tu jefa pidió una actualización corta sobre foco y cola de trabajo.', 'warning');
  state.events.firedIds.push(eventId);
  state.events.log.unshift({ id: createId('event'), eventId, createdAt: new Date().toISOString(), type: 'manager_checkin' });
  return true;
}

function escalateMissedCheckins(state) {
  const bucket = ensureCheckinsState(state);
  let fired = 0;
  for (const item of bucket.items) {
    if (item.status !== 'pending' || !Number.isFinite(item.dueAtMinutes) || state.sim.totalMinutes <= item.dueAtMinutes) continue;
    const escalationEventId = `${item.id}_missed`;
    if (state.events.firedIds.includes(escalationEventId)) continue;
    const thread = state.mail.threads.find((entry) => entry.id === item.threadId);
    const requester = getStakeholder(item.requesterId);
    if (thread) {
      thread.unread = true;
      thread.priority = 'high';
      thread.labels = Array.from(new Set([...(thread.labels || []), 'missed_checkin']));
      thread.messages.push({
        id: createId('message'),
        from: requester?.name || item.requesterId,
        role: requester?.role || 'Stakeholder',
        body: 'Sigo sin ver tu actualización. No necesito el análisis completo todavía, pero sí visibilidad inmediata sobre avance, riesgo y prioridad actual.'
      });
      thread.preview = 'El check-in quedó sin respuesta y ahora ya es una escalada de seguimiento.';
      thread.subject = `Escalada: falta estado de ${thread.missionId ? getMissionOrPrimary(thread.missionId)?.title || 'la misión' : 'prioridades'}`;
    }
    item.status = 'missed';
    bucket.pendingIds = bucket.pendingIds.filter((id) => id !== item.id);
    if (!bucket.missedIds.includes(item.id)) bucket.missedIds.unshift(item.id);
    applyRelationshipDelta(state, item.requesterId, -3, -2);
    pushActivity(state, `Escalada de check-in: ${requester?.name || item.requesterId} sigue esperando estado.`, 'warning');
    pushNotification(state, 'Check-in vencido', 'Un pedido de estado quedó sin respuesta y escaló.', 'warning');
    state.events.firedIds.push(escalationEventId);
    state.events.log.unshift({ id: createId('event'), eventId: escalationEventId, createdAt: new Date().toISOString(), type: 'missed_checkin', checkinId: item.id });
    fired += 1;
  }
  return fired;
}

export function evaluateCheckinEvents(state) {
  ensureCheckinsState(state);
  let fired = 0;
  for (const mission of state.missions.catalog || []) {
    const missionState = state.missions.states?.[mission.id];
    if (!missionState?.isVisible) continue;
    fired += fireExecutiveStatusRequest(state, mission, missionState) ? 1 : 0;
  }
  fired += fireManagerCheckin(state) ? 1 : 0;
  fired += escalateMissedCheckins(state);
  return fired;
}

export function respondToCheckin(store, checkinId) {
  let responded = null;
  store.setState((state) => {
    const item = getCheckinById(state, checkinId);
    if (!item || item.status === 'responded') return;
    const thread = state.mail.threads.find((entry) => entry.id === item.threadId);
    const requester = getStakeholder(item.requesterId);
    const userLabel = state.player?.name || 'Analista';
    const userRole = state.player?.role || 'Analista de Datos';
    const statusBody = buildExecutiveStatusBody(state, item);
    if (thread) {
      thread.messages.push({ id: createId('message'), from: userLabel, role: userRole, body: statusBody });
      thread.messages.push({ id: createId('message'), from: requester?.name || item.requesterId, role: requester?.role || 'Stakeholder', body: 'Recibido. Me sirve tener visibilidad. Mantén ese criterio y avísame si cambia el riesgo o la prioridad.' });
      thread.preview = 'Check-in respondido con estado ejecutivo y criterio de prioridad.';
      thread.unread = false;
      thread.labels = Array.from(new Set([...(thread.labels || []), 'answered']));
    }
    item.status = 'responded';
    item.respondedAtMinutes = state.sim.totalMinutes;
    const bucket = ensureCheckinsState(state);
    bucket.pendingIds = bucket.pendingIds.filter((id) => id !== item.id);
    if (!bucket.completedIds.includes(item.id)) bucket.completedIds.unshift(item.id);
    applyRelationshipDelta(state, item.requesterId, 2, 1);
    pushActivity(state, `Check-in respondido para ${requester?.name || item.requesterId}.`, 'success');
    pushNotification(state, 'Estado enviado', 'El check-in quedó respondido y registrado.', 'success', 5800);
    responded = { checkin: item, threadId: item.threadId, missionId: item.missionId, requesterId: item.requesterId };
  }, { silent: true });
  return responded;
}

export function buildCheckinSummary(state) {
  const bucket = ensureCheckinsState(state);
  const pending = bucket.items.filter((item) => item.status === 'pending');
  const missed = bucket.items.filter((item) => item.status === 'missed');
  const lastCompleted = bucket.items.find((item) => item.status === 'responded') || null;
  return {
    pendingCount: pending.length,
    missedCount: missed.length,
    completedCount: bucket.completedIds.length,
    lastCompleted,
    pendingItems: pending
  };
}
