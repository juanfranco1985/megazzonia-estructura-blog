import { createId } from "../app/utils.js";
import { getStakeholder } from "../data/stakeholders.js";
import { getMissionOrPrimary } from "../data/missions.js";
import { createMiniDeliverableFromFollowup } from "./miniDeliverableSystem.js";
import { applyDecisionAreaImpact } from "./careerImpactSystem.js";

export function ensureFollowupTaskState(state) {
  state.followupTasks ||= { items: [], pendingIds: [], completedIds: [] };
  state.followupTasks.items ||= [];
  state.followupTasks.pendingIds ||= [];
  state.followupTasks.completedIds ||= [];
  return state.followupTasks;
}

function getFollowupTask(state, taskId) {
  return ensureFollowupTaskState(state).items.find((item) => item.id === taskId) || null;
}

function hasTaskForAgenda(state, agendaId) {
  return ensureFollowupTaskState(state).items.some((item) => item.sourceAgendaId === agendaId);
}

function pushActivity(state, label, tone = "info") {
  state.activity.unshift({ id: createId("activity"), label, tone, time: state.sim.timeLabel });
}

function pushNotification(state, title, message, level = "info") {
  state.notifications.items.unshift({
    id: createId("notif_followup"),
    title,
    message,
    level,
    createdAt: new Date().toISOString(),
    expiresAt: Date.now() + 7000,
    unread: true
  });
}

function appendTaskThread(state, task, stakeholder, body) {
  const threadId = `thread_${task.id}`;
  if (state.mail.threads.some((thread) => thread.id === threadId)) return threadId;
  state.mail.threads.unshift({
    id: threadId,
    missionId: task.missionId,
    followupTaskId: task.id,
    threadType: "followup_task",
    senderId: stakeholder?.id || task.requesterId,
    senderName: stakeholder?.name || task.requesterId,
    senderRole: stakeholder?.role || "Stakeholder",
    subject: task.subject,
    preview: task.preview,
    priority: task.priority || "normal",
    timestamp: state.sim.timeLabel,
    unread: true,
    labels: ["followup_task", task.taskType],
    attachments: [],
    messages: [{
      id: createId("message"),
      from: stakeholder?.name || task.requesterId,
      role: stakeholder?.role || "Stakeholder",
      body
    }]
  });
  state.mail.selectedThreadId = threadId;
  return threadId;
}

function createTaskDefinition(state, agendaItem) {
  const mission = agendaItem?.missionId ? getMissionOrPrimary(agendaItem.missionId) : null;
  const queuedIds = Object.entries(state.missions.states || {})
    .filter(([, missionState]) => missionState?.status === "queued")
    .map(([missionId]) => missionId);
  const queuedTargetId = agendaItem?.targetMissionId || queuedIds[0] || null;

  if (agendaItem?.agendaType === "mission_review" && mission) {
    return {
      id: createId("followup_task"),
      missionId: mission.id,
      requesterId: agendaItem.requesterId,
      taskType: "executive_cut",
      status: "pending",
      sourceAgendaId: agendaItem.id,
      title: `Recorte ejecutivo para ${mission.title}`,
      subject: `Follow-up: recortar ${mission.title} para comite`,
      preview: "La reunion cerro con un pedido de sintesis ejecutiva antes del proximo corte.",
      priority: "high",
      recommendation: "Recortar el reporte para comite y dejar una recomendacion breve y accionable."
    };
  }

  if ((agendaItem?.agendaType === "standup" || agendaItem?.agendaType === "priority_sync") && queuedTargetId) {
    const targetMissionId = queuedTargetId;
    const targetMission = getMissionOrPrimary(targetMissionId);
    return {
      id: createId("followup_task"),
      missionId: targetMissionId,
      requesterId: agendaItem.requesterId,
      taskType: "queued_alignment",
      status: "pending",
      sourceAgendaId: agendaItem.id,
      title: `Alinear proximo foco: ${targetMission?.title || targetMissionId}`,
      subject: `Follow-up: define siguiente foco para ${targetMission?.title || "la cola"}`,
      preview: agendaItem?.agendaType === "priority_sync"
        ? "La alineacion de prioridad dejo una tarea hija para dejar explicito que pedido tomara el siguiente bloque."
        : "El standup dejo una tarea hija para dejar explicito que pedido tomara el siguiente bloque.",
      priority: agendaItem?.agendaType === "priority_sync" ? "high" : "normal",
      recommendation: `Preparar el siguiente bloque para ${targetMission?.title || targetMissionId} sin perder trazabilidad del foco actual.`
    };
  }

  return null;
}

