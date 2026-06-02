import { truncate } from "../app/utils.js";
import { getStakeholder } from "../data/stakeholders.js";
import { getStakeholderRelationship, getTrustBand, getReputationBand } from "./stakeholders/stakeholderEngine.js";

function getRelationshipSnapshot(state, stakeholderId) {
  const relationship = getStakeholderRelationship(state, stakeholderId);
  if (!relationship) {
    return null;
  }
  return {
    ...relationship,
    trustBand: getTrustBand(relationship.trust),
    reputationBand: getReputationBand(relationship.reputation)
  };
}

function getTimingLabel(missionState) {
  if (missionState?.isOverdue) {
    return 'late';
  }
  return 'on_time';
}

function getQualityLabel(validation) {
  if (!validation.success) {
    if ((validation.totalScore || 0) >= 65) {
      return 'promising_but_incomplete';
    }
    return 'needs_revision';
  }

  if ((validation.totalScore || 0) >= 90) {
    return 'excellent';
  }
  if ((validation.totalScore || 0) >= 78) {
    return 'solid';
  }
  return 'acceptable';
}

function buildSubject(stakeholder, qualityLabel, timingLabel, revisionContext = {}) {
  const role = stakeholder?.role || 'Stakeholder';
  const round = Number(revisionContext.currentRevisionRound || 0);
  const hasHistory = Number(revisionContext.revisionRequests || 0) > 0;

  if (!revisionContext.success && round >= 2) {
    return `Feedback de ${role}: sigue faltando cerrar la revisión ${round}`;
  }
  if (!revisionContext.success && hasHistory) {
    return `Feedback de ${role}: revisión ${round} todavía pendiente`;
  }
  if (revisionContext.success && hasHistory) {
    return `Feedback de ${role}: versión corregida aprobada`;
  }
  if (qualityLabel === 'excellent' && timingLabel === 'on_time') {
    return `Feedback de ${role}: entrega lista para circular`;
  }
  if (qualityLabel === 'solid' && timingLabel === 'on_time') {
    return `Feedback de ${role}: cierre aprobado con buena base`;
  }
  if (qualityLabel === 'acceptable' && timingLabel === 'late') {
    return `Feedback de ${role}: aprobado, pero llegamos tarde`;
  }
  if (qualityLabel === 'solid' && timingLabel === 'late') {
    return `Feedback de ${role}: aprobado, aunque fuera de horario`;
  }
  if (qualityLabel === 'excellent' && timingLabel === 'late') {
    return `Feedback de ${role}: gran entrega, aunque fuera de horario`;
  }
  if (qualityLabel === 'promising_but_incomplete') {
    return `Feedback de ${role}: la base está, falta cerrar mejor la entrega`;
  }
  return `Feedback de ${role}: revisa la entrega antes de reenviar`;
}

function buildStakeholderOpening(stakeholder, qualityLabel, timingLabel, relationship) {
  const name = stakeholder?.name || 'El stakeholder';
  const trust = relationship?.trust || 50;

  if (qualityLabel === 'excellent' && timingLabel === 'on_time') {
    return trust >= 70
      ? `${name} valida la entrega sin fricción y da por hecho que puede circular hacia negocio.`
      : `${name} queda conforme con la calidad y la velocidad de respuesta de esta entrega.`;
  }
  if (qualityLabel === 'solid' && timingLabel === 'on_time') {
    return `${name} considera que el análisis es confiable y usable para avanzar con el frente de negocio.`;
  }
  if (qualityLabel === 'acceptable' && timingLabel === 'late') {
    return `${name} toma la entrega porque la necesita, pero deja explicitado que el atraso ya impactó la conversación interna.`;
  }
  if (qualityLabel === 'solid' && timingLabel === 'late') {
    return `${name} aprueba la entrega, aunque remarca que el atraso le quitó margen a la conversación con negocio.`;
  }
  if (qualityLabel === 'excellent' && timingLabel === 'late') {
    return `${name} reconoce que la entrega quedó fuerte, aunque el vencimiento ya generó presión adicional.`;
  }
  if (qualityLabel === 'promising_but_incomplete') {
    return `${name} ve una base analítica razonable, pero todavía no la siente lista para presentarla sin acompañamiento.`;
  }
  return `${name} marca que la entrega todavía no alcanza el estándar esperado y pide una nueva versión.`;
}

