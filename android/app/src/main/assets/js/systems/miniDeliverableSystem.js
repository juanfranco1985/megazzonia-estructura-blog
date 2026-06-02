import { createId } from "../app/utils.js";
import { getStakeholder } from "../data/stakeholders.js";
import { getMissionOrPrimary } from "../data/missions.js";
import { applyMiniDeliverableAreaImpact } from './careerImpactSystem.js';
import { createBusinessReviewFromMiniDeliverable } from './businessReviewSystem.js';

export function ensureMiniDeliverableState(state) {
  state.miniDeliverables ||= { items: [], pendingIds: [], completedIds: [] };
  state.miniDeliverables.items ||= [];
  state.miniDeliverables.pendingIds ||= [];
  state.miniDeliverables.completedIds ||= [];
  return state.miniDeliverables;
}

function pushActivity(state, label, tone = 'info') {
  state.activity.unshift({ id: createId('activity'), label, tone, time: state.sim.timeLabel });
}

function pushNotification(state, title, message, level = 'info') {
  state.notifications.items.unshift({
    id: createId('notif_mini'),
    title,
    message,
    level,
    createdAt: new Date().toISOString(),
    expiresAt: Date.now() + 7000,
    unread: true
  });
}

function hasMiniDeliverableForTask(state, taskId) {
  return ensureMiniDeliverableState(state).items.some((item) => item.sourceTaskId === taskId);
}

function appendMiniThread(state, item, stakeholder, body) {
  const threadId = `thread_${item.id}`;
  if (state.mail.threads.some((thread) => thread.id == threadId)) return threadId;
  state.mail.threads.unshift({
    id: threadId,
    missionId: item.missionId,
    miniDeliverableId: item.id,
    threadType: 'mini_deliverable',
    senderId: stakeholder?.id || item.requesterId,
    senderName: stakeholder?.name || item.requesterId,
    senderRole: stakeholder?.role || 'Stakeholder',
    subject: item.subject,
    preview: item.preview,
    priority: item.priority || 'normal',
    timestamp: state.sim.timeLabel,
    unread: true,
    labels: ['mini_deliverable', item.deliverableType],
    attachments: [],
    messages: [{ id: createId('message'), from: stakeholder?.name || item.requesterId, role: stakeholder?.role || 'Stakeholder', body }]
  });
  return threadId;
}

function createMiniDefinition(state, task) {
  const mission = task?.missionId ? getMissionOrPrimary(task.missionId) : null;
  if (!task || !mission) return null;

  if (task.taskType === 'executive_cut') {
    return {
      id: createId('mini_deliverable'),
      missionId: mission.id,
      requesterId: task.requesterId,
      sourceTaskId: task.id,
      deliverableType: 'committee_summary',
      status: 'pending',
      title: `Resumen para comité: ${mission.title}`,
      subject: `Mini-entregable: resumen ejecutivo para ${mission.title}`,
      preview: 'La decisión de reunión ahora pide un output corto para comité antes del próximo corte.',
      priority: 'high',
      prompt: 'Redactar un resumen de 3 líneas con hallazgo principal, riesgo y recomendación para comité.'
    };
  }

  if (task.taskType === 'queued_alignment') {
    return {
      id: createId('mini_deliverable'),
      missionId: mission.id,
      requesterId: task.requesterId,
      sourceTaskId: task.id,
      deliverableType: 'internal_handoff',
      status: 'pending',
      title: `Handoff interno: ${mission.title}`,
      subject: `Mini-entregable: dejar handoff listo para ${mission.title}`,
      preview: 'El follow-up operativo pide dejar una nota interna para retomar el pedido sin perder contexto.',
      priority: 'normal',
      prompt: 'Registrar foco siguiente, riesgo operativo y primer paso recomendado para el próximo bloque.'
    };
  }

  return null;
}

export function createMiniDeliverableFromFollowup(store, task) {
  let result = null;
  store.setState((state) => {
    const taskId = task?.id || task?.taskId;
    if (!taskId || hasMiniDeliverableForTask(state, taskId)) return;
    const item = createMiniDefinition(state, { ...task, id: taskId });
    if (!item) return;
    const bucket = ensureMiniDeliverableState(state);
    const stakeholder = getStakeholder(item.requesterId);
    const threadId = appendMiniThread(
      state,
      item,
      stakeholder,
      item.deliverableType === 'committee_summary'
        ? 'Necesito un mini-output corto para comité. No rearmes todo: solo hallazgo principal, riesgo y recomendación.'
        : 'Deja un handoff interno corto para que el próximo bloque no pierda contexto ni prioridad.'
    );
    item.threadId = threadId;
    bucket.items.unshift(item);
    bucket.pendingIds.unshift(item.id);
    pushActivity(state, `Se abrió un mini-entregable: ${item.title}.`, item.priority === 'high' ? 'warning' : 'info');
    pushNotification(state, 'Mini-entregable abierto', item.title, item.priority === 'high' ? 'warning' : 'info');
    result = { itemId: item.id, threadId, deliverableType: item.deliverableType };
  }, { silent: true });
  return result;
}