export function createFollowupTaskFromAgenda(store, agendaItem) {
  let result = null;
  store.setState((state) => {
    const agendaRefId = agendaItem?.id || agendaItem?.itemId;
    if (!agendaRefId || hasTaskForAgenda(state, agendaRefId)) return;
    const task = createTaskDefinition(state, { ...agendaItem, id: agendaRefId });
    if (!task) return;
    const bucket = ensureFollowupTaskState(state);
    const stakeholder = getStakeholder(task.requesterId);
    const threadId = appendTaskThread(
      state,
      task,
      stakeholder,
      task.taskType === "executive_cut"
        ? "La reunion dejo un follow-up concreto: prepara una version recortada para comite, con hallazgo principal, riesgo y recomendacion."
        : agendaItem?.agendaType === "priority_sync"
          ? "La alineacion de prioridad dejo un follow-up operativo: deja listo el siguiente foco y explicita que pedido puede esperar."
          : "El standup dejo un follow-up operativo: deja listo el siguiente foco para que la transicion no te haga perder contexto."
    );
    task.threadId = threadId;
    bucket.items.unshift(task);
    bucket.pendingIds.unshift(task.id);
    pushActivity(state, `Se abrio una tarea derivada: ${task.title}.`, task.priority === "high" ? "warning" : "info");
    pushNotification(state, "Follow-up derivado", task.title, task.priority === "high" ? "warning" : "info");
    result = { taskId: task.id, threadId, taskType: task.taskType };
  }, { silent: true });
  return result;
}

export function resolveFollowupTask(store, taskId) {
  let result = null;
  store.setState((state) => {
    const task = getFollowupTask(state, taskId);
    if (!task || task.status === "completed") return;
    task.status = "completed";
    task.completedAt = new Date().toISOString();
    ensureFollowupTaskState(state).pendingIds = ensureFollowupTaskState(state).pendingIds.filter((id) => id !== task.id);
    if (!ensureFollowupTaskState(state).completedIds.includes(task.id)) {
      ensureFollowupTaskState(state).completedIds.unshift(task.id);
    }

    const missionState = task.missionId ? state.missions.states?.[task.missionId] : null;
    const mission = task.missionId ? getMissionOrPrimary(task.missionId) : null;
    const thread = state.mail.threads.find((entry) => entry.id === task.threadId);
    const stakeholder = getStakeholder(task.requesterId);

    if (task.taskType === "executive_cut" && missionState) {
      missionState.scopeMode = "executive_cut";
      missionState.scopeNotes = "Recorte ejecutivo solicitado tras reunion de revision.";
      state.ui.report.notes = [state.ui.report.notes, "Recorte para comite: priorizar hallazgo principal, riesgo y recomendacion."].filter(Boolean).join("\n");
      if (!state.ui.report.conclusion.trim() && mission) {
        state.ui.report.conclusion = `Resumen ejecutivo para comite: ${mission.title} requiere un cierre corto, accionable y con foco en decision.`;
      }
    }

    if (task.taskType === "queued_alignment" && task.missionId) {
      const queuedState = state.missions.states?.[task.missionId];
      if (queuedState) {
        queuedState.nextFocusReady = true;
      }
    }

    if (thread) {
      thread.unread = false;
      thread.labels = Array.from(new Set([...(thread.labels || []), "task_resolved"]));
      thread.preview = "La tarea derivada quedo resuelta y registrada.";
      thread.messages.push({
        id: createId("message"),
        from: state.player.name,
        role: state.player.role,
        body: task.taskType === "executive_cut"
          ? "Tome el follow-up de reunion y deje el alcance recortado para comite. La proxima entrega va con sintesis ejecutiva."
          : "Tome el follow-up del bloque de coordinacion y deje explicito el siguiente foco operativo para el proximo bloque."
      });
      thread.messages.push({
        id: createId("message"),
        from: stakeholder?.name || task.requesterId,
        role: stakeholder?.role || "Stakeholder",
        body: task.taskType === "executive_cut"
          ? "Perfecto. Con este recorte ya tengo una salida mas usable para comite."
          : "Bien. Ahora la transicion entre bloques queda mucho mas clara."
      });
    }

    applyDecisionAreaImpact(state, task.taskType, task.requesterId);
    pushActivity(state, `Tarea derivada resuelta: ${task.title}.`, "success");
    result = { taskId: task.id, threadId: task.threadId, taskType: task.taskType, missionId: task.missionId, requesterId: task.requesterId };
  }, { silent: true });
  if (result) {
    createMiniDeliverableFromFollowup(store, result);
  }
  return result;
}

export function buildFollowupTaskSummary(state) {
  const bucket = ensureFollowupTaskState(state);
  const pendingItems = bucket.items.filter((item) => item.status === "pending");
  return {
    items: bucket.items,
    pendingItems,
    pendingCount: bucket.pendingIds.length,
    completedCount: bucket.completedIds.length,
    nextTask: pendingItems[0] || null
  };
}
