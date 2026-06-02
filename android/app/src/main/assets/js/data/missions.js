import { buildMission, buildMissionCatalog } from "../systems/missions/missionFactory.js";

export const missions = buildMissionCatalog();

export function getMissionById(id) {
  return buildMission(id);
}

export function getPrimaryMission() {
  return buildMission();
}

export function getPrimaryMissionId() {
  return getPrimaryMission()?.id || null;
}

export function getMissionOrPrimary(id) {
  return getMissionById(id) || getPrimaryMission();
}
