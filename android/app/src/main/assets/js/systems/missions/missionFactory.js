import { applyMissionCompatibilityShape } from '../../domain/missions/missionModels.js';
import { getMissionDefinitionById, getPrimaryMissionDefinition, listMissionDefinitions } from './missionRegistry.js';

export function buildMission(id) {
  const definition = id ? getMissionDefinitionById(id) : getPrimaryMissionDefinition();
  return definition ? applyMissionCompatibilityShape(definition) : null;
}

export function buildMissionCatalog() {
  return listMissionDefinitions().map((definition) => applyMissionCompatibilityShape(definition));
}
