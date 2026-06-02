import { MISSION_STATUS, MISSION_VISIBILITY } from './missionTypes.js';

export function createMissionRuntimeState(mission) {
  const initiallyUnlocked = Boolean(mission.initiallyUnlocked);
  const visibilityMode = mission.visibilityMode || MISSION_VISIBILITY.VISIBLE;
  const visibleFromStart = visibilityMode === MISSION_VISIBILITY.VISIBLE || initiallyUnlocked;

  return {
    status: MISSION_STATUS.LOCKED,
    acceptedAt: null,
    acceptedAtMinutes: null,
    pausedAt: null,
    pausedAtMinutes: null,
    completedAt: null,
    prestigeReward: mission.rewards?.prestige ?? mission.prestigeReward ?? 25,
    attempts: 0,
    completedDeliverables: {
      sql: false,
      chart: false,
      executiveSummary: false
    },
    lastValidation: null,
    outcome: null,
    isUnlocked: initiallyUnlocked,
    isVisible: visibleFromStart,
    unlockedAt: initiallyUnlocked ? new Date().toISOString() : null,
    unlockReason: initiallyUnlocked ? 'initial_catalog' : null,
    deadlineAtMinutes: null,
    overdueSinceMinutes: null,
    isOverdue: false,
    titleSnapshot: mission.title,
    revisionRequests: 0,
    resubmissionCount: 0,
    currentRevisionRound: 0,
    needsRevision: false,
    revisionHistory: [],
    lastFeedbackThreadId: null,
    lastFeedbackSubject: null,
    resolvedAfterRevision: false
  };
}

export function applyMissionCompatibilityShape(definition) {
  const primaryDataset = definition.datasets?.[0] || null;
  const primaryFinding = Object.values(definition.expectedAnswer || {}).find((value) => value !== null && value !== undefined && String(value).trim()) || null;

  return {
    ...definition,
    priority: definition.priority,
    stakeholderId: definition.stakeholder?.id || null,
    weekWindow: definition.schedule?.weekWindow || null,
    deadlineLabel: definition.schedule?.deadlineLabel || null,
    prestigeReward: definition.rewards?.prestige ?? 25,
    skillsTaught: [...(definition.rewards?.unlockSkills || [])],
    starterQuery: definition.starterQuery || '',
    prerequisites: [...(definition.prerequisites || [])],
    initiallyUnlocked: Boolean(definition.initiallyUnlocked),
    visibilityMode: definition.visibilityMode || MISSION_VISIBILITY.VISIBLE,
    answerKey: {
      winningChannel: definition.expectedAnswer?.winningChannel || primaryFinding || 'Web',
      primaryFinding: primaryFinding || 'Web',
      metric: definition.deliverables?.sql?.primaryMetric || 'total_amount',
      chart: definition.deliverables?.chart?.preferredType || 'bar'
    },
    assetBundle: {
      mission: definition.context?.attachments?.find((item) => item.id === 'mission_json')?.path || '',
      schema: definition.context?.attachments?.find((item) => item.id === 'schema_json')?.path || '',
      csv: primaryDataset?.path || ''
    },
    attachments: (definition.context?.attachments || []).map((attachment) => ({ ...attachment }))
  };
}
