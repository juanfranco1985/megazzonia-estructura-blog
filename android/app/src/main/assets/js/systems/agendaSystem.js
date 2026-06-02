import { createId } from "../app/utils.js";
import { getStakeholder } from "../data/stakeholders.js";
import { getMissionOrPrimary } from "../data/missions.js";
import { applyStakeholderInteraction } from "./stakeholders/stakeholderEngine.js";

const AGENDA_DURATION_BY_TYPE = {
  standup: 12,
  mission_review: 18,
  priority_sync: 16
};

const AGENDA_RESCHEDULE_LIMIT_BY_TYPE = {
  standup: 1,
  mission_review: 1,
  priority_sync: 1
};

const AGENDA_REPROGRAM_BUFFER_BY_TYPE = {
  standup: 20,
  mission_review: 30,
  priority_sync: 24
};

function ensureAgendaState(state) {
  state.agenda ||= {
    items: [],
    pendingIds: [],
    completedIds: [],
    missedIds: [],
    focusWindow: null
  };
  state.agenda.items ||= [];
  state.agenda.pendingIds ||= [];
  state.agenda.completedIds ||= [];
  state.agenda.missedIds ||= [];
  state.agenda.focusWindow ||= null;
  return state.agenda;
}

function findAgendaItem(state, agendaId) {
  return ensureAgendaState(state).items.find((item) => item.id === agendaId) || null;
}

function hasAgendaEvent(state, eventId) {
  return state.events?.firedIds?.includes(eventId);
}

function pushActivity(state, label, tone = "info") {
  state.activity.unshift({
    id: createId("activity"),
    label,
    tone,
    time: state.sim.timeLabel
  });
}

function pushNotification(state, title, message, level = "info") {
  state.notifications.items.unshift({
    id: createId("notif_agenda"),
    title,
    message,
    level,
    createdAt: new Date().toISOString(),
    expiresAt: Date.now() + 7000,
    unread: true
  });
}

function getAgendaDuration(itemOrType) {
  const agendaType = typeof itemOrType === "string" ? itemOrType : itemOrType?.agendaType;
  return AGENDA_DURATION_BY_TYPE[agendaType] || 15;
}

function getAgendaStartMinutes(item) {
  if (!item) return 0;
  if (Number.isFinite(item.scheduledForMinutes)) {
    return item.scheduledForMinutes;
  }
  if (Number.isFinite(item.dueAtMinutes)) {
    return item.dueAtMinutes - getAgendaDuration(item);
  }
  return 0;
}

function getAgendaEndMinutes(item) {
  return getAgendaStartMinutes(item) + (item?.durationMinutes || getAgendaDuration(item));
}

function getPendingAgendaItems(state) {
  return ensureAgendaState(state).items
    .filter((item) => item.status === "pending")
    .sort((left, right) => getAgendaStartMinutes(left) - getAgendaStartMinutes(right));
}

function getQueuedMissionIds(state) {
  return Object.entries(state.missions.states || {})
    .filter(([, missionState]) => missionState?.status === "queued")
    .map(([missionId]) => missionId);
}

function doAgendaItemsOverlap(left, right) {
  if (!left || !right || left.id === right.id) return false;
  return getAgendaStartMinutes(left) < getAgendaEndMinutes(right)
    && getAgendaStartMinutes(right) < getAgendaEndMinutes(left);
}

function buildConflictMap(pendingItems) {
  const conflictMap = new Map(pendingItems.map((item) => [item.id, new Set()]));

  for (let index = 0; index < pendingItems.length; index += 1) {
    for (let compareIndex = index + 1; compareIndex < pendingItems.length; compareIndex += 1) {
      const current = pendingItems[index];
      const candidate = pendingItems[compareIndex];
      if (!doAgendaItemsOverlap(current, candidate)) continue;
      conflictMap.get(current.id)?.add(candidate.id);
      conflictMap.get(candidate.id)?.add(current.id);
    }
  }

  return conflictMap;
}

