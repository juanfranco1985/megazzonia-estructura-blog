import { clamp, createId } from "../app/utils.js";
import { getStakeholder } from "../data/stakeholders.js";
import { buildStakeholderRelationshipModel } from "./stakeholders/stakeholderEngine.js";

export const AREA_DEFINITIONS = {
  commercial: { label: "Comercial", trackLabel: "Commercial Analyst", tone: "success" },
  marketing: { label: "Marketing", trackLabel: "Marketing Analyst", tone: "info" },
  operations: { label: "Operaciones", trackLabel: "Operations Analyst", tone: "warning" },
  leadership: { label: "Direccion / Comite", trackLabel: "Executive Reporting", tone: "neutral" }
};

function createAreaEntry(areaId) {
  const definition = AREA_DEFINITIONS[areaId] || { label: areaId, trackLabel: areaId, tone: "neutral" };
  return {
    areaId,
    label: definition.label,
    trackLabel: definition.trackLabel,
    tone: definition.tone,
    score: 0,
    signalCount: 0,
    positiveSignals: 0,
    negativeSignals: 0,
    lastImpactLabel: null,
    lastUpdatedAt: null
  };
}

function createSeniorityState() {
  return {
    tier: 1,
    label: "Junior Analyst",
    currentTitle: "Junior Data Analyst",
    promotionReadiness: "Base estable",
    lastUpdatedAt: null
  };
}

function createCompensationState() {
  return {
    salary: 1200,
    currency: "USD sim",
    bandLabel: "Band 1",
    lastUpdatedAt: null
  };
}

function createWorkloadState() {
  return {
    loadScore: 0,
    loadLabel: "Manejable",
    burnoutRisk: 8,
    burnoutLabel: "Bajo",
    note: "Sin saturacion persistente.",
    lastUpdatedAt: null
  };
}

function createPerformanceMeta() {
  return {
    lastReviewedCompletedMissions: 0,
    lastReviewedDeadlineMisses: 0
  };
}

export function createAreaReputationState() {
  return Object.fromEntries(Object.keys(AREA_DEFINITIONS).map((areaId) => [areaId, createAreaEntry(areaId)]));
}

export function ensureCareerProgressState(state) {
  state.player ||= {};
  state.player.areaReputation ||= createAreaReputationState();
  state.player.trajectory ||= {
    dominantAreaId: "commercial",
    dominantTrackLabel: AREA_DEFINITIONS.commercial.trackLabel,
    readinessTier: "Base estable",
    totalSignals: 0,
    lastUpdatedAt: null
  };
  state.player.seniority ||= createSeniorityState();
  state.player.compensation ||= createCompensationState();
  state.player.workload ||= createWorkloadState();
  state.player.performanceReviews ||= [];
  state.player.performanceReviewMeta ||= createPerformanceMeta();
  return state.player;
}

export function getAreaEntry(state, areaId) {
  ensureCareerProgressState(state);
  return state.player.areaReputation[areaId] || null;
}

export function applyAreaSignal(state, areaId, delta, label) {
  if (!areaId || !AREA_DEFINITIONS[areaId]) return null;
  ensureCareerProgressState(state);
  const current = state.player.areaReputation[areaId] || createAreaEntry(areaId);
  const next = {
    ...current,
    score: clamp((current.score || 0) + delta, -100, 100),
    signalCount: (current.signalCount || 0) + 1,
    positiveSignals: (current.positiveSignals || 0) + (delta > 0 ? 1 : 0),
    negativeSignals: (current.negativeSignals || 0) + (delta < 0 ? 1 : 0),
    lastImpactLabel: label,
    lastUpdatedAt: new Date().toISOString()
  };
  state.player.areaReputation[areaId] = next;
  recalculateTrajectory(state);
  return next;
}

export function applyStakeholderAreaSignal(state, stakeholderId, delta, label) {
  const stakeholder = getStakeholder(stakeholderId);
  return applyAreaSignal(state, stakeholder?.area, delta, label);
}

