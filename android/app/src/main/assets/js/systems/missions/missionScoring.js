function normalizeWeights(weights = {}) {
  const technical = weights.technical ?? 0.5;
  const reporting = weights.reporting ?? 0.3;
  const businessCommunication = weights.businessCommunication ?? 0.2;
  const total = technical + reporting + businessCommunication || 1;
  return {
    technical: technical / total,
    reporting: reporting / total,
    businessCommunication: businessCommunication / total
  };
}

function computeOutcome(mission, validation, totalScore) {
  if (!validation.success) {
    return mission.outcomes?.poor || 'revision_requested';
  }

  const thresholds = mission.scoring?.thresholds || {};
  if (totalScore >= (thresholds.excellent ?? 90)) {
    return mission.outcomes?.excellent || 'approved_clean';
  }
  if (totalScore >= (thresholds.solid ?? 75)) {
    return mission.outcomes?.solid || 'approved';
  }
  if (totalScore >= (thresholds.acceptable ?? 60)) {
    return mission.outcomes?.acceptable || 'approved_with_notes';
  }
  return mission.outcomes?.poor || 'revision_requested';
}

export function scoreMissionValidation(mission, validation) {
  const successDeltas = mission.scoring?.deltas?.success || { prestige: mission.rewards?.prestige ?? 25, score: mission.rewards?.technicalScore ?? 12 };
  const failureDeltas = mission.scoring?.deltas?.failure || { prestige: -2, score: 1 };
  const weights = normalizeWeights(mission.scoring?.weights);
  const breakdown = validation.breakdown || { technical: 0, reporting: 0, businessCommunication: 0 };
  const weightedScore = Math.round(
    (breakdown.technical * weights.technical)
    + (breakdown.reporting * weights.reporting)
    + (breakdown.businessCommunication * weights.businessCommunication)
  );
  const totalScore = validation.success ? Math.max(weightedScore, mission.scoring?.thresholds?.acceptable ?? 60) : weightedScore;
  const outcome = computeOutcome(mission, validation, totalScore);

  return {
    success: validation.success,
    prestigeDelta: successDeltas.prestige,
    prestigeDeltaFailure: failureDeltas.prestige,
    scoreDelta: successDeltas.score,
    scoreDeltaFailure: failureDeltas.score,
    message: validation.success
      ? (mission.successMessage || `Reporte aprobado. ${validation.expectedWinner} lidera el corte analizado y la entrega es consistente para negocio.`)
      : (mission.failureMessage || 'Hay observaciones metodológicas. Revisa limpieza, corte semanal y gráfica antes de reenviar.'),
    issues: validation.issues,
    strengths: validation.strengths,
    expectedWinner: validation.expectedWinner,
    detectedWinner: validation.detectedWinner,
    missionId: mission.id,
    breakdown,
    totalScore,
    outcome,
    completedDeliverables: {
      sql: true,
      chart: validation.success || !validation.issues.some((issue) => /gráfico/i.test(issue)),
      executiveSummary: validation.success || !validation.issues.some((issue) => /conclusión/i.test(issue))
    }
  };
}