function refreshAgendaConflictMetadata(state) {
  const agenda = ensureAgendaState(state);
  const pendingItems = getPendingAgendaItems(state);
  const conflictMap = buildConflictMap(pendingItems);

  for (const item of agenda.items) {
    item.conflictIds = [];
    item.hasConflict = false;
  }

  for (const item of pendingItems) {
    const conflictIds = Array.from(conflictMap.get(item.id) || []);
    item.conflictIds = conflictIds;
    item.hasConflict = conflictIds.length > 0;
  }

  return pendingItems;
}

function buildAgendaPressure(state) {
  const agenda = ensureAgendaState(state);
  const pendingItems = getPendingAgendaItems(state);
  const conflictMap = buildConflictMap(pendingItems);
  const now = state.sim.totalMinutes;
  const conflictIds = new Set();

  for (const item of pendingItems) {
    for (const conflictId of conflictMap.get(item.id) || []) {
      conflictIds.add(item.id);
      conflictIds.add(conflictId);
    }
  }

  const dueSoonCount = pendingItems.filter((item) => (item.dueAtMinutes - now) <= 25).length;
  const pendingCheckinCount = state.checkins?.pendingIds?.length || 0;
  const queuedMissionCount = getQueuedMissionIds(state).length;
  const missedCount = agenda.missedIds.length;
  const score = (pendingItems.length * 2)
    + (conflictIds.size * 2)
    + (dueSoonCount * 2)
    + (pendingCheckinCount * 2)
    + queuedMissionCount
    + (missedCount * 2);

  let label = "Estable";
  let tone = "success";
  if (score >= 10) {
    label = "Critica";
    tone = "error";
  } else if (score >= 6) {
    label = "Alta";
    tone = "warning";
  } else if (score >= 3) {
    label = "Media";
    tone = "info";
  }

  let note = "Sin friccion fuerte de agenda.";
  if (conflictIds.size) {
    note = `Hay ${conflictIds.size} reunion${conflictIds.size > 1 ? "es" : ""} en choque y piden decision operativa.`;
  } else if (dueSoonCount || pendingCheckinCount || queuedMissionCount) {
    note = `Agenda con ${dueSoonCount} corte${dueSoonCount > 1 ? "s" : ""} proximo${dueSoonCount === 1 ? "" : "s"}, ${pendingCheckinCount} check-in${pendingCheckinCount === 1 ? "" : "s"} y ${queuedMissionCount} pedido${queuedMissionCount === 1 ? "" : "s"} en cola.`;
  }

  return {
    score,
    label,
    tone,
    note,
    conflictCount: conflictIds.size,
    dueSoonCount,
    pendingCheckinCount,
    queuedMissionCount
  };
}

function maybeInterruptFocusWindow(state, item, pressure) {
  const agenda = ensureAgendaState(state);
  if (!agenda.focusWindow?.active) return false;

  const startsBeforeFocusEnds = getAgendaStartMinutes(item) < agenda.focusWindow.endsAtMinutes;
  if (!startsBeforeFocusEnds && !(item.conflictIds || []).length && pressure.label !== "Critica") {
    return false;
  }

  agenda.focusWindow.active = false;
  agenda.focusWindow.interruptedAtMinutes = state.sim.totalMinutes;
  agenda.focusWindow.interruptedByAgendaId = item.id;
  agenda.focusWindow.interruptionReason = (item.conflictIds || []).length ? "agenda_conflict" : "urgent_meeting";
  pushActivity(state, `La ventana de foco se corto por agenda densa: ${item.title}.`, "warning");
  pushNotification(state, "Foco interrumpido", "Entro una reunion que rompe el bloque protegido y te obliga a reordenar foco.", "warning");
  return true;
}