export function applyMissionAreaImpact(state, mission, validation) {
  const success = Boolean(validation?.success);
  const score = Number(validation?.totalScore || 0);
  const primaryStakeholder = mission?.stakeholder?.id || mission?.stakeholderId;
  const primaryDelta = success ? (score >= 85 ? 8 : 5) : -5;
  const leadershipDelta = success ? (score >= 90 ? 4 : 2) : -3;

  const impacts = [];
  const primary = applyStakeholderAreaSignal(
    state,
    primaryStakeholder,
    primaryDelta,
    success
      ? `Entrega ${mission?.title || mission?.id} bien recibida por el area.`
      : `El area pidio revision sobre ${mission?.title || mission?.id}.`
  );
  if (primary) impacts.push(primary);

  const leadership = applyAreaSignal(
    state,
    "leadership",
    leadershipDelta,
    success
      ? `La entrega de ${mission?.title || mission?.id} sostuvo visibilidad ejecutiva.`
      : `La entrega de ${mission?.title || mission?.id} genero friccion en el seguimiento ejecutivo.`
  );
  if (leadership) impacts.push(leadership);
  return impacts;
}

export function applyDecisionAreaImpact(state, taskType, requesterId) {
  if (taskType === "executive_cut") {
    applyAreaSignal(state, "leadership", 5, "Se respondio un recorte ejecutivo para comite.");
    applyStakeholderAreaSignal(state, requesterId, 4, "El area recibio un recorte ejecutivo accionable.");
    return;
  }
  if (taskType === "queued_alignment") {
    applyAreaSignal(state, "operations", 4, "La continuidad entre bloques quedo mejor alineada.");
    applyAreaSignal(state, "leadership", 2, "La jefatura recibio una transicion de foco mas ordenada.");
  }
}

export function applyMiniDeliverableAreaImpact(state, deliverableType, requesterId) {
  if (deliverableType === "committee_summary") {
    applyAreaSignal(state, "leadership", 7, "Se preparo un resumen corto usable para comite.");
    applyStakeholderAreaSignal(state, requesterId, 3, "El area recibio un output ejecutivo corto y reusable.");
    return;
  }
  if (deliverableType === "internal_handoff") {
    applyAreaSignal(state, "operations", 6, "El handoff interno dejo mejor preparada la continuidad operativa.");
    applyStakeholderAreaSignal(state, requesterId, 2, "El area recibio un handoff interno claro.");
  }
}

function getAverageTrust(state) {
  const relationships = buildStakeholderRelationshipModel(state);
  if (!relationships.length) return DEFAULT_AVG_TRUST;
  return Math.round(relationships.reduce((acc, relationship) => acc + (relationship.trust || 0), 0) / relationships.length);
}

const DEFAULT_AVG_TRUST = 50;

export function recalculateTrajectory(state) {
  ensureCareerProgressState(state);
  const entries = Object.values(state.player.areaReputation || {});
  const dominant = [...entries].sort((a, b) => (b.score - a.score) || (b.positiveSignals - a.positiveSignals))[0] || createAreaEntry("commercial");
  const totalSignals = entries.reduce((acc, entry) => acc + (entry.signalCount || 0), 0);
  const readinessTier = dominant.score >= 18
    ? "Perfil emergente"
    : dominant.score >= 8
      ? "Base en consolidacion"
      : "Base estable";
  state.player.trajectory = {
    dominantAreaId: dominant.areaId,
    dominantTrackLabel: dominant.trackLabel,
    readinessTier,
    totalSignals,
    lastUpdatedAt: new Date().toISOString()
  };
  return state.player.trajectory;
}

export function buildAreaReputationModel(state) {
  ensureCareerProgressState(state);
  return Object.values(state.player.areaReputation || {})
    .map((entry) => ({ ...entry }))
    .sort((a, b) => (b.score - a.score) || (b.signalCount - a.signalCount));
}

