import { createId, truncate } from "../app/utils.js";
import { getStakeholder } from "../data/stakeholders.js";
import { getMissionOrPrimary, getMissionById } from "../data/missions.js";
import { getStakeholderRelationship, getTrustBand, getReputationBand } from "./stakeholders/stakeholderEngine.js";
import { advanceSimulationTime } from "./clockEngine.js";

const PRIORITY_SCORE = { high: 3, normal: 2, low: 1 };

function isThreadVisible(state, thread) {
  if (!thread.missionId) {
    return true;
  }
  const missionState = state.missions.states[thread.missionId];
  return Boolean(missionState?.isVisible);
}

function getThreadScore(thread, activeMissionId) {
  let score = PRIORITY_SCORE[thread.priority] || 0;

  if (thread.unread) {
    score += 3;
  }
  if (thread.missionId) {
    score += 2;
  }
  if (thread.missionId && thread.missionId === activeMissionId) {
    score += 2;
  }
  if (thread.missionId && !thread.accepted) {
    score += 1;
  }
  const mission = thread.missionId ? getMissionById(thread.missionId) : null;
  if (mission?.priority === 'high') {
    score += 2;
  }

  return score;
}

function getPriorityLabel(priority) {
  if (priority === "high") {
    return "Alta prioridad";
  }
  if (priority === "low") {
    return "Informativo";
  }
  return "Seguimiento";
}

function getThreadStatusLabel(thread) {
  if (thread.threadType === 'followup' && thread.unread) {
    return 'Interrupción';
  }
  if (thread.threadType === 'checkin') {
    return thread.labels?.includes('answered') ? 'Respondido' : 'Requiere estado';
  }
  if (thread.threadType === 'meeting') {
    return thread.labels?.includes('attended_meeting') ? 'Atendida' : 'Reunión pendiente';
  }
  if (thread.threadType === 'followup_task') {
    return thread.labels?.includes('task_resolved') ? 'Follow-up resuelto' : 'Tarea derivada';
  }
  if (thread.missionId && thread.accepted) {
    return "En curso";
  }
  if (thread.missionId) {
    return "Pendiente";
  }
  if (thread.unread) {
    return "Por leer";
  }
  return "Leído";
}

function decorateThread(state, thread, activeMissionId) {
  const stakeholder = getStakeholder(thread.senderId);
  const relationship = getStakeholderRelationship(state, thread.senderId);
  const missionRelated = Boolean(thread.missionId);
  const missionActive = Boolean(thread.missionId && thread.missionId === activeMissionId);

  return {
    ...thread,
    stakeholder,
    relationship,
    trustBand: relationship ? getTrustBand(relationship.trust) : null,
    reputationBand: relationship ? getReputationBand(relationship.reputation) : null,
    missionRelated,
    missionActive,
    requiresAction: Boolean(thread.unread || thread.priority === "high" || (thread.missionId && !thread.accepted)),
    priorityLabel: getPriorityLabel(thread.priority),
    statusLabel: getThreadStatusLabel(thread)
  };
}

export function getThreadById(state, threadId) {
  return state.mail.threads.find((thread) => thread.id === threadId) || null;
}

export function getMissionThread(state, missionId) {
  return state.mail.threads.find((thread) => thread.missionId === missionId) || null;
}


export function getFeedbackThreadByMissionId(state, missionId) {
  return state.mail.threads.find((thread) => thread.missionId === missionId && thread.threadType === 'feedback') || null;
}

export function markThreadRead(store, threadId) {
  store.setState((state) => {
    const thread = getThreadById(state, threadId);
    if (thread) {
      thread.unread = false;
      thread.readAt = new Date().toISOString();
    }
  }, { silent: true });
}

export function selectThread(store, threadId) {
  store.setState((state) => {
    state.mail.selectedThreadId = threadId;
  });
  markThreadRead(store, threadId);
  advanceSimulationTime(store, 'review_mail');
}

