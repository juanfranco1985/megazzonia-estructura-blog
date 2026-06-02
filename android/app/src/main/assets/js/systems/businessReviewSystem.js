import { createId } from "../app/utils.js";
import { getStakeholder } from "../data/stakeholders.js";
import { getMissionOrPrimary } from "../data/missions.js";
import { markMissionQueued, markMissionFocused } from "./missions/missionRuntime.js";
import { createMiniDeliverableFromReviewDecision } from "./miniDeliverableSystem.js";
import { applyAreaSignal, applyStakeholderAreaSignal } from "./careerImpactSystem.js";
import { applyStakeholderInteraction } from "./stakeholders/stakeholderEngine.js";

export function ensureBusinessReviewState(state) {
  state.businessReviews ||= { items: [], pendingIds: [], completedIds: [] };
  state.businessReviews.items ||= [];
  state.businessReviews.pendingIds ||= [];
  state.businessReviews.completedIds ||= [];
  return state.businessReviews;
}

function pushActivity(state, label, tone = 'info') {
  state.activity.unshift({ id: createId('activity'), label, tone, time: state.sim.timeLabel });
}

function pushNotification(state, title, message, level = 'info') {
  state.notifications.items.unshift({
    id: createId('notif_review'),
    title,
    message,
    level,
    createdAt: new Date().toISOString(),
    expiresAt: Date.now() + 7000,
    unread: true
  });
}

function hasReviewForMini(state, miniId) {
  return ensureBusinessReviewState(state).items.some((item) => item.sourceMiniDeliverableId === miniId);
}

function createReviewDefinition(item) {
  const mission = item?.missionId ? getMissionOrPrimary(item.missionId) : null;
  if (!item || !mission) return null;
  if (item.deliverableType === 'committee_summary') {
    return {
      id: createId('business_review'),
      missionId: mission.id,
      requesterId: 'carla_mendez',
      sourceMiniDeliverableId: item.id,
      reviewType: 'committee_summary_review',
      status: 'pending',
      subject: `Respuesta de negocio: ${mission.title}`,
      preview: 'Negocio revisó el resumen corto y pide una definición ejecutiva sobre el siguiente paso.',
      priority: 'high',
      options: [
        { id: 'approve_committee_cut', label: 'Mantener recorte ejecutivo', effectLabel: 'Aprobado para comité' },
        { id: 'request_risk_note', label: 'Pedir nota adicional de riesgo', effectLabel: 'Solicitar nota de riesgo' }
      ]
    };
  }
  if (item.deliverableType === 'internal_handoff') {
    return {
      id: createId('business_review'),
      missionId: mission.id,
      requesterId: 'lucia_ferraro',
      sourceMiniDeliverableId: item.id,
      reviewType: 'handoff_review',
      status: 'pending',
      subject: `Respuesta operativa: ${mission.title}`,
      preview: 'Operaciones revisó el handoff y pide decidir si el pedido sigue en cola o si vuelve a foco ya.',
      priority: 'normal',
      options: [
        { id: 'keep_queue_ready', label: 'Mantener misión en cola', effectLabel: 'Cola confirmada' },
        { id: 'bring_forward_now', label: 'Traer misión al foco ahora', effectLabel: 'Volver a foco' }
      ]
    };
  }
  return null;
}

function appendReviewThread(state, review, stakeholder) {
  const threadId = `thread_${review.id}`;
  if (state.mail.threads.some((thread) => thread.id === threadId)) return threadId;
  const body = review.reviewType === 'committee_summary_review'
    ? 'Leí el resumen corto. Define si dejamos el recorte ejecutivo tal como está o si necesito una nota adicional de riesgo antes del comité.'
    : 'Revisé el handoff. Define si este pedido sigue en cola o si vuelve a foco ahora por presión operativa.';
  state.mail.threads.unshift({
    id: threadId,
    missionId: review.missionId,
    businessReviewId: review.id,
    threadType: 'business_review',
    senderId: stakeholder?.id || review.requesterId,
    senderName: stakeholder?.name || review.requesterId,
    senderRole: stakeholder?.role || 'Stakeholder',
    subject: review.subject,
    preview: review.preview,
    priority: review.priority || 'normal',
    timestamp: state.sim.timeLabel,
    unread: true,
    labels: ['business_review', review.reviewType],
    attachments: [],
    messages: [{ id: createId('message'), from: stakeholder?.name || review.requesterId, role: stakeholder?.role || 'Stakeholder', body }]
  });
  return threadId;
}

