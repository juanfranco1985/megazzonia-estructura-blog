import { MISSION_STATUS } from '../../domain/missions/missionTypes.js';
import { createDeadlineFromMission } from '../clockEngine.js';
import { createMissionRuntimeState } from '../../domain/missions/missionModels.js';
import { getMissionDefinitionById, listMissionDefinitions, missionPrerequisitesSatisfied } from './missionRegistry.js';

export function createMissionStates(catalog) {
  return Object.fromEntries(catalog.map((mission) => [mission.id, createMissionRuntimeState(mission)]));
}

export function isMissionUnlocked(missionState) {
  return Boolean(missionState?.isUnlocked);
}

export function isMissionVisible(missionState) {
  return Boolean(missionState?.isVisible);
}

export function unlockMission(missionState, reason = 'progression_unlock') {
  if (missionState?.isUnlocked) {
    return missionState;
  }

  return {
    ...missionState,
    isUnlocked: true,
    isVisible: true,
    unlockedAt: new Date().toISOString(),
    unlockReason: reason,
    status: missionState?.status || MISSION_STATUS.LOCKED
  };
}

export function getUnlockableMissionIds(completedIds = [], states = {}) {
  return listMissionDefinitions()
    .filter((definition) => {
      const missionState = states[definition.id] || null;
      return !missionState?.isUnlocked && missionPrerequisitesSatisfied(definition, completedIds);
    })
    .map((definition) => definition.id);
}

export function syncMissionAvailability(states = {}, completedIds = []) {
  const nextStates = { ...states };
  for (const missionId of getUnlockableMissionIds(completedIds, states)) {
    nextStates[missionId] = unlockMission(nextStates[missionId] || createMissionRuntimeState(getMissionDefinitionById(missionId)));
  }
  return nextStates;
}

export function markMissionAccepted(missionState, mission = null, currentTimeMinutes = null) {
  return {
    ...missionState,
    status: MISSION_STATUS.ACTIVE,
    acceptedAt: new Date().toISOString(),
    acceptedAtMinutes: currentTimeMinutes ?? missionState?.acceptedAtMinutes ?? null,
    deadlineAtMinutes: mission ? createDeadlineFromMission(mission, currentTimeMinutes) : missionState?.deadlineAtMinutes || null,
    overdueSinceMinutes: null,
    isOverdue: false
  };
}

export function markMissionCompleted(missionState, validation = null, currentTimeMinutes = null) {
  return {
    ...missionState,
    status: MISSION_STATUS.COMPLETED,
    completedAt: new Date().toISOString(),
    completedAtMinutes: currentTimeMinutes ?? missionState?.completedAtMinutes ?? null,
    lastValidation: validation,
    outcome: validation?.success ? 'completed' : missionState?.outcome || null,
    isUnlocked: true,
    isVisible: true,
    needsRevision: false,
    resolvedAfterRevision: Number(missionState?.revisionRequests || 0) > 0
  };
}

export function markMissionRevisionRequired(missionState, validation = null, currentTimeMinutes = null) {
  const currentRound = Number(missionState?.currentRevisionRound || 0) + 1;
  const historyEntry = validation ? {
    round: currentRound,
    requestedAt: new Date().toISOString(),
    requestedAtMinutes: currentTimeMinutes ?? null,
    totalScore: validation.totalScore || 0,
    issues: [...(validation.issues || [])],
    message: validation.message || ''
  } : null;

  return {
    ...missionState,
    status: MISSION_STATUS.REVISION_REQUIRED,
    lastValidation: validation,
    outcome: 'revision_required',
    needsRevision: true,
    revisionRequests: Number(missionState?.revisionRequests || 0) + 1,
    currentRevisionRound: currentRound,
    revisionHistory: historyEntry ? [historyEntry, ...(missionState?.revisionHistory || [])].slice(0, 8) : (missionState?.revisionHistory || [])
  };
}

export function registerMissionAttempt(missionState, patch = {}) {
  const completedDeliverables = {
    ...(missionState?.completedDeliverables || {}),
    ...(patch.completedDeliverables || {})
  };

  return {
    ...missionState,
    ...patch,
    completedDeliverables,
    attempts: Number(missionState?.attempts || 0) + 1,
    resubmissionCount: Number(missionState?.resubmissionCount || 0) + (missionState?.needsRevision ? 1 : 0)
  };
}


export function markMissionQueued(missionState, currentTimeMinutes = null) {
  return {
    ...missionState,
    status: MISSION_STATUS.QUEUED,
    pausedAt: new Date().toISOString(),
    pausedAtMinutes: currentTimeMinutes ?? missionState?.pausedAtMinutes ?? null
  };
}

export function markMissionFocused(missionState) {
  return {
    ...missionState,
    status: missionState?.needsRevision ? MISSION_STATUS.REVISION_REQUIRED : MISSION_STATUS.ACTIVE
  };
}

export function getAcceptedMissionIds(states = {}) {
  return Object.entries(states)
    .filter(([, missionState]) => [MISSION_STATUS.ACTIVE, MISSION_STATUS.QUEUED, MISSION_STATUS.REVISION_REQUIRED].includes(missionState?.status))
    .map(([missionId]) => missionId);
}
