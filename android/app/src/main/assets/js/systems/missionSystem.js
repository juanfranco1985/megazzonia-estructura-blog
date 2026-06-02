import { createId } from '../app/utils.js';
import { getMissionById, getMissionOrPrimary } from '../data/missions.js';
import { getDefaultAssetId } from './datasetRegistry.js';
import { isMissionUnlocked, markMissionAccepted, markMissionCompleted, markMissionQueued, markMissionFocused } from './missions/missionRuntime.js';
import { advanceSimulationTime } from './clockEngine.js';

export function getMissionState(state, missionId) {
  return state.missions.states[missionId] || null;
}

export function buildMissionModel(state) {
  const activeMission = getMissionOrPrimary(state.missions.activeId);
  const missionState = activeMission ? getMissionState(state, activeMission.id) : null;
  return {
    activeMission,
    missionState,
    completedIds: [...state.missions.completedIds],
    activeId: state.missions.activeId,
    catalog: state.missions.catalog
  };
}

export function acceptMission(store, missionId) {
  const mission = getMissionById(missionId);
  if (!mission) {
    return null;
  }

  let threadId = null;
  let accepted = false;

  store.setState((state) => {
    const missionState = getMissionState(state, missionId) || {};
    if (!isMissionUnlocked(missionState)) {
      return;
    }


if (state.missions.activeId && state.missions.activeId !== missionId) {
  const previousId = state.missions.activeId;
  const previousState = getMissionState(state, previousId) || {};
  state.missions.states[previousId] = markMissionQueued(previousState, state.sim.totalMinutes);
  state.activity.unshift({
    id: createId('activity'),
    label: `Cambio de prioridad: ${mission.title} toma foco y ${previousState.titleSnapshot || previousId} queda en espera.`,
    tone: 'warning',
    time: state.sim.timeLabel
  });
}

const alreadyAccepted = ['active','queued','revision_required'].includes(missionState.status);
state.missions.states[missionId] = alreadyAccepted
  ? markMissionFocused({ ...missionState, isUnlocked: true, isVisible: true })
  : markMissionAccepted(missionState, mission, state.sim.totalMinutes);
state.missions.activeId = missionId;
accepted = true;

    state.files.activeBundleId = missionId;
    state.files.unlockedBundleIds = Array.from(new Set([...state.files.unlockedBundleIds, missionId]));
    state.files.bundleStates[missionId] = {
      ...(state.files.bundleStates[missionId] || {}),
      status: 'unlocked',
      ready: false
    };
    state.ui.selectedFileId = getDefaultAssetId(missionId);
    state.ui.terminalQuery = mission.starterQuery || state.ui.terminalQuery;
    state.terminal.lastQueryText = mission.starterQuery || state.terminal.lastQueryText;
    state.ui.report.selectedMetric = mission.deliverables?.sql?.primaryMetric || state.ui.report.selectedMetric;
    state.ui.report.chartType = mission.deliverables?.chart?.preferredType || state.ui.report.chartType;
    state.ui.report.conclusion = '';
    state.ui.report.notes = '';

    const thread = state.mail.threads.find((item) => item.missionId === missionId);
    if (thread) {
      thread.unread = false;
      thread.accepted = true;
      thread.readAt = new Date().toISOString();
      threadId = thread.id;
      state.mail.selectedThreadId = thread.id;
    }

    state.activity.unshift({
      id: createId('activity'),
      label: `Misión aceptada: ${mission.title}.`,
      tone: 'success',
      time: state.sim.timeLabel
    });
  }, { silent: true });

  if (!accepted) {
    return null;
  }

  advanceSimulationTime(store, 'accept_mission');

  return {
    mission,
    threadId
  };
}

export function completeMission(store, missionId) {
  const mission = getMissionById(missionId);
  if (!mission) {
    return null;
  }

  store.setState((state) => {
    const missionState = getMissionState(state, missionId) || {};
    state.missions.states[missionId] = markMissionCompleted(missionState, null, state.sim.totalMinutes);
    state.missions.completedIds = Array.from(new Set([...state.missions.completedIds, missionId]));
    state.files.bundleStates[missionId] = {
      ...(state.files.bundleStates[missionId] || {}),
      status: 'ready',
      ready: true
    };
    if (state.missions.activeId === missionId) {
      state.missions.activeId = null;
    }
  }, { silent: true });

  return mission;
}

export function createMissionNote(missionId, body) {
  return {
    id: createId('note'),
    missionId,
    body,
    createdAt: new Date().toISOString()
  };
}


export function switchMissionFocus(store, missionId) {
  return acceptMission(store, missionId);
}