function addAgendaThread(state, { agendaId, missionId, senderId, subject, body, preview, priority = "normal", labels = [] }) {
  const stakeholder = getStakeholder(senderId);
  const threadId = `thread_${agendaId}`;
  if (state.mail.threads.some((thread) => thread.id === threadId)) {
    return threadId;
  }
  state.mail.threads.unshift({
    id: threadId,
    missionId,
    agendaId,
    threadType: "meeting",
    senderId,
    senderName: stakeholder?.name || senderId,
    senderRole: stakeholder?.role || "Stakeholder",
    subject,
    preview,
    priority,
    timestamp: state.sim.timeLabel,
    unread: true,
    labels: ["meeting", ...labels],
    attachments: [],
    messages: [
      {
        id: createId("message"),
        from: stakeholder?.name || senderId,
        role: stakeholder?.role || "Stakeholder",
        body
      }
    ]
  });
  state.mail.selectedThreadId = threadId;
  return threadId;
}

function applyMeetingRelationshipDelta(state, stakeholderId, trustDelta = 0, reputationDelta = 0, outcomeLabel = null) {
  applyStakeholderInteraction(state, stakeholderId, {
    trustDelta,
    reputationDelta,
    outcomeLabel: outcomeLabel || (trustDelta >= 0 ? "meeting_attended" : "meeting_missed")
  });
}

function registerAgendaItem(state, item) {
  const agenda = ensureAgendaState(state);
  agenda.items.unshift(item);
  if (!agenda.pendingIds.includes(item.id)) {
    agenda.pendingIds.unshift(item.id);
  }

  const pendingItems = refreshAgendaConflictMetadata(state);
  const createdItem = pendingItems.find((entry) => entry.id === item.id) || findAgendaItem(state, item.id);
  const pressure = buildAgendaPressure(state);

  if (createdItem?.hasConflict) {
    const thread = state.mail.threads.find((entry) => entry.id === createdItem.threadId);
    const conflictingTitles = (createdItem.conflictIds || [])
      .map((conflictId) => findAgendaItem(state, conflictId)?.title)
      .filter(Boolean);

    if (thread) {
      thread.labels = Array.from(new Set([...(thread.labels || []), "agenda_conflict"]));
      if (conflictingTitles.length) {
        thread.preview = `Este espacio se cruza con: ${conflictingTitles.join(" / ")}.`;
      }
    }

    pushActivity(state, `Choque de agenda: ${createdItem.title} compite con otro corte del mismo bloque.`, "warning");
    pushNotification(state, "Choque de agenda", "Dos reuniones se pisan y te fuerzan a elegir, mover o dejar pasar una de ellas.", "warning");
  }

  if (createdItem) {
    maybeInterruptFocusWindow(state, createdItem, pressure);
  }
}

function createAgendaItem(state, payload) {
  const agendaId = payload.id;
  const durationMinutes = payload.durationMinutes || getAgendaDuration(payload.agendaType);
  const item = {
    id: agendaId,
    missionId: payload.missionId || null,
    requesterId: payload.requesterId,
    targetMissionId: payload.targetMissionId || null,
    title: payload.title,
    agendaType: payload.agendaType,
    status: "pending",
    scheduledForMinutes: payload.scheduledForMinutes,
    dueAtMinutes: payload.dueAtMinutes,
    durationMinutes,
    attendedAtMinutes: null,
    missedAtMinutes: null,
    summaryPrompt: payload.summaryPrompt || "",
    focusImpact: payload.focusImpact || "medium",
    threadId: null,
    rescheduleCount: payload.rescheduleCount || 0,
    maxReschedules: payload.maxReschedules ?? AGENDA_RESCHEDULE_LIMIT_BY_TYPE[payload.agendaType] ?? 1,
    conflictIds: [],
    hasConflict: false
  };
  const threadId = addAgendaThread(state, {
    agendaId,
    missionId: payload.missionId,
    senderId: payload.requesterId,
    subject: payload.subject,
    body: payload.body,
    preview: payload.preview,
    priority: payload.priority || "normal",
    labels: payload.labels || []
  });
  item.threadId = threadId;
  registerAgendaItem(state, item);
}