export function acceptMissionFromThread(store, missionId) {
  store.setState((state) => {
    const thread = getMissionThread(state, missionId);
    if (thread) {
      thread.unread = false;
      thread.accepted = true;
      thread.readAt = new Date().toISOString();
    }
  }, { silent: true });
}

export function buildInboxModel(state) {
  const activeMissionId = state.missions.activeId;
  const visibleThreads = state.mail.threads.filter((thread) => isThreadVisible(state, thread));
  const threads = visibleThreads
    .map((thread) => decorateThread(state, thread, activeMissionId))
    .sort((left, right) => getThreadScore(right, activeMissionId) - getThreadScore(left, activeMissionId));

  const selectedThread = threads.find((thread) => thread.id === state.mail.selectedThreadId) || threads[0] || null;

  return {
    threads,
    selectedThread,
    unreadCount: threads.filter((thread) => thread.unread).length,
    highPriorityCount: threads.filter((thread) => thread.priority === "high").length,
    actionRequiredCount: threads.filter((thread) => thread.requiresAction).length,
    missionThread: threads.find((thread) => thread.missionId === activeMissionId) || threads.find((thread) => thread.missionId) || null
  };
}

export function createFeedbackThread({ mission, validation, stakeholderId, feedback }) {
  const stakeholder = getStakeholder(stakeholderId) || getStakeholder("mariana_soto");
  const verdict = validation.success ? "resuelto" : "requiere revisión";
  const subject = feedback?.subject || (
    validation.success
      ? `Feedback de ${stakeholder.role}: cierre aprobado`
      : `Feedback de ${stakeholder.role}: revisa la entrega`
  );

  return {
    id: createId("thread_feedback"),
    missionId: mission.id,
    threadType: "feedback",
    senderId: stakeholder.id,
    senderName: stakeholder.name,
    senderRole: stakeholder.role,
    subject,
    preview: feedback?.preview || truncate(validation.message, 72),
    priority: feedback?.priority || (validation.success ? "normal" : "high"),
    timestamp: "Mon 16:45",
    unread: true,
    labels: ["feedback", verdict, ...(feedback?.labels || [])],
    attachments: [],
    messages: [
      {
        id: createId("message"),
        from: stakeholder.name,
        role: stakeholder.role,
        body: feedback?.body || validation.message
      }
    ]
  };
}

export function upsertFeedbackThread(store, missionId, messagePatch) {
  store.setState((state) => {
    const existing = getFeedbackThreadByMissionId(state, missionId);
    const nextMessage = {
      id: createId('message'),
      from: messagePatch.senderName,
      role: messagePatch.senderRole,
      body: messagePatch.body
    };

    if (existing) {
      existing.subject = messagePatch.subject;
      existing.preview = messagePatch.preview;
      existing.priority = messagePatch.priority;
      existing.unread = true;
      existing.timestamp = messagePatch.timestamp || existing.timestamp;
      existing.labels = Array.from(new Set([...(existing.labels || []), ...(messagePatch.labels || [])]));
      existing.messages = [...(existing.messages || []), nextMessage];
      state.mail.selectedThreadId = existing.id;
      return;
    }

    state.mail.threads.unshift({
      id: createId('thread_feedback'),
      missionId,
      threadType: 'feedback',
      senderId: messagePatch.senderId,
      senderName: messagePatch.senderName,
      senderRole: messagePatch.senderRole,
      subject: messagePatch.subject,
      preview: messagePatch.preview,
      priority: messagePatch.priority,
      timestamp: messagePatch.timestamp || 'Mon 16:45',
      unread: true,
      labels: [...(messagePatch.labels || [])],
      attachments: [],
      messages: [nextMessage]
    });
    state.mail.selectedThreadId = state.mail.threads[0].id;
  }, { silent: true });
}

export function buildMailPreview(state) {
  const inbox = buildInboxModel(state);
  const currentMission = state.missions.activeId ? getMissionOrPrimary(state.missions.activeId) : null;

  return {
    unreadCount: inbox.unreadCount,
    selectedThread: inbox.selectedThread,
    missionId: currentMission?.id || null,
    subject: inbox.selectedThread?.subject || "Sin correo activo"
  };
}