export function createBusinessReviewFromMiniDeliverable(store, item) {
  let result = null;
  store.setState((state) => {
    const itemId = item?.id || item?.miniDeliverableId;
    if (!itemId || hasReviewForMini(state, itemId)) return;
    const review = createReviewDefinition({ ...item, id: itemId });
    if (!review) return;
    const stakeholder = getStakeholder(review.requesterId);
    review.threadId = appendReviewThread(state, review, stakeholder);
    const bucket = ensureBusinessReviewState(state);
    bucket.items.unshift(review);
    bucket.pendingIds.unshift(review.id);
    pushActivity(state, `Negocio respondió al mini-entregable y dejó una definición pendiente: ${review.subject}.`, review.priority === 'high' ? 'warning' : 'info');
    pushNotification(state, 'Respuesta de negocio', review.subject, review.priority === 'high' ? 'warning' : 'info');
    result = { reviewId: review.id, threadId: review.threadId };
  }, { silent: true });
  return result;
}

function bringMissionToFocus(state, missionId) {
  if (!missionId) return;
  const activeId = state.missions.activeId;
  if (activeId && activeId !== missionId) {
    state.missions.states[activeId] = markMissionQueued(state.missions.states[activeId], state.sim.totalMinutes);
  }
  state.missions.states[missionId] = markMissionFocused({ ...(state.missions.states[missionId] || {}), isUnlocked: true, isVisible: true });
  state.missions.activeId = missionId;
  state.files.activeBundleId = missionId;
}