function scheduleMidmorningStandup(state) {
  const eventId = "agenda_midmorning_standup_day1";
  if (hasAgendaEvent(state, eventId)) return false;
  if (state.sim.totalMinutes < (9 * 60) + 35) return false;
  createAgendaItem(state, {
    id: "agenda_midmorning_standup",
    missionId: state.missions.activeId,
    requesterId: "mariana_soto",
    agendaType: "standup",
    title: "Standup operativo de media manana",
    scheduledForMinutes: (9 * 60) + 45,
    dueAtMinutes: (10 * 60) + 5,
    subject: "Standup corto de media manana",
    preview: "Necesito un corte corto de prioridades, riesgo y siguiente paso antes de las 10:05.",
    body: "Hagamos un standup corto. Quiero foco actual, riesgo principal y siguiente paso. No necesito un repaso largo: necesito coordinacion rapida antes del siguiente bloque.",
    priority: "normal",
    labels: ["agenda", "standup"],
    summaryPrompt: "Resumir foco actual, riesgo principal y siguiente paso inmediato.",
    focusImpact: "low",
    durationMinutes: 12
  });
  pushActivity(state, "Se agendo un standup operativo de media manana.", "info");
  pushNotification(state, "Standup agendado", "Tienes un corte operativo programado antes de las 10:05.", "info");
  state.events.firedIds.push(eventId);
  return true;
}

function schedulePrioritySync(state) {
  const queuedMissionIds = getQueuedMissionIds(state);
  if (!state.missions.activeId || !queuedMissionIds.length) return false;

  const targetMissionId = queuedMissionIds[0];
  const eventId = `agenda_priority_sync_${state.missions.activeId}_${targetMissionId}`;
  if (hasAgendaEvent(state, eventId)) return false;
  if (state.sim.totalMinutes < (9 * 60) + 42) return false;

  const activeMission = getMissionOrPrimary(state.missions.activeId);
  const targetMission = getMissionOrPrimary(targetMissionId);
  createAgendaItem(state, {
    id: `agenda_priority_sync_${targetMissionId}`,
    missionId: state.missions.activeId,
    requesterId: "mariana_soto",
    targetMissionId,
    agendaType: "priority_sync",
    title: `Alinear foco y cola: ${targetMission?.title || targetMissionId}`,
    scheduledForMinutes: (9 * 60) + 50,
    dueAtMinutes: (10 * 60) + 12,
    subject: `Necesito decidir foco vs cola: ${targetMission?.title || targetMissionId}`,
    preview: "Se te cruzo un corte para definir que sostienes en foco y que dejas preparado en la cola.",
    body: `Tengo ${activeMission?.title || "el foco actual"} abierto y ${targetMission?.title || targetMissionId} esperando. Necesito una definicion corta: que sostienes ahora, que dejas en cola y como minimizas perdida de contexto.`,
    priority: "high",
    labels: ["agenda", "priority_sync"],
    summaryPrompt: "Definir foco actual, mision en cola y criterio de reprogramacion.",
    focusImpact: "high",
    durationMinutes: 16
  });
  pushActivity(state, `Entro una alineacion de prioridad para revisar la cola de ${targetMission?.title || targetMissionId}.`, "warning");
  pushNotification(state, "Alineacion de foco", "La cola de trabajo abrio un corte que se cruza con el bloque operativo actual.", "warning");
  state.events.firedIds.push(eventId);
  return true;
}

