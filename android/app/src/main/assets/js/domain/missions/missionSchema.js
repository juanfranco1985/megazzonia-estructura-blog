const REQUIRED_FIELDS = [
  'id',
  'title',
  'summary',
  'analysisType',
  'priority',
  'stakeholder',
  'datasets',
  'deliverables',
  'validation',
  'rewards'
];

export function validateMissionDefinition(definition) {
  if (!definition || typeof definition !== 'object') {
    throw new Error('Mission definition must be an object.');
  }

  for (const field of REQUIRED_FIELDS) {
    if (!(field in definition)) {
      throw new Error(`Mission definition is missing required field: ${field}`);
    }
  }

  if (!definition.id || !definition.title) {
    throw new Error('Mission definition requires id and title.');
  }

  if (!Array.isArray(definition.datasets) || !definition.datasets.length) {
    throw new Error(`Mission ${definition.id} must define at least one dataset.`);
  }

  if (!definition.stakeholder?.id) {
    throw new Error(`Mission ${definition.id} must define stakeholder.id.`);
  }

  return true;
}
