import { createId } from "../app/utils.js";
import { getMissionById } from "../data/missions.js";
import { getStakeholder } from "../data/stakeholders.js";
import { markMissionCompleted, markMissionRevisionRequired, registerMissionAttempt, syncMissionAvailability } from "./missions/missionRuntime.js";
import { applyStakeholderMissionImpact, buildOrganizationalNetworkModel, buildStakeholderRelationshipModel, getTrustBand } from "./stakeholders/stakeholderEngine.js";
import { applyMissionAreaImpact, buildAreaReputationModel, buildCareerProgressModel, syncCareerProgressionState } from "./careerImpactSystem.js";

const SKILL_LABELS = {
  data_cleaning: "Data Cleaning",
  date_normalization: "Date Normalization",
  duplicate_detection: "Duplicate Detection",
  sql_grouping: "SQL Grouping",
  executive_reporting: "Executive Reporting",
  chart_selection: "Chart Selection",
  stakeholder_management: "Stakeholder Management",
  channel_segmentation: "Channel Segmentation",
  category_mix_analysis: "Category Mix Analysis",
  marketing_reporting: "Marketing Reporting"
};

function getTrackedMissionCount(state) {
  const visibleStates = Object.values(state.missions.states).filter((missionState) => missionState?.isVisible);
  return visibleStates.length || 1;
}

function updateSuccessRate(state) {
  const completedCount = state.missions.completedIds.length;
  const totalTracked = getTrackedMissionCount(state);
  state.player.successRate = Math.round((completedCount / totalTracked) * 100);
}

function unlockNewMissions(state, completedMissionId) {
  const previousUnlocked = new Set(
    Object.entries(state.missions.states)
      .filter(([, missionState]) => missionState?.isUnlocked)
      .map(([missionId]) => missionId)
  );

  state.missions.states = syncMissionAvailability(state.missions.states, state.missions.completedIds);

  const newlyUnlocked = Object.entries(state.missions.states)
    .filter(([missionId, missionState]) => missionId !== completedMissionId && missionState?.isUnlocked && !previousUnlocked.has(missionId))
    .map(([missionId]) => missionId);

  for (const missionId of newlyUnlocked) {
    const mission = getMissionById(missionId);
    if (!mission) {
      continue;
    }
    const thread = state.mail.threads.find((item) => item.missionId === missionId && item.threadType === 'mission');
    if (thread) {
      thread.unread = true;
      thread.accepted = false;
      state.mail.selectedThreadId = thread.id;
    }
    state.activity.unshift({
      id: createId("activity"),
      label: `Nueva misión desbloqueada: ${mission.title}.`,
      tone: "info",
      time: state.sim.timeLabel
    });
    state.notifications.items.unshift({
      id: createId('notif_unlock'),
      title: 'Nueva solicitud disponible',
      message: `${mission.stakeholder?.name || 'Un stakeholder'} abrió: ${mission.title}.`,
      level: 'info',
      createdAt: new Date().toISOString(),
      expiresAt: Date.now() + 7000,
      unread: true
    });
  }
}

export function unlockSkill(store, skillId) {
  const label = SKILL_LABELS[skillId] || skillId;
  store.setState((state) => {
    if (!state.player.skills.includes(skillId)) {
      state.player.skills.push(skillId);
      state.player.skillLevels[skillId] = 1;
      state.activity.unshift({
        id: createId("activity"),
        label: `Skill unlocked: ${label}.`,
        tone: "success",
        time: state.sim.timeLabel
      });
    }
  }, { silent: true });
}