export function computeSenioritySnapshot(state) {
  ensureCareerProgressState(state);
  const completedMissions = state.missions?.completedIds?.length || 0;
  const technicalScore = state.player.technicalScore || 0;
  const successRate = state.player.successRate || 0;
  const totalSignals = state.player.trajectory?.totalSignals || 0;
  const averageTrust = getAverageTrust(state);

  let tier = 1;
  let label = "Junior Analyst";
  let currentTitle = "Junior Data Analyst";
  let promotionReadiness = "Base estable";

  if (completedMissions >= 1 || technicalScore >= 12 || totalSignals >= 3) {
    tier = 2;
    label = "Analyst II";
    currentTitle = "Data Analyst";
    promotionReadiness = "Base en consolidacion";
  }
  if (completedMissions >= 2 && technicalScore >= 24 && successRate >= 60) {
    tier = 3;
    label = "Semi Senior Analyst";
    currentTitle = "Semi Senior Data Analyst";
    promotionReadiness = averageTrust >= 55 ? "Promotion track visible" : "Buen crecimiento, pero aun con ruido relacional";
  }
  if (completedMissions >= 3 && technicalScore >= 34 && averageTrust >= 58 && totalSignals >= 8) {
    tier = 4;
    label = "Senior-ready Analyst";
    currentTitle = "Senior-ready Data Analyst";
    promotionReadiness = "Listo para asumir mas visibilidad y ownership";
  }

  return {
    tier,
    label,
    currentTitle,
    promotionReadiness
  };
}

export function computeCompensationSnapshot(state, seniority = computeSenioritySnapshot(state)) {
  const prestige = state.player.prestige || 0;
  const technicalScore = state.player.technicalScore || 0;
  const salary = Math.round(950 + (seniority.tier * 240) + (prestige * 6) + (technicalScore * 3));
  return {
    salary,
    currency: "USD sim",
    bandLabel: `Band ${seniority.tier}`
  };
}

export function computeWorkloadSnapshot(state) {
  const queuedMissionCount = Object.values(state.missions?.states || {}).filter((missionState) => missionState?.status === "queued").length;
  const pendingMeetings = state.agenda?.pendingIds?.length || 0;
  const missedMeetings = state.agenda?.missedIds?.length || 0;
  const pendingCheckins = state.checkins?.pendingIds?.length || 0;
  const missedCheckins = state.checkins?.missedIds?.length || 0;
  const pendingFollowups = state.followupTasks?.pendingIds?.length || 0;
  const pendingReviews = state.businessReviews?.pendingIds?.length || 0;
  const pendingMiniDeliverables = state.miniDeliverables?.pendingIds?.length || 0;
  const activeMissionState = state.missions?.activeId ? state.missions.states?.[state.missions.activeId] : null;
  const overduePressure = activeMissionState?.isOverdue ? 4 : 0;

  const loadScore = clamp(
    (queuedMissionCount * 8)
    + (pendingMeetings * 7)
    + (missedMeetings * 10)
    + (pendingCheckins * 7)
    + (missedCheckins * 9)
    + (pendingFollowups * 5)
    + (pendingReviews * 6)
    + (pendingMiniDeliverables * 4)
    + overduePressure,
    0,
    100
  );

  const burnoutRisk = clamp(
    loadScore
    + ((state.player.deadlineMisses || 0) * 8)
    - ((state.player.onTimeDeliveries || 0) * 2),
    0,
    100
  );

  let loadLabel = "Manejable";
  if (loadScore >= 55) {
    loadLabel = "Sobrecarga";
  } else if (loadScore >= 30) {
    loadLabel = "Exigente";
  }

  let burnoutLabel = "Bajo";
  if (burnoutRisk >= 60) {
    burnoutLabel = "Alto";
  } else if (burnoutRisk >= 35) {
    burnoutLabel = "Moderado";
  }

  let note = "Sin saturacion persistente.";
  if (loadScore >= 55) {
    note = "La agenda, los check-ins y la cola ya estan erosionando continuidad y margen mental.";
  } else if (loadScore >= 30) {
    note = "La carga es exigente y cualquier atraso extra puede abrir mas friccion interna.";
  }

  return {
    loadScore,
    loadLabel,
    burnoutRisk,
    burnoutLabel,
    note
  };
}

