import { createId, clamp } from "../../app/utils.js";
import { stakeholders, getStakeholder } from "../../data/stakeholders.js";

const DEFAULT_TRUST = 50;
const DEFAULT_REPUTATION = 0;

const POSITIVE_OUTCOMES = new Set([
  "approved",
  "validated_clean",
  "status_update_sent",
  "meeting_attended",
  "business_approved",
  "focus_reordered",
  "queue_confirmed"
]);

const NEGATIVE_OUTCOMES = new Set([
  "revision_requested",
  "needs_method_review",
  "status_update_missed",
  "meeting_missed",
  "meeting_reprogrammed",
  "meeting_deprioritized",
  "business_risk_note"
]);

const REPEATED_NEGATIVE_OUTCOMES = new Set([
  "revision_requested",
  "needs_method_review",
  "status_update_missed",
  "meeting_missed",
  "meeting_deprioritized"
]);

function createInteractionCounts() {
  return {
    approved: 0,
    revision_requested: 0,
    validated_clean: 0,
    needs_method_review: 0,
    status_update_sent: 0,
    status_update_missed: 0,
    meeting_attended: 0,
    meeting_missed: 0,
    meeting_reprogrammed: 0,
    meeting_deprioritized: 0,
    business_approved: 0,
    business_risk_note: 0,
    focus_reordered: 0,
    queue_confirmed: 0
  };
}

function createRelationshipState(definition) {
  return {
    stakeholderId: definition.id,
    trust: DEFAULT_TRUST,
    reputation: DEFAULT_REPUTATION,
    completedMissions: 0,
    revisionCount: 0,
    lastInteractionAt: null,
    lastOutcome: null,
    lastDelta: 0,
    notes: [],
    interactionCounts: createInteractionCounts(),
    tensionScore: 0,
    politicalCapital: 0,
    lastPatternLabel: "Sin patron dominante"
  };
}

function ensureInteractionCounts(relationship) {
  relationship.interactionCounts ||= createInteractionCounts();
  for (const key of Object.keys(createInteractionCounts())) {
    relationship.interactionCounts[key] ||= 0;
  }
  relationship.notes ||= [];
  relationship.tensionScore ||= 0;
  relationship.politicalCapital ||= 0;
  relationship.lastPatternLabel ||= "Sin patron dominante";
  return relationship.interactionCounts;
}

function getRepeatedPenalty(outcomeLabel, currentCount, trustDelta) {
  if (trustDelta >= 0 || !REPEATED_NEGATIVE_OUTCOMES.has(outcomeLabel)) {
    return 0;
  }
  return Math.min(2, currentCount || 0);
}

function countSignals(counts) {
  let positive = 0;
  let negative = 0;

  for (const [key, value] of Object.entries(counts || {})) {
    if (!value) continue;
    if (POSITIVE_OUTCOMES.has(key)) {
      positive += value;
    } else if (NEGATIVE_OUTCOMES.has(key)) {
      negative += value;
    }
  }

  return { positive, negative };
}

function buildPatternLabel(counts) {
  const entries = Object.entries(counts || {}).sort((left, right) => right[1] - left[1]);
  const [key, value] = entries[0] || [];
  if (!key || !value) {
    return "Sin patron dominante";
  }

  const labels = {
    approved: "Cierres aprobados",
    revision_requested: "Revisiones repetidas",
    validated_clean: "Metodo consistente",
    needs_method_review: "Friccion metodologica",
    status_update_sent: "Visibilidad sostenida",
    status_update_missed: "Visibilidad intermitente",
    meeting_attended: "Coordinacion sostenida",
    meeting_missed: "Reuniones perdidas",
    meeting_reprogrammed: "Reprogramaciones frecuentes",
    meeting_deprioritized: "Espacios desplazados",
    business_approved: "Alineacion con negocio",
    business_risk_note: "Mas trabajo pedido por negocio",
    focus_reordered: "Foco reordenado con rapidez",
    queue_confirmed: "Cola operativa estabilizada"
  };
  return labels[key] || key;
}

function getPoliticalCapital(trust, reputation, counts) {
  const { positive, negative } = countSignals(counts);
  return clamp(Math.round(((trust - 50) / 2) + (reputation / 4) + positive - negative), -40, 40);
}

function buildAutoNote(stakeholderId, outcomeLabel, repeatPenalty, meta = {}) {
  const stakeholder = getStakeholder(stakeholderId);
  const patternText = repeatPenalty ? " Hubo castigo extra por patron repetido." : "";
  const missionText = meta.missionId ? ` Mision: ${meta.missionId}.` : "";
  return `${stakeholder?.name || stakeholderId} quedo asociado a ${outcomeLabel}.${missionText}${patternText}`.trim();
}

export function createStakeholderRelationshipStates() {
  return Object.fromEntries(stakeholders.map((definition) => [definition.id, createRelationshipState(definition)]));
}

export function getStakeholderRelationship(state, stakeholderId) {
  const relationship = state.stakeholders?.relationships?.[stakeholderId] || null;
  if (relationship) {
    ensureInteractionCounts(relationship);
  }
  return relationship;
}

