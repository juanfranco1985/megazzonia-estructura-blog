import { getMissionOrPrimary } from "../data/missions.js";
import { validateMissionPayload } from "./missions/missionValidator.js";
import { scoreMissionValidation } from "./missions/missionScoring.js";

export function validateMissionReport({ state, runtime, mission }) {
  const activeMission = mission || getMissionOrPrimary(state.missions.activeId);
  const validation = validateMissionPayload({ mission: activeMission, state, runtime });
  return scoreMissionValidation(activeMission, validation);
}
