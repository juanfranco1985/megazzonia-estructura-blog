import { APP_NAME } from "../app/constants.js";
import { getMissionOrPrimary, getPrimaryMissionId } from "../data/missions.js";
import { formatDeadlineCountdown } from "./clockEngine.js";
import { buildCheckinSummary } from "./checkinSystem.js";
import { buildAgendaSummary } from "./agendaSystem.js";
import { buildFollowupTaskSummary } from "./followupTaskSystem.js";
import { buildMiniDeliverableSummary } from "./miniDeliverableSystem.js";
import { buildBusinessReviewSummary } from "./businessReviewSystem.js";

function formatGreeting(timeLabel) {
  const hour = Number.parseInt(String(timeLabel || "08:00").split(":")[0], 10);
  if (Number.isFinite(hour) && hour < 12) {
    return "Buenos dias";
  }
  if (Number.isFinite(hour) && hour < 19) {
    return "Buenas tardes";
  }
  return "Buenas noches";
}

function buildPendingTasks(state, currentMission, missionResolved) {
  const tasks = [];

  if (!state.missions.activeId && !missionResolved) {
    tasks.push({
      label: "Abrir Correo y aceptar la solicitud comercial.",
      state: "Accion requerida",
      tone: "warning"
    });
  }

  if (state.missions.activeId && !state.analysis.databaseReady) {
    tasks.push({
      label: "Entrar a Archivos y revisar el export asignado.",
      state: "Pendiente",
      tone: "warning"
    });
  }

  if (state.analysis.databaseReady && state.missions.activeId && !state.terminal.lastResult) {
    tasks.push({
      label: "Ejecutar la consulta SQL inicial sobre la semana pedida.",
      state: "Pendiente",
      tone: "info"
    });
  }

  if (state.terminal.lastResult && state.missions.activeId && !state.report.lastValidation) {
    tasks.push({
      label: "Preparar la entrega ejecutiva y enviar el reporte.",
      state: "Listo para entregar",
      tone: "success"
    });
  }

  if (!tasks.length) {
    tasks.push({
      label: missionResolved
        ? "La primera solicitud quedo resuelta. Revisa el feedback interno o prepara la proxima mision."
        : currentMission
          ? "La bandeja esta bajo control. Revisa feedback o prepara el siguiente corte."
          : "No hay acciones urgentes abiertas.",
      state: "En seguimiento",
      tone: "success"
    });
  }

  return tasks;
}

function rankThread(thread, activeMissionId) {
  const priorityScore = { high: 3, normal: 2, low: 1 };
  let score = priorityScore[thread.priority] || 0;

  if (thread.unread) {
    score += 3;
  }
  if (thread.missionId) {
    score += 2;
  }
  if (thread.missionId && thread.missionId === activeMissionId) {
    score += 2;
  }
  if (thread.missionId && !thread.accepted) {
    score += 1;
  }

  return score;
}

function getPriorityThread(threads, activeMissionId) {
  return [...threads]
    .sort((left, right) => rankThread(right, activeMissionId) - rankThread(left, activeMissionId))
    [0] || null;
}