export function computePerformanceSnapshot(state) {
  const successRate = state.player.successRate || 0;
  const technicalComponent = clamp(Math.round((state.player.technicalScore || 0) * 2.1), 0, 100);
  const prestigeComponent = clamp(Math.round((state.player.prestige || 0) * 2.6), 0, 100);
  const onTimeBase = state.player.onTimeDeliveries || 0;
  const deadlineMisses = state.player.deadlineMisses || 0;
  const punctualityComponent = clamp(50 + (onTimeBase * 8) - (deadlineMisses * 10), 0, 100);
  const relationshipComponent = clamp(getAverageTrust(state), 0, 100);

  const ratingScore = Math.round(
    (successRate * 0.28)
    + (technicalComponent * 0.26)
    + (prestigeComponent * 0.16)
    + (punctualityComponent * 0.15)
    + (relationshipComponent * 0.15)
  );

  let ratingLabel = "En riesgo";
  let summary = "La mezcla entre calidad, timing y visibilidad todavia no es consistente.";
  if (ratingScore >= 80) {
    ratingLabel = "Fuerte";
    summary = "La performance combina consistencia analitica, buena lectura politica y ejecucion confiable.";
  } else if (ratingScore >= 65) {
    ratingLabel = "Solido";
    summary = "La performance es buena, aunque todavia hay margen para sostener mejor visibilidad y continuidad.";
  } else if (ratingScore >= 50) {
    ratingLabel = "Mixto";
    summary = "La performance avanza, pero alterna buenos cierres con momentos de friccion operativa.";
  }

  return {
    ratingScore,
    ratingLabel,
    summary
  };
}

function createPerformanceReviewEntry(state, performance, seniority, compensation, workload, reason) {
  return {
    id: createId("review"),
    createdAt: new Date().toISOString(),
    reason,
    title: `Performance review · Semana ${state.sim.week}`,
    ratingScore: performance.ratingScore,
    ratingLabel: performance.ratingLabel,
    summary: performance.summary,
    seniorityLabel: seniority.label,
    salary: compensation.salary,
    burnoutLabel: workload.burnoutLabel,
    workloadLabel: workload.loadLabel
  };
}

export function syncCareerProgressionState(state, reason = "mission_outcome") {
  ensureCareerProgressState(state);
  recalculateTrajectory(state);

  const seniority = computeSenioritySnapshot(state);
  const compensation = computeCompensationSnapshot(state, seniority);
  const workload = computeWorkloadSnapshot(state);
  const performance = computePerformanceSnapshot(state);

  state.player.seniority = {
    ...seniority,
    lastUpdatedAt: new Date().toISOString()
  };
  state.player.compensation = {
    ...compensation,
    lastUpdatedAt: new Date().toISOString()
  };
  state.player.workload = {
    ...workload,
    lastUpdatedAt: new Date().toISOString()
  };

  const completedMissions = state.missions?.completedIds?.length || 0;
  const deadlineMisses = state.player.deadlineMisses || 0;
  const reviewMeta = state.player.performanceReviewMeta || createPerformanceMeta();
  const reviewNeeded = completedMissions > reviewMeta.lastReviewedCompletedMissions
    || deadlineMisses > reviewMeta.lastReviewedDeadlineMisses;

  if (reason === "mission_outcome" && reviewNeeded) {
    state.player.performanceReviews = [
      createPerformanceReviewEntry(state, performance, seniority, compensation, workload, reason),
      ...(state.player.performanceReviews || [])
    ].slice(0, 6);
    state.player.performanceReviewMeta = {
      lastReviewedCompletedMissions: completedMissions,
      lastReviewedDeadlineMisses: deadlineMisses
    };
  }

  return {
    seniority,
    compensation,
    workload,
    performance
  };
}

export function buildCareerProgressModel(state) {
  ensureCareerProgressState(state);
  const seniority = computeSenioritySnapshot(state);
  const compensation = computeCompensationSnapshot(state, seniority);
  const workload = computeWorkloadSnapshot(state);
  const performance = computePerformanceSnapshot(state);

  return {
    seniority: {
      ...state.player.seniority,
      ...seniority
    },
    compensation: {
      ...state.player.compensation,
      ...compensation
    },
    workload: {
      ...state.player.workload,
      ...workload
    },
    performance,
    performanceReviews: state.player.performanceReviews || []
  };
}