export function resolveBusinessReview(store, reviewId, optionId) {
  let result = null;
  store.setState((state) => {
    const bucket = ensureBusinessReviewState(state);
    const review = bucket.items.find((item) => item.id === reviewId) || null;
    if (!review || review.status === 'completed') return;
    const option = (review.options || []).find((entry) => entry.id === optionId) || null;
    if (!option) return;
    review.status = 'completed';
    review.selectedOptionId = optionId;
    review.completedAt = new Date().toISOString();
    bucket.pendingIds = bucket.pendingIds.filter((id) => id !== review.id);
    if (!bucket.completedIds.includes(review.id)) bucket.completedIds.unshift(review.id);

    const missionState = state.missions.states?.[review.missionId];
    if (missionState) {
      missionState.lastBusinessReviewId = review.id;
      missionState.lastBusinessDecision = optionId;
    }

    if (optionId === 'approve_committee_cut') {
      if (missionState) {
        missionState.committeeReviewStatus = 'approved';
        missionState.scopeMode = 'executive_cut';
      }
      state.ui.report.notes = [state.ui.report.notes, 'Negocio aprobó sostener el recorte ejecutivo para comité.'].filter(Boolean).join('\n');
      applyAreaSignal(state, 'leadership', 5, 'Comité validó el recorte ejecutivo sin pedir trabajo adicional.');
      applyStakeholderAreaSignal(state, review.requesterId, 3, 'Negocio aprobó el resumen corto y el recorte ejecutivo.');
      applyStakeholderInteraction(state, review.requesterId, {
        missionId: review.missionId,
        trustDelta: 2,
        reputationDelta: 2,
        outcomeLabel: 'business_approved',
        note: 'Negocio compro el recorte ejecutivo sin pedir trabajo adicional.'
      });
    }

    if (optionId === 'request_risk_note') {
      if (missionState) missionState.committeeReviewStatus = 'risk_note_requested';
      state.ui.report.notes = [state.ui.report.notes, 'Negocio pidió una nota adicional de riesgo antes del corte de comité.'].filter(Boolean).join('\n');
      createMiniDeliverableFromReviewDecision(state, review, optionId);
      applyAreaSignal(state, 'leadership', 2, 'Comité pidió una nota adicional de riesgo para sostener la conversación.');
      applyStakeholderAreaSignal(state, review.requesterId, 1, 'Negocio pidió ampliar el output con una nota de riesgo.');
      applyStakeholderInteraction(state, review.requesterId, {
        missionId: review.missionId,
        trustDelta: -1,
        reputationDelta: 0,
        outcomeLabel: 'business_risk_note',
        note: 'Negocio pidio ampliar el output antes de cerrar el tema.'
      });
    }

    if (optionId === 'keep_queue_ready') {
      if (missionState) missionState.handoffReviewStatus = 'queue_confirmed';
      applyAreaSignal(state, 'operations', 4, 'Operaciones confirmó que el pedido puede seguir en cola sin perder control.');
      applyStakeholderInteraction(state, review.requesterId, {
        missionId: review.missionId,
        trustDelta: 1,
        reputationDelta: 1,
        outcomeLabel: 'queue_confirmed',
        note: 'Operaciones acepto sostener la cola sin pedir cambio inmediato de foco.'
      });
    }

    if (optionId === 'bring_forward_now') {
      if (missionState) missionState.handoffReviewStatus = 'brought_forward';
      bringMissionToFocus(state, review.missionId);
      applyAreaSignal(state, 'operations', 6, 'Operaciones pidió volver a foco con prioridad inmediata.');
      applyStakeholderAreaSignal(state, review.requesterId, 2, 'El área reordenó foco y obtuvo respuesta rápida.');
      applyStakeholderInteraction(state, review.requesterId, {
        missionId: review.missionId,
        trustDelta: 2,
        reputationDelta: 1,
        outcomeLabel: 'focus_reordered',
        note: 'Se acepto un cambio de foco rapido por presion operativa.'
      });
    }

    const stakeholder = getStakeholder(review.requesterId);
    const thread = state.mail.threads.find((entry) => entry.id === review.threadId);
    if (thread) {
      thread.unread = false;
      thread.labels = Array.from(new Set([...(thread.labels || []), 'review_resolved', optionId]));
      thread.preview = option.effectLabel;
      thread.messages.push({ id: createId('message'), from: state.player.name, role: state.player.role, body: `Resolución enviada: ${option.label}.` });
      thread.messages.push({
        id: createId('message'),
        from: stakeholder?.name || review.requesterId,
        role: stakeholder?.role || 'Stakeholder',
        body: optionId === 'request_risk_note'
          ? 'Bien. Entonces necesito esa nota de riesgo corta antes de mover esto a comité.'
          : optionId === 'bring_forward_now'
            ? 'Perfecto. Entonces lo traemos a foco ahora y reordenamos prioridad.'
            : 'Queda registrado. Sigo con ese criterio para el siguiente bloque.'
      });
    }

    const tone = optionId === 'request_risk_note' || optionId === 'bring_forward_now' ? 'warning' : 'success';
    pushActivity(state, `Se resolvió una definición de negocio: ${option.effectLabel}.`, tone);
    result = { reviewId: review.id, threadId: review.threadId, optionId };
  }, { silent: true });
  return result;
}

export function buildBusinessReviewSummary(state) {
  const bucket = ensureBusinessReviewState(state);
  const pendingItems = bucket.items.filter((item) => item.status === 'pending');
  return {
    items: bucket.items,
    pendingItems,
    pendingCount: bucket.pendingIds.length,
    completedCount: bucket.completedIds.length,
    nextItem: pendingItems[0] || null
  };
}