function scheduleMissionReview(state) {
  const missionId = state.missions.activeId;
  const missionState = missionId ? state.missions.states?.[missionId] : null;
  const mission = missionId ? getMissionOrPrimary(missionId) : null;
  if (!missionId || !missionState || !mission || !missionState.acceptedAtMinutes) return false;
  const eventId = `agenda_review_${missionId}`;
  if (hasAgendaEvent(state, eventId)) return false;
  if ((state.sim.totalMinutes - missionState.acceptedAtMinutes) < 120) return false;
  createAgendaItem(state, {
    id: `agenda_review_${missionId}`,
    missionId,
    requesterId: mission.stakeholder?.id || mission.stakeholderId || "mariana_soto",
    agendaType: "mission_review",
    title: `Revision rapida de ${mission.title}`,
    scheduledForMinutes: state.sim.totalMinutes + 20,
    dueAtMinutes: state.sim.totalMinutes + 45,
    subject: `Reserva 15 min para revisar ${mission.title}`,
    preview: "Necesito una revision corta del estado, riesgo y criterio de cierre antes del proximo bloque.",
    body: "Reservemos un bloque breve para revisar estado, riesgo y criterio de cierre. La idea es confirmar si seguimos igual, si ajustamos foco o si necesitamos un recorte ejecutivo adicional.",
    priority: "high",
    labels: ["agenda", "review"],
    summaryPrompt: "Explicar estado, riesgo, deadline y criterio de cierre.",
    focusImpact: "high",
    durationMinutes: 18
  });
  pushActivity(state, `Se programo una revision rapida para ${mission.title}.`, "warning");
  pushNotification(state, "Reunion programada", "Entro una revision rapida asociada a tu mision activa.", "warning");
  state.events.firedIds.push(eventId);
  return true;
}

function maybeCloseFocusWindow(state) {
  const agenda = ensureAgendaState(state);
  if (!agenda.focusWindow?.active) return false;
  if (state.sim.totalMinutes < agenda.focusWindow.endsAtMinutes) return false;
  agenda.focusWindow.active = false;
  agenda.focusWindow.closedAtMinutes = state.sim.totalMinutes;
  agenda.focusWindow.closedReason = "completed";
  pushActivity(state, "Se cerro la ventana de foco. Vuelven interrupciones normales y coordinacion abierta.", "info");
  return true;
}

function getMissPenalty(reason, pressureLabel) {
  if (reason === "deprioritized") {
    if (pressureLabel === "Critica") return { trustDelta: -2, reputationDelta: -1 };
    return { trustDelta: -3, reputationDelta: -1 };
  }
  if (pressureLabel === "Critica") return { trustDelta: -4, reputationDelta: -2 };
  if (pressureLabel === "Alta") return { trustDelta: -3, reputationDelta: -1 };
  return { trustDelta: -2, reputationDelta: -1 };
}

function markAgendaMiss(state, item, reason = "natural_miss") {
  const agenda = ensureAgendaState(state);
  if (!item || item.status !== "pending") return false;
  const pressureBeforeMiss = buildAgendaPressure(state);

  item.status = "missed";
  item.missedAtMinutes = state.sim.totalMinutes;
  item.missedReason = reason;
  agenda.pendingIds = agenda.pendingIds.filter((id) => id !== item.id);
  if (!agenda.missedIds.includes(item.id)) {
    agenda.missedIds.unshift(item.id);
  }

  const stakeholder = getStakeholder(item.requesterId);
  const penalty = getMissPenalty(reason, pressureBeforeMiss.label);
  const thread = state.mail.threads.find((entry) => entry.id === item.threadId);
  if (thread) {
    const conflictTitles = (item.conflictIds || [])
      .map((conflictId) => findAgendaItem(state, conflictId)?.title)
      .filter(Boolean);
    thread.unread = true;
    thread.priority = "high";
    thread.labels = Array.from(new Set([...(thread.labels || []), reason === "deprioritized" ? "deprioritized_meeting" : "missed_meeting"]));
    thread.preview = reason === "deprioritized"
      ? "Dejaste pasar esta reunion para sostener otra prioridad."
      : "La reunion quedo sin atender y ahora subio de tono.";
    thread.messages.push({
      id: createId("message"),
      from: stakeholder?.name || item.requesterId,
      role: stakeholder?.role || "Stakeholder",
      body: reason === "deprioritized"
        ? `Veo que dejaste este espacio fuera del bloque actual${conflictTitles.length ? ` porque se te cruzo con ${conflictTitles.join(" y ")}` : ""}. Necesito que recuperes visibilidad en cuanto cierres la urgencia.`
        : "La reunion quedo sin atender. Necesito que retomes visibilidad y coordinacion en cuanto cierres el bloque actual."
    });
  }

  refreshAgendaConflictMetadata(state);
  applyMeetingRelationshipDelta(state, item.requesterId, penalty.trustDelta, penalty.reputationDelta, reason === "deprioritized" ? "meeting_deprioritized" : "meeting_missed");
  pushActivity(state, `${reason === "deprioritized" ? "Dejaste pasar" : "Reunion perdida"}: ${item.title}.`, "warning");
  pushNotification(state, reason === "deprioritized" ? "Reunion desplazada" : "Reunion perdida", "La agenda absorbio el bloque y ya dejo un costo de coordinacion.", "warning");
  return true;
}

