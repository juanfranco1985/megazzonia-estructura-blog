import { missionDefinitions } from '../../data/missions/index.js';
import { validateMissionDefinition } from '../../domain/missions/missionSchema.js';

const registry = new Map();

for (const definition of missionDefinitions) {
  validateMissionDefinition(definition);
  registry.set(definition.id, definition);
}

export function listMissionDefinitions() {
  return [...registry.values()];
}

export function getMissionDefinitionById(id) {
  return registry.get(id) || null;
}

export function getPrimaryMissionDefinition() {
  return listMissionDefinitions()[0] || null;
}

export function getDependentMissionDefinitions(completedMissionId) {
  return listMissionDefinitions().filter((definition) =>
    Array.isArray(definition.prerequisites) && definition.prerequisites.includes(completedMissionId)
  );
}

export function missionPrerequisitesSatisfied(definition, completedIds = []) {
  const required = definition?.prerequisites || [];
  if (!required.length) {
    return true;
  }
  const completed = new Set(completedIds);
  return required.every((missionId) => completed.has(missionId));
}