function applyMiniOutput(state, item) {
  const missionState = item.missionId ? state.missions.states?.[item.missionId] : null;
  const mission = item.missionId ? getMissionOrPrimary(item.missionId) : null;
  if (item.deliverableType === 'committee_summary') {
    const summary = mission?.answerKey?.primaryFinding || mission?.answerKey?.winningChannel || 'el hallazgo principal';
    const text = `Resumen comité: ${summary} concentra el punto principal. Riesgo: requiere seguimiento inmediato. Recomendación: sostener una salida ejecutiva accionable.`;
    missionState.committeeSummaryReady = true;
    missionState.committeeSummaryText = text;
    state.ui.report.conclusion = text;
    state.ui.report.notes = [state.ui.report.notes, 'Mini-entregable listo: resumen corto para comité preparado.'].filter(Boolean).join('\n');
  }
  if (item.deliverableType === 'risk_note') {
    const text = `Nota de riesgo: el hallazgo principal requiere monitoreo porque puede escalar impacto operativo si no se corrige en el siguiente corte.`;
    missionState.riskNoteReady = true;
    missionState.riskNoteText = text;
    state.ui.report.notes = [state.ui.report.notes, text].filter(Boolean).join('\n');
  }
  if (item.deliverableType == 'internal_handoff') {
    const text = `Handoff interno: próximo foco sobre ${mission?.title || item.missionId}. Riesgo operativo controlado; primer paso recomendado: revisar dataset y validar consulta base.`;
    missionState.handoffReady = true;
    missionState.handoffText = text;
  }
}

export function createMiniDeliverableFromReviewDecision(state, review, optionId) {
  const mission = review?.missionId ? getMissionOrPrimary(review.missionId) : null;
  if (!review || !mission || optionId !== "request_risk_note") return null;
  const existing = ensureMiniDeliverableState(state).items.find((item) => item.sourceReviewId === review.id && item.deliverableType === "risk_note");
  if (existing) return existing;
  const item = {
    id: createId('mini_deliverable'),
    missionId: mission.id,
    requesterId: review.requesterId,
    sourceReviewId: review.id,
    deliverableType: 'risk_note',
    status: 'pending',
    title: `Nota de riesgo: ${mission.title}`,
    subject: `Mini-entregable: nota de riesgo para ${mission.title}`,
    preview: 'Negocio pidió un mini-output adicional enfocado en riesgo antes del corte ejecutivo.',
    priority: 'high',
    prompt: 'Redactar una nota de 2 o 3 líneas con riesgo principal, impacto y mitigación sugerida.'
  };
  const stakeholder = getStakeholder(item.requesterId);
  const threadId = appendMiniThread(state, item, stakeholder, 'Necesito una nota de riesgo extremadamente breve: riesgo principal, impacto y mitigación sugerida.');
  item.threadId = threadId;
  const bucket = ensureMiniDeliverableState(state);
  bucket.items.unshift(item);
  bucket.pendingIds.unshift(item.id);
  pushActivity(state, `Se abrió un mini-entregable adicional: ${item.title}.`, 'warning');
  pushNotification(state, 'Mini-entregable adicional', item.title, 'warning');
  return item;
}

export function resolveMiniDeliverable(store, itemId) {
  let result = null;
  store.setState((state) => {
    const item = ensureMiniDeliverableState(state).items.find((entry) => entry.id === itemId) || null;
    if (!item || item.status === 'completed') return;
    item.status = 'completed';
    item.completedAt = new Date().toISOString();
    ensureMiniDeliverableState(state).pendingIds = ensureMiniDeliverableState(state).pendingIds.filter((id) => id !== item.id);
    if (!ensureMiniDeliverableState(state).completedIds.includes(item.id)) {
      ensureMiniDeliverableState(state).completedIds.unshift(item.id);
    }
    applyMiniOutput(state, item);
    const thread = state.mail.threads.find((entry) => entry.id === item.threadId);
    const stakeholder = getStakeholder(item.requesterId);
    if (thread) {
      thread.unread = false;
      thread.labels = Array.from(new Set([...(thread.labels || []), 'mini_done']));
      thread.preview = 'El mini-entregable ya quedó preparado y registrado.';
      thread.messages.push({
        id: createId('message'),
        from: state.player.name,
        role: state.player.role,
        body: item.deliverableType === 'committee_summary'
          ? 'Dejé listo el resumen ejecutivo corto para comité con hallazgo, riesgo y recomendación.'
          : item.deliverableType === 'risk_note'
            ? 'Dejé la nota de riesgo breve con impacto y mitigación sugerida.'
            : 'Dejé el handoff interno preparado para retomar el siguiente bloque sin perder contexto.'
      });
      thread.messages.push({
        id: createId('message'),
        from: stakeholder?.name || item.requesterId,
        role: stakeholder?.role || 'Stakeholder',
        body: item.deliverableType === 'committee_summary'
          ? 'Perfecto. Esto me sirve para mover la conversación ejecutiva sin esperar la entrega completa.'
          : item.deliverableType === 'risk_note'
            ? 'Bien. Con esta nota ya puedo sostener el riesgo frente al comité.'
            : 'Bien. Con este handoff la continuidad del trabajo queda mucho más ordenada.'
      });
    }
    applyMiniDeliverableAreaImpact(state, item.deliverableType, item.requesterId);
    pushActivity(state, `Mini-entregable resuelto: ${item.title}.`, 'success');
    result = { itemId: item.id, threadId: item.threadId };
  }, { silent: true });
  if (result) {
    const current = store.getState();
    const item = ensureMiniDeliverableState(current).items.find((entry) => entry.id === itemId);
    if (item && ['committee_summary', 'internal_handoff'].includes(item.deliverableType)) {
      createBusinessReviewFromMiniDeliverable(store, item);
    }
  }
  return result;
}

export function buildMiniDeliverableSummary(state) {
  const bucket = ensureMiniDeliverableState(state);
  const pendingItems = bucket.items.filter((item) => item.status === 'pending');
  return {
    items: bucket.items,
    pendingItems,
    pendingCount: bucket.pendingIds.length,
    completedCount: bucket.completedIds.length,
    nextItem: pendingItems[0] || null
  };
}