export function ensureStakeholderRelationship(state, stakeholderId) {
  state.stakeholders ||= { relationships: {} };
  state.stakeholders.relationships ||= {};
  const current = state.stakeholders.relationships[stakeholderId]
    || createRelationshipState(getStakeholder(stakeholderId) || { id: stakeholderId });
  ensureInteractionCounts(current);
  state.stakeholders.relationships[stakeholderId] = current;
  return current;
}

export function getTrustBand(trust = DEFAULT_TRUST) {
  if (trust >= 75) {
    return { key: "high", label: "Alta confianza", tone: "success" };
  }
  if (trust >= 55) {
    return { key: "stable", label: "Confianza estable", tone: "info" };
  }
  if (trust >= 35) {
    return { key: "fragile", label: "Confianza fragil", tone: "warning" };
  }
  return { key: "critical", label: "Confianza critica", tone: "warning" };
}

export function getReputationBand(reputation = DEFAULT_REPUTATION) {
  if (reputation >= 25) {
    return { key: "strong", label: "Buena reputacion", tone: "success" };
  }
  if (reputation >= 10) {
    return { key: "positive", label: "Reputacion positiva", tone: "info" };
  }
  if (reputation > -10) {
    return { key: "neutral", label: "Reputacion neutral", tone: "neutral" };
  }
  return { key: "damaged", label: "Reputacion danada", tone: "warning" };
}

export function getTensionBand(tensionScore = 0) {
  if (tensionScore >= 45) {
    return { key: "hot", label: "Tension alta", tone: "warning" };
  }
  if (tensionScore >= 20) {
    return { key: "warm", label: "Tension latente", tone: "info" };
  }
  return { key: "stable", label: "Sin ruido fuerte", tone: "success" };
}

export function getPoliticalBand(politicalCapital = 0) {
  if (politicalCapital >= 18) {
    return { key: "strong", label: "Cobertura alta", tone: "success" };
  }
  if (politicalCapital >= 6) {
    return { key: "usable", label: "Capital usable", tone: "info" };
  }
  if (politicalCapital <= -10) {
    return { key: "exposed", label: "Capital expuesto", tone: "warning" };
  }
  return { key: "neutral", label: "Capital neutral", tone: "neutral" };
}

export function applyStakeholderInteraction(state, stakeholderId, config = {}) {
  if (!stakeholderId) {
    return null;
  }

  const current = ensureStakeholderRelationship(state, stakeholderId);
  const counts = { ...ensureInteractionCounts(current) };
  const outcomeLabel = config.outcomeLabel || (config.trustDelta >= 0 ? "approved" : "revision_requested");
  const currentCount = counts[outcomeLabel] || 0;
  const repeatedPenalty = getRepeatedPenalty(outcomeLabel, currentCount, config.trustDelta || 0);
  const adjustedTrustDelta = (config.trustDelta || 0) - repeatedPenalty;
  const adjustedReputationDelta = (config.reputationDelta || 0) + ((config.trustDelta || 0) > 0 && currentCount > 0 ? 1 : 0);
  counts[outcomeLabel] = currentCount + 1;

  const nextTrust = clamp((current.trust ?? DEFAULT_TRUST) + adjustedTrustDelta, 0, 100);
  const nextReputation = clamp((current.reputation ?? DEFAULT_REPUTATION) + adjustedReputationDelta, -100, 100);
  const tensionDelta = adjustedTrustDelta < 0
    ? Math.abs(adjustedTrustDelta) + 1
    : -Math.max(1, Math.min(3, adjustedTrustDelta || 1));
  const nextTension = clamp((current.tensionScore || 0) + tensionDelta, 0, 100);
  const patternLabel = buildPatternLabel(counts);
  const noteBody = config.note || buildAutoNote(stakeholderId, outcomeLabel, repeatedPenalty, config);

  const next = {
    ...current,
    trust: nextTrust,
    reputation: nextReputation,
    completedMissions: (current.completedMissions || 0) + (config.completedMission === true ? 1 : 0),
    revisionCount: (current.revisionCount || 0) + (config.revisionRequested === true ? 1 : 0),
    lastInteractionAt: new Date().toISOString(),
    lastOutcome: outcomeLabel,
    lastDelta: adjustedTrustDelta,
    notes: [
      {
        id: createId("stake_note"),
        missionId: config.missionId || null,
        outcome: outcomeLabel,
        trustDelta: adjustedTrustDelta,
        reputationDelta: adjustedReputationDelta,
        repeatPenalty: repeatedPenalty,
        createdAt: new Date().toISOString(),
        body: noteBody
      },
      ...(current.notes || [])
    ].slice(0, 12),
    interactionCounts: counts,
    tensionScore: nextTension,
    politicalCapital: getPoliticalCapital(nextTrust, nextReputation, counts),
    lastPatternLabel: patternLabel
  };

  state.stakeholders.relationships[stakeholderId] = next;
  return {
    stakeholderId,
    trustDelta: adjustedTrustDelta,
    reputationDelta: adjustedReputationDelta,
    repeatedPenalty,
    state: next
  };
}