function buildQualityLine(validation) {
  const breakdown = validation.breakdown || {};
  return `Calidad detectada: técnico ${breakdown.technical || 0}/100 · reporting ${breakdown.reporting || 0}/100 · ejecutivo ${breakdown.businessCommunication || 0}/100. Score total ${validation.totalScore || 0}/100.`;
}

function buildTimingLine(missionState) {
  if (missionState?.isOverdue) {
    return 'Timing: la entrega quedó registrada fuera del horario comprometido y eso reduce margen político con el área.';
  }
  return 'Timing: la entrega quedó registrada dentro de la ventana comprometida.';
}

function buildRelationshipLine(relationship) {
  if (!relationship) {
    return 'Relación: todavía no hay historial suficiente con este stakeholder.';
  }
  return `Relación actual: ${relationship.trustBand.label.toLowerCase()} y ${relationship.reputationBand.label.toLowerCase()} (${relationship.trust}/100 de confianza).`;
}

function buildStrengthLine(validation) {
  if (!validation.strengths?.length) {
    return null;
  }
  return `Lo más sólido de esta entrega: ${validation.strengths.slice(0, 2).join(' ')}.`;
}

function buildIssueLine(validation) {
  if (!validation.issues?.length) {
    return null;
  }
  const issue = validation.issues[0];
  if (validation.issues.length === 1) {
    return `Principal observación: ${issue}`;
  }
  return `Principal observación: ${issue} Además quedan ${validation.issues.length - 1} punto(s) a corregir antes de dejar la pieza realmente estable.`;
}

function buildActionLine(stakeholder, qualityLabel, timingLabel, validation, revisionContext = {}) {
  if (!validation.success) {
    const roundLabel = revisionContext.currentRevisionRound ? `Revisión ${revisionContext.currentRevisionRound}. ` : '';
    return stakeholder?.id === 'mariana_soto'
      ? `${roundLabel}Siguiente paso sugerido: corrige la metodología, vuelve a ejecutar la consulta y rehace el resumen antes de reenviar.`
      : `${roundLabel}Siguiente paso sugerido: ajusta la pieza, deja una conclusión más usable y vuelve a compartir una versión cerrada.`;
  }
  if (timingLabel === 'late') {
    return 'Siguiente paso sugerido: deja trazabilidad de supuestos y evita que el próximo corte llegue nuevamente sobre la hora.';
  }
  if (qualityLabel === 'excellent') {
    return 'Siguiente paso sugerido: deja documentado el criterio porque esta entrega ya sirve como referencia para futuros cortes.';
  }
  return 'Siguiente paso sugerido: mantener este estándar, pero compactar todavía más la narrativa ejecutiva en futuras entregas.';
}

export function buildContextualFeedback(state, mission, validation) {
  const stakeholderId = mission?.stakeholder?.id || mission?.stakeholderId || 'mariana_soto';
  const stakeholder = getStakeholder(stakeholderId) || getStakeholder('mariana_soto');
  const missionState = state.missions.states?.[mission.id] || null;
  const relationship = getRelationshipSnapshot(state, stakeholderId);
  const timingLabel = getTimingLabel(missionState);
  const qualityLabel = getQualityLabel(validation);
  const revisionContext = {
    revisionRequests: missionState?.revisionRequests || 0,
    currentRevisionRound: missionState?.currentRevisionRound || 0,
    success: validation.success
  };

  const lines = [
    buildStakeholderOpening(stakeholder, qualityLabel, timingLabel, relationship),
    buildQualityLine(validation),
    buildTimingLine(missionState),
    buildRelationshipLine(relationship),
    buildStrengthLine(validation),
    buildIssueLine(validation),
    buildActionLine(stakeholder, qualityLabel, timingLabel, validation, revisionContext)
  ].filter(Boolean);

  const body = lines.join('\n\n');
  const preview = truncate(lines.slice(0, 2).join(' '), 96);
  const priority = !validation.success || timingLabel === 'late' ? 'high' : qualityLabel === 'excellent' ? 'low' : 'normal';

  return {
    stakeholderId,
    stakeholder,
    relationship,
    qualityLabel,
    timingLabel,
    subject: buildSubject(stakeholder, qualityLabel, timingLabel, revisionContext),
    preview,
    body,
    priority,
    labels: [qualityLabel, timingLabel, validation.success ? 'approved' : 'revision']
  };
}