function markMissedAgendaItems(state) {
  let changed = 0;
  for (const item of [...getPendingAgendaItems(state)]) {
    if (!Number.isFinite(item.dueAtMinutes) || state.sim.totalMinutes <= item.dueAtMinutes) continue;
    changed += markAgendaMiss(state, item, "natural_miss") ? 1 : 0;
  }
  return changed;
}

export function evaluateAgendaEvents(state) {
  ensureAgendaState(state);
  let fired = 0;
  fired += scheduleMidmorningStandup(state) ? 1 : 0;
  fired += schedulePrioritySync(state) ? 1 : 0;
  fired += scheduleMissionReview(state) ? 1 : 0;
  fired += markMissedAgendaItems(state);
  fired += maybeCloseFocusWindow(state) ? 1 : 0;
  return fired;
}

export function buildAgendaSummary(state) {
  const agenda = ensureAgendaState(state);
  const pendingItems = getPendingAgendaItems(state);
  const conflictMap = buildConflictMap(pendingItems);
  const decoratedPendingItems = pendingItems.map((item) => {
    const conflictIds = Array.from(conflictMap.get(item.id) || []);
    return {
      ...item,
      conflictIds,
      hasConflict: conflictIds.length > 0
    };
  });
  const nextMeeting = decoratedPendingItems[0] || null;
  const nextConflict = decoratedPendingItems.find((item) => item.hasConflict) || null;
  const immediateDecisionItems = decoratedPendingItems.filter((item) => item.hasConflict || (item.dueAtMinutes - state.sim.totalMinutes) <= 20);
  const pressure = buildAgendaPressure(state);
  return {
    items: agenda.items,
    pendingCount: agenda.pendingIds.length,
    completedCount: agenda.completedIds.length,
    missedCount: agenda.missedIds.length,
    nextMeeting,
    nextConflict,
    immediateDecisionItems,
    focusWindow: agenda.focusWindow,
    pendingItems: decoratedPendingItems,
    saturationScore: pressure.score,
    saturationLabel: pressure.label,
    saturationTone: pressure.tone,
    saturationNote: pressure.note,
    conflictCount: pressure.conflictCount
  };
}