export function buildDesktopModel(state) {
  const primaryMissionId = getPrimaryMissionId();
  const primaryMissionState = primaryMissionId ? state.missions.states[primaryMissionId] : null;
  const missionResolved = Boolean(primaryMissionState?.status === "completed");
  const activeMissionId = state.missions.activeId || state.analysis.loadedMissionId || primaryMissionId;
  const currentMission = getMissionOrPrimary(activeMissionId);
  const greeting = formatGreeting(state.sim.timeLabel);
  const visibleThreads = state.mail.threads.filter((thread) => !thread.missionId || state.missions.states[thread.missionId]?.isVisible);
  const unreadCount = visibleThreads.filter((thread) => thread.unread).length;
  const pendingTasks = buildPendingTasks(state, currentMission, missionResolved);
  const interruptionCount = state.mail.threads.filter((thread) => thread.threadType === "followup" && thread.unread).length;
  const managerThread = visibleThreads.find((thread) => thread.senderId === "mariana_soto") || null;
  const priorityThread = getPriorityThread(visibleThreads, state.missions.activeId);
  const datasetStatus = state.analysis.databaseReady
    ? "Dataset listo para analisis"
    : state.missions.activeId
      ? "Dataset asignado, pendiente de revision"
      : missionResolved
        ? "Sin cargas pendientes"
        : "Sin dataset desbloqueado";
  const missionStatusLabel = state.missions.activeId ? "Mision activa" : missionResolved ? "Mision resuelta" : "Solicitud en bandeja";
  const activeMissionState = activeMissionId ? state.missions.states[activeMissionId] : null;
  const queuedMissionIds = Object.entries(state.missions.states || {})
    .filter(([, missionState]) => missionState?.status === "queued")
    .map(([missionId]) => missionId);
  const checkins = buildCheckinSummary(state);
  const agenda = buildAgendaSummary(state);
  const followupTasks = buildFollowupTaskSummary(state);
  const miniDeliverables = buildMiniDeliverableSummary(state);
  const businessReviews = buildBusinessReviewSummary(state);
  const queueLoadLabel = queuedMissionIds.length
    ? `Tienes ${queuedMissionIds.length} pedido${queuedMissionIds.length > 1 ? "s" : ""} en espera mientras sostienes la prioridad actual.`
    : "Sin pedidos en cola fuera del foco actual.";
  const workloadState = agenda.conflictCount
    ? `${agenda.saturationNote} ${queueLoadLabel}`
    : queuedMissionIds.length
      ? queueLoadLabel
      : agenda.saturationNote;
  const momentumPercent = Math.max(18, 100 - Math.max(pendingTasks.length - 1, 0) * 22 - (agenda.saturationScore * 3));
  const queuedMissionTitles = queuedMissionIds.map((missionId) => getMissionOrPrimary(missionId)?.title || missionId);
  const deadlineCountdown = activeMissionState?.deadlineAtMinutes ? formatDeadlineCountdown(activeMissionState.deadlineAtMinutes, state.sim.totalMinutes) : "Sin deadline activo";
  const workstationState = state.missions.activeId
    ? activeMissionState?.isOverdue
      ? "La mision excedio su horario comprometido. Entrega igual, pero ya hay presion interna y penalizacion potencial."
      : state.analysis.databaseReady
        ? `La workstation ya tiene el dataset cargado. ${deadlineCountdown}. ${workloadState}`
        : `La mision esta asignada. Falta abrir Archivos y validar el export. ${deadlineCountdown}. ${workloadState}`
    : missionResolved
      ? "La primera entrega quedo cerrada. La workstation conserva el contexto para revision y portfolio."
      : "Hay una solicitud comercial esperando en Correo. Tu primer movimiento es abrir la bandeja y tomarla.";

  return {
    appName: APP_NAME,
    greeting,
    unreadCount,
    currentMission,
    activeMissionLabel: state.missions.activeId
      ? currentMission?.title || "Mision en curso"
      : missionResolved
        ? "Primera entrega completada"
        : currentMission?.title || "Sin mision asignada",
    missionStatusLabel,
    pendingTasks,
    recentActivity: state.activity.slice(0, 12),
    prestige: state.player.prestige,
    technicalScore: state.player.technicalScore,
    statusLine: `${state.sim.dayLabel} · ${state.sim.timeLabel} · ${state.sim.shiftLabel}`,
    workdayLabel: state.sim.workdayLabel,
    datasetStatus,
    managerThread,
    priorityThread,
    workstationState,
    momentumPercent,
    deadlineLabel: state.missions.activeId
      ? `${currentMission?.deadlineLabel || "Sin deadline cargado"} · ${deadlineCountdown}`
      : missionResolved
        ? "Sin deadlines pendientes"
        : currentMission?.deadlineLabel || "Sin deadline cargado",
    deadlineCountdown,
    nextActionLabel: pendingTasks[0]?.label || "No hay pendientes inmediatos.",
    inboxHighlights: visibleThreads.slice(0, 3),
    interruptionCount,
    queuedMissionCount: queuedMissionIds.length,
    queuedMissionTitles,
    pendingCheckinCount: checkins.pendingCount,
    missedCheckinCount: checkins.missedCount,
    lastCompletedCheckin: checkins.lastCompleted,
    pendingMeetingCount: agenda.pendingCount,
    missedMeetingCount: agenda.missedCount,
    nextMeeting: agenda.nextMeeting,
    nextConflict: agenda.nextConflict,
    agendaConflictCount: agenda.conflictCount,
    agendaPressureLabel: agenda.saturationLabel,
    agendaPressureTone: agenda.saturationTone,
    immediateAgendaDecisionCount: agenda.immediateDecisionItems.length,
    focusWindow: agenda.focusWindow,
    pendingFollowupTaskCount: followupTasks.pendingCount,
    nextFollowupTask: followupTasks.nextTask,
    pendingMiniDeliverableCount: miniDeliverables.pendingCount,
    nextMiniDeliverable: miniDeliverables.nextItem,
    pendingBusinessReviewCount: businessReviews.pendingCount,
    nextBusinessReview: businessReviews.nextItem,
    workloadState
  };
}