export function scoreStakeholderImpact(mission, validation) {
  const success = Boolean(validation?.success);
  const issueCount = Array.isArray(validation?.issues) ? validation.issues.length : 0;
  const strengthCount = Array.isArray(validation?.strengths) ? validation.strengths.length : 0;
  const stakeholderImpact = mission?.relationshipImpact || {};

  const trustDelta = success
    ? (stakeholderImpact.successTrust ?? Math.max(4, 8 - issueCount))
    : (stakeholderImpact.failureTrust ?? -(6 + Math.min(issueCount, 3)));
  const reputationDelta = success
    ? (stakeholderImpact.successReputation ?? Math.max(3, 6 + Math.min(strengthCount, 2) - Math.min(issueCount, 2)))
    : (stakeholderImpact.failureReputation ?? -(4 + Math.min(issueCount, 2)));

  return {
    trustDelta,
    reputationDelta
  };
}

export function applyStakeholderMissionImpact(state, mission, validation) {
  const missionStakeholderId = mission?.stakeholder?.id || mission?.stakeholderId;
  const reviewerId = "mariana_soto";
  const impacted = [];
  const primaryImpact = scoreStakeholderImpact(mission, validation);

  const primary = applyStakeholderInteraction(state, missionStakeholderId, {
    missionId: mission?.id || null,
    trustDelta: primaryImpact.trustDelta,
    reputationDelta: primaryImpact.reputationDelta,
    outcomeLabel: validation?.success ? "approved" : "revision_requested",
    completedMission: validation?.success === true,
    revisionRequested: validation?.success !== true,
    note: validation?.success
      ? `${mission?.title || mission?.id} quedo bien recibida por el stakeholder principal.`
      : `${mission?.title || mission?.id} quedo abierta para revision con el stakeholder principal.`
  });
  if (primary) {
    impacted.push(primary);
  }

  const reviewer = applyStakeholderInteraction(state, reviewerId, {
    missionId: mission?.id || null,
    trustDelta: validation?.success ? 4 : -3,
    reputationDelta: validation?.success ? 3 : -2,
    outcomeLabel: validation?.success ? "validated_clean" : "needs_method_review",
    note: validation?.success
      ? "La jefatura confirmo consistencia metodologica."
      : "La jefatura detecto ruido metodologico y pidio ajuste."
  });
  if (reviewer) {
    impacted.push(reviewer);
  }

  return impacted;
}

export function buildStakeholderRelationshipModel(state) {
  const relationships = state.stakeholders?.relationships || {};
  return stakeholders.map((definition) => {
    const relationship = relationships[definition.id] || createRelationshipState(definition);
    ensureInteractionCounts(relationship);
    return {
      ...definition,
      ...relationship,
      trustBand: getTrustBand(relationship.trust),
      reputationBand: getReputationBand(relationship.reputation),
      tensionBand: getTensionBand(relationship.tensionScore),
      politicalBand: getPoliticalBand(relationship.politicalCapital),
      patternSummary: relationship.lastPatternLabel,
      recentNote: relationship.notes?.[0]?.body || null
    };
  }).sort((left, right) => (right.trust + right.reputation + right.politicalCapital) - (left.trust + left.reputation + left.politicalCapital));
}

export function buildOrganizationalNetworkModel(state) {
  const relationships = buildStakeholderRelationshipModel(state);
  const strained = relationships.filter((relationship) => relationship.trust < 45 || relationship.tensionScore >= 30);
  const supporters = relationships.filter((relationship) => relationship.trust >= 70 || relationship.politicalCapital >= 15);
  const strainedAreas = Array.from(new Set(strained.map((relationship) => relationship.area)));
  const queuedMissionCount = Object.values(state.missions?.states || {}).filter((missionState) => missionState?.status === "queued").length;
  const tensionAlerts = [];

  if (strainedAreas.length >= 2) {
    tensionAlerts.push(`Hay friccion cruzada entre ${strainedAreas.join(" y ")}.`);
  }
  if (queuedMissionCount && strained.some((relationship) => relationship.area === "leadership" || relationship.area === "operations")) {
    tensionAlerts.push("Existe riesgo de cambio de prioridad por presion interna.");
  }
  if (supporters.length >= 2) {
    tensionAlerts.push("Tienes cobertura politica suficiente para sostener decisiones dificiles.");
  }

  const avgTension = relationships.length
    ? relationships.reduce((acc, relationship) => acc + (relationship.tensionScore || 0), 0) / relationships.length
    : 0;
  const politicalTemperature = avgTension >= 30
    ? { label: "Caliente", tone: "warning" }
    : avgTension >= 15
      ? { label: "Inestable", tone: "info" }
      : { label: "Controlado", tone: "success" };

  return {
    supporters,
    strained,
    tensionAlerts,
    politicalTemperature,
    priorityRisk: queuedMissionCount && strained.length > 0,
    queuedMissionCount
  };
}