export function startFocusWindow(store, durationMinutes = 45) {
  let started = null;
  store.setState((state) => {
    const agenda = ensureAgendaState(state);
    const pressure = buildAgendaPressure(state);
    const pendingItems = getPendingAgendaItems(state);
    const nextMeeting = pendingItems[0] || null;
    if (agenda.focusWindow?.active || !state.missions.activeId) return;

    let safeDuration = durationMinutes;
    if (nextMeeting) {
      const minutesUntilMeeting = getAgendaStartMinutes(nextMeeting) - state.sim.totalMinutes - 5;
      if (minutesUntilMeeting < 20) return;
      safeDuration = Math.min(safeDuration, minutesUntilMeeting);
    }

    if (pressure.label === "Critica") {
      return;
    }
    if (pressure.label === "Alta") {
      safeDuration = Math.min(safeDuration, 30);
    }

    agenda.focusWindow = {
      active: true,
      startedAtMinutes: state.sim.totalMinutes,
      endsAtMinutes: state.sim.totalMinutes + safeDuration,
      durationMinutes: safeDuration,
      missionId: state.missions.activeId,
      interruptedAtMinutes: null,
      interruptedByAgendaId: null,
      interruptionReason: null
    };
    pushActivity(state, `Se abrio una ventana de foco de ${safeDuration} minutos para avanzar sin ruido innecesario.`, "success");
    pushNotification(state, "Ventana de foco", "Se habilito un bloque protegido para analisis y entrega.", "success");
    started = {
      endsAtMinutes: agenda.focusWindow.endsAtMinutes,
      missionId: state.missions.activeId,
      durationMinutes: safeDuration
    };
  }, { silent: true });
  return started;
}

export function getActionCostMultiplier(state, actionType) {
  const agenda = ensureAgendaState(state);
  const pressure = buildAgendaPressure(state);

  if (agenda.focusWindow?.active) {
    const focusMultiplier = pressure.label === "Alta" ? 0.82 : 0.7;
    if (["run_query", "submit_report", "review_files"].includes(actionType)) {
      return focusMultiplier;
    }
    if (actionType === "review_mail") {
      return 1.15;
    }
    return 1;
  }

  if (["run_query", "submit_report", "review_files"].includes(actionType)) {
    if (pressure.label === "Critica") return 1.35;
    if (pressure.label === "Alta") return 1.15;
  }

  return 1;
}

export function attendAgendaItem(store, agendaId) {
  let result = null;
  store.setState((state) => {
    const agenda = ensureAgendaState(state);
    const item = findAgendaItem(state, agendaId);
    if (!item || item.status !== "pending") return;

    const conflictIds = [...(item.conflictIds || [])];
    item.status = "completed";
    item.attendedAtMinutes = state.sim.totalMinutes;
    agenda.pendingIds = agenda.pendingIds.filter((id) => id !== agendaId);
    if (!agenda.completedIds.includes(agendaId)) {
      agenda.completedIds.unshift(agendaId);
    }

    if (agenda.focusWindow?.active) {
      agenda.focusWindow.active = false;
      agenda.focusWindow.closedAtMinutes = state.sim.totalMinutes;
      agenda.focusWindow.closedReason = "meeting_attended";
    }

    const stakeholder = getStakeholder(item.requesterId);
    const thread = state.mail.threads.find((entry) => entry.id === item.threadId);
    if (thread) {
      thread.unread = false;
      thread.labels = Array.from(new Set([...(thread.labels || []), "attended_meeting"]));
      if (conflictIds.length) {
        thread.labels = Array.from(new Set([...(thread.labels || []), "conflict_handled"]));
      }
      thread.messages.push({
        id: createId("message"),
        from: state.player.name,
        role: state.player.role,
        body: item.agendaType === "priority_sync"
          ? `Asisti al espacio y deje explicitado que sostengo ${getMissionOrPrimary(state.missions.activeId)?.title || "el foco actual"} mientras preparo el siguiente bloque para ${getMissionOrPrimary(item.targetMissionId)?.title || "la cola"}.`
          : `Asisti al espacio programado y deje un corte breve con foco, riesgo y siguiente paso para ${getMissionOrPrimary(item.missionId)?.title || "la carga activa"}.`
      });
      thread.messages.push({
        id: createId("message"),
        from: stakeholder?.name || item.requesterId,
        role: stakeholder?.role || "Stakeholder",
        body: item.agendaType === "priority_sync"
          ? "Recibido. Con esta definicion ya tengo claro que queda en foco y que puede esperar el siguiente hueco."
          : "Recibido. Con este corte me alcanza para sostener visibilidad. Sigue con el bloque actual y volvemos a mirar el tema en el proximo control."
      });
      thread.preview = item.agendaType === "priority_sync"
        ? "La alineacion de foco quedo atendida y documentada."
        : "La reunion quedo atendida y registrada.";
    }

    refreshAgendaConflictMetadata(state);
    applyMeetingRelationshipDelta(state, item.requesterId, conflictIds.length ? 3 : 2, 1, "meeting_attended");
    pushActivity(state, `${conflictIds.length ? "Resolviste un choque y asististe a" : "Asististe a"}: ${item.title}.`, "success");
    result = {
      itemId: agendaId,
      id: item.id,
      threadId: item.threadId,
      durationMinutes: item.durationMinutes || getAgendaDuration(item),
      agendaType: item.agendaType,
      missionId: item.missionId,
      requesterId: item.requesterId,
      targetMissionId: item.targetMissionId,
      title: item.title,
      conflictIds
    };
  }, { silent: true });
  return result;
}

