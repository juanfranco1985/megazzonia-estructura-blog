import { createId } from "../app/utils.js";
import { evaluateInterruptionEvents } from "./interruptionSystem.js";
import { evaluateCheckinEvents } from "./checkinSystem.js";
import { evaluateAgendaEvents, getActionCostMultiplier } from "./agendaSystem.js";

const WORKDAY_START_HOUR = 8;
const DEFAULT_ACTION_COSTS = {
  accept_mission: 12,
  review_files: 8,
  run_query: 22,
  submit_report: 35,
  review_mail: 4
};

function pad2(value) {
  return String(value).padStart(2, "0");
}

export function parseTimeLabelToMinutes(timeLabel = "08:40") {
  const [hours, minutes] = String(timeLabel).split(":").map((value) => Number.parseInt(value, 10));
  return ((Number.isFinite(hours) ? hours : 8) * 60) + (Number.isFinite(minutes) ? minutes : 0);
}

export function minutesToTimeLabel(totalMinutes) {
  const normalized = Math.max(0, Number(totalMinutes) || 0);
  const hours = Math.floor(normalized / 60) % 24;
  const minutes = normalized % 60;
  return `${pad2(hours)}:${pad2(minutes)}`;
}

export function buildWorkdayLabel(elapsedMinutes = 0) {
  const dayNumber = 1 + Math.floor((Number(elapsedMinutes) || 0) / (24 * 60));
  return `Day ${dayNumber}`;
}

export function buildShiftLabel(totalMinutes) {
  const hour = Math.floor((Number(totalMinutes) || 0) / 60) % 24;
  if (hour < 12) {
    return "Morning shift";
  }
  if (hour < 18) {
    return "Afternoon shift";
  }
  return "Late shift";
}

export function getActionCost(actionType, state = null) {
  const baseCost = DEFAULT_ACTION_COSTS[actionType] ?? 6;
  const multiplier = state ? getActionCostMultiplier(state, actionType) : 1;
  return Math.max(1, Math.round(baseCost * multiplier));
}

export function createDeadlineFromMission(mission, acceptedTimeMinutes) {
  const deadlineHours = Number(mission?.schedule?.deadlineHours ?? mission?.deadlineHours ?? 0);
  if (!deadlineHours) {
    return null;
  }
  const accepted = Number(acceptedTimeMinutes) || parseTimeLabelToMinutes("08:40");
  return accepted + (deadlineHours * 60);
}

export function formatDeadlineCountdown(deadlineMinutes, currentMinutes) {
  if (!Number.isFinite(deadlineMinutes)) {
    return "Sin deadline operativo";
  }
  const delta = deadlineMinutes - currentMinutes;
  if (delta < 0) {
    const overdue = Math.abs(delta);
    const hours = Math.floor(overdue / 60);
    const minutes = overdue % 60;
    return `Vencida hace ${hours}h ${minutes}m`;
  }
  const hours = Math.floor(delta / 60);
  const minutes = delta % 60;
  return `${hours}h ${minutes}m restantes`;
}

export function syncMissionDeadlineStatus(state, missionId) {
  const missionState = state.missions.states[missionId];
  if (!missionState?.deadlineAtMinutes || missionState.status === "completed") {
    return false;
  }

  const currentMinutes = state.sim.totalMinutes;
  if (currentMinutes > missionState.deadlineAtMinutes && !missionState.isOverdue) {
    missionState.isOverdue = true;
    missionState.overdueSinceMinutes = currentMinutes;
    missionState.status = missionState.status === "active" ? "revision_required" : missionState.status;

    state.activity.unshift({
      id: createId("activity"),
      label: `Deadline excedido: ${missionState.titleSnapshot || missionId}.`,
      tone: "warning",
      time: state.sim.timeLabel
    });

    state.notifications.items.unshift({
      id: createId("notif_deadline"),
      title: "Deadline vencido",
      message: `${missionState.titleSnapshot || missionId} ya excedió su horario comprometido.`,
      level: "warning",
      createdAt: new Date().toISOString(),
      expiresAt: Date.now() + 8000,
      unread: true
    });
    return true;
  }

  return false;
}

export function advanceSimulationTime(store, actionType, minutesOverride = null) {
  const currentState = store.getState ? store.getState() : null;
  const minutesDelta = Number.isFinite(minutesOverride) ? minutesOverride : getActionCost(actionType, currentState);
  if (!minutesDelta) {
    return 0;
  }

  store.setState((state) => {
    const nextTotalMinutes = (Number(state.sim.totalMinutes) || parseTimeLabelToMinutes(state.sim.timeLabel)) + minutesDelta;
    state.sim.totalMinutes = nextTotalMinutes;
    state.sim.timeLabel = minutesToTimeLabel(nextTotalMinutes);
    state.sim.workdayLabel = buildWorkdayLabel(state.sim.elapsedMinutes + minutesDelta);
    state.sim.shiftLabel = buildShiftLabel(nextTotalMinutes);
    state.sim.elapsedMinutes = (Number(state.sim.elapsedMinutes) || 0) + minutesDelta;

    for (const missionId of Object.keys(state.missions.states)) {
      syncMissionDeadlineStatus(state, missionId);
    }
    evaluateInterruptionEvents(state);
    evaluateCheckinEvents(state);
    evaluateAgendaEvents(state);
  }, { silent: true });

  return minutesDelta;
}