export function applyMissionOutcome(store, missionId, validation) {
  const mission = getMissionById(missionId);

  store.setState((state) => {
    const missionStateBeforeOutcome = state.missions.states[missionId] || {};
    const latePenalty = missionStateBeforeOutcome.isOverdue ? 4 : 0;
    const prestigeDelta = (validation.success ? validation.prestigeDelta : validation.prestigeDeltaFailure) - latePenalty;
    const scoreDelta = Math.max(0, (validation.success ? validation.scoreDelta : validation.scoreDeltaFailure) - (missionStateBeforeOutcome.isOverdue ? 2 : 0));

    state.player.prestige = Math.max(0, state.player.prestige + prestigeDelta);
    state.player.technicalScore = Math.max(0, state.player.technicalScore + scoreDelta);

    if (missionStateBeforeOutcome.isOverdue) {
      state.player.deadlineMisses = (state.player.deadlineMisses || 0) + 1;
    } else if (validation.success) {
      state.player.onTimeDeliveries = (state.player.onTimeDeliveries || 0) + 1;
    }

    if (validation.success) {
      state.missions.completedIds = Array.from(new Set([...state.missions.completedIds, missionId]));
      const missionState = registerMissionAttempt(state.missions.states[missionId] || {}, {
        completedDeliverables: validation.completedDeliverables,
        lastValidation: validation,
        outcome: validation.success ? 'approved' : 'revision_required'
      });
      state.missions.states[missionId] = markMissionCompleted(missionState, validation, state.sim.totalMinutes);
      state.files.bundleStates[missionId] = {
        ...(state.files.bundleStates[missionId] || {}),
        status: "ready",
        ready: true
      };
      if (state.missions.activeId === missionId) {
        state.missions.activeId = null;
      }

      const resolvedAfterRevision = Number(missionStateBeforeOutcome.revisionRequests || 0) > 0;
      state.activity.unshift({
        id: createId("activity"),
        label: `Misión resuelta: ${mission?.title || missionId}. Prestigio ${prestigeDelta >= 0 ? '+' : ''}${prestigeDelta}.${missionStateBeforeOutcome.isOverdue ? ' Entrega fuera de horario.' : ''}${resolvedAfterRevision ? ' Aprobada tras revisión.' : ''}`, 
        tone: "success",
        time: state.sim.timeLabel
      });

      const impactedStakeholders = applyStakeholderMissionImpact(state, mission, validation);
      applyMissionAreaImpact(state, mission, validation);
      for (const impacted of impactedStakeholders) {
        const trustBand = getTrustBand(impacted.state.trust);
        const stakeholderLabel = getStakeholder(impacted.stakeholderId)?.name || impacted.stakeholderId;
        state.activity.unshift({
          id: createId("activity"),
          label: `${stakeholderLabel} ahora queda en ${trustBand.label.toLowerCase()} (${impacted.state.trust}/100).`,
          tone: impacted.trustDelta >= 0 ? "success" : "warning",
          time: state.sim.timeLabel
        });
      }

      if (missionStateBeforeOutcome.isOverdue) {
        state.activity.unshift({
          id: createId("activity"),
          label: `Se aplicó penalización por deadline vencido en ${mission?.title || missionId}.`,
          tone: "warning",
          time: state.sim.timeLabel
        });
      }

      unlockNewMissions(state, missionId);
    } else {
      const attemptedMissionState = registerMissionAttempt(state.missions.states[missionId] || {}, {
        completedDeliverables: validation.completedDeliverables,
        lastValidation: validation,
        outcome: 'revision_required'
      });
      state.missions.states[missionId] = markMissionRevisionRequired(attemptedMissionState, validation, state.sim.totalMinutes);
      state.missions.activeId = missionId;
      state.activity.unshift({
        id: createId("activity"),
        label: `La entrega de ${mission?.title || missionId} necesita revisión y queda abierta para reenvío.`,
        tone: "warning",
        time: state.sim.timeLabel
      });

      const impactedStakeholders = applyStakeholderMissionImpact(state, mission, validation);
      applyMissionAreaImpact(state, mission, validation);
      for (const impacted of impactedStakeholders) {
        const trustBand = getTrustBand(impacted.state.trust);
        const stakeholderLabel = getStakeholder(impacted.stakeholderId)?.name || impacted.stakeholderId;
        state.activity.unshift({
          id: createId("activity"),
          label: `${stakeholderLabel} queda en ${trustBand.label.toLowerCase()} tras la revisión (${impacted.state.trust}/100).`,
          tone: "warning",
          time: state.sim.timeLabel
        });
      }
    }

    updateSuccessRate(state);
    syncCareerProgressionState(state, "mission_outcome");
  }, { silent: true });

  if (validation.success) {
    for (const skillId of mission?.skillsTaught || ['data_cleaning', 'date_normalization', 'sql_grouping', 'executive_reporting']) {
      unlockSkill(store, skillId);
    }
  } else {
    unlockSkill(store, "stakeholder_management");
  }
}

export function buildCareerModel(state) {
  const skills = state.player.skills.map((skillId) => ({
    id: skillId,
    label: SKILL_LABELS[skillId] || skillId
  }));
  const totalMissions = getTrackedMissionCount(state);
  const completedMissions = state.missions.completedIds.length;
  const currentMission = state.missions.activeId ? getMissionById(state.missions.activeId) : null;
  const currentMissionState = currentMission ? state.missions.states[currentMission.id] : null;
  const careerProgress = buildCareerProgressModel(state);
  const organization = buildOrganizationalNetworkModel(state);

  return {
    name: state.player.name,
    role: state.player.role,
    prestige: state.player.prestige,
    technicalScore: state.player.technicalScore,
    skills,
    completedMissions,
    totalMissions,
    successRate: state.player.successRate,
    currentMissionLabel: currentMission ? currentMission.title : "Sin misión activa",
    currentMissionStatus: currentMission ? (currentMissionState?.needsRevision ? `Revisión ${currentMissionState.currentRevisionRound || 1} abierta` : "En curso") : completedMissions ? "Sin pendientes inmediatos" : "Pendiente de aceptación",
    week: state.sim.week,
    dayLabel: state.sim.dayLabel,
    stakeholderRelationships: buildStakeholderRelationshipModel(state),
    areaReputation: buildAreaReputationModel(state),
    trajectory: state.player.trajectory,
    seniority: careerProgress.seniority,
    compensation: careerProgress.compensation,
    workload: careerProgress.workload,
    performance: careerProgress.performance,
    performanceReviews: careerProgress.performanceReviews,
    organization,
    deadlineMisses: state.player.deadlineMisses || 0,
    onTimeDeliveries: state.player.onTimeDeliveries || 0
  };
}