export function reprogramAgendaItem(store, agendaId) {
  let result = null;
  store.setState((state) => {
    const item = findAgendaItem(state, agendaId);
    if (!item || item.status !== "pending") return;
    if ((item.rescheduleCount || 0) >= (item.maxReschedules ?? 1)) return;

    const buffer = AGENDA_REPROGRAM_BUFFER_BY_TYPE[item.agendaType] || 20;
    const newStart = Math.max(
      getAgendaStartMinutes(item) + buffer,
      state.sim.totalMinutes + 12
    );
    const slack = item.agendaType === "mission_review" ? 24 : 20;
    item.scheduledForMinutes = newStart;
    item.dueAtMinutes = newStart + slack;
    item.rescheduleCount = (item.rescheduleCount || 0) + 1;
    item.lastRescheduledAtMinutes = state.sim.totalMinutes;

    const thread = state.mail.threads.find((entry) => entry.id === item.threadId);
    const stakeholder = getStakeholder(item.requesterId);
    if (thread) {
      thread.unread = true;
      thread.labels = Array.from(new Set([...(thread.labels || []), "reprogrammed_meeting"]));
      thread.preview = "La reunion se movio al siguiente hueco y sigue pendiente.";
      thread.messages.push({
        id: createId("message"),
        from: state.player.name,
        role: state.player.role,
        body: "No llego bien a este slot sin romper el bloque actual. Propongo moverlo al siguiente hueco y sostengo la visibilidad por el canal escrito."
      });
      thread.messages.push({
        id: createId("message"),
        from: stakeholder?.name || item.requesterId,
        role: stakeholder?.role || "Stakeholder",
        body: "Te lo muevo una vez, pero necesito ese corte en el siguiente hueco y sin perder trazabilidad."
      });
    }

    refreshAgendaConflictMetadata(state);
    applyMeetingRelationshipDelta(state, item.requesterId, -1, 0, "meeting_reprogrammed");
    pushActivity(state, `Reprogramaste: ${item.title}.`, "info");
    pushNotification(state, "Reunion reprogramada", "Moviste el espacio al siguiente bloque para bajar choque inmediato de agenda.", "info");
    result = {
      itemId: item.id,
      threadId: item.threadId,
      scheduledForMinutes: item.scheduledForMinutes,
      dueAtMinutes: item.dueAtMinutes,
      rescheduleCount: item.rescheduleCount
    };
  }, { silent: true });
  return result;
}

export function deprioritizeAgendaItem(store, agendaId) {
  let result = null;
  store.setState((state) => {
    const item = findAgendaItem(state, agendaId);
    if (!item || item.status !== "pending") return;
    if (!markAgendaMiss(state, item, "deprioritized")) return;
    result = {
      itemId: item.id,
      threadId: item.threadId,
      missionId: item.missionId,
      requesterId: item.requesterId
    };
  }, { silent: true });
  return result;
}
