import { escapeHtml, truncate } from "../app/utils.js";
import { buildInboxModel } from "../systems/mailSystem.js";
import { getMissionById } from "../data/missions.js";
import { renderBadge, renderEmptyState } from "./widgetView.js";
import { renderMailDetail } from "./mailDetailView.js";

function getLabelTone(label) {
  if (label === "urgent" || label === "followup") {
    return "warning";
  }
  if (label === "mission" || label === "guidance") {
    return "info";
  }
  if (label === "technical") {
    return "success";
  }
  return "neutral";
}

function getLabelText(label) {
  const labels = {
    mission: "Misión",
    urgent: "Urgente",
    technical: "Técnico",
    guidance: "Guía",
    ambient: "Interno",
    followup: "Seguimiento",
    feedback: "Feedback"
  };

  return labels[label] || label;
}

function renderThreadRow(thread, selectedId) {
  const accent = thread.stakeholder?.accent || "#71808a";
  const avatar = thread.stakeholder?.avatar || thread.senderName.slice(0, 2).toUpperCase();

  return `
    <button
      class="thread-row ${thread.id === selectedId ? "is-active" : ""} ${thread.unread ? "is-unread" : ""} ${thread.priority === "high" ? "is-high-priority" : ""}"
      data-action="select-thread"
      data-thread-id="${escapeHtml(thread.id)}"
    >
      <div class="thread-row__topline">
        <div class="thread-row__sender">
          <span class="thread-row__avatar" style="background:${escapeHtml(accent)}">${escapeHtml(avatar)}</span>
          <span class="thread-row__identity">
            <span class="thread-row__name">${escapeHtml(thread.senderName)}</span>
            <span class="thread-row__role">${escapeHtml(thread.senderRole)}</span>
          </span>
        </div>
        <span class="thread-row__time">${escapeHtml(thread.timestamp)}</span>
      </div>

      <div class="thread-row__head">
        <span class="thread-row__subject">${escapeHtml(thread.subject)}</span>
      </div>

      <div class="thread-row__preview">${escapeHtml(truncate(thread.preview, 118))}</div>

      <div class="thread-row__badges">
        ${thread.unread ? renderBadge("Sin leer", "warning") : renderBadge("Leído", "success")}
        ${renderBadge(thread.priorityLabel, thread.priority === "high" ? "warning" : thread.priority === "normal" ? "info" : "neutral")}
        ${thread.missionRelated ? renderBadge(thread.accepted ? "Misión en curso" : "Misión pendiente", thread.accepted ? "success" : "info") : ""}
        ${thread.trustBand ? renderBadge(thread.trustBand.label, thread.trustBand.tone) : ""}
        ${(thread.labels || []).slice(0, 2).map((label) => renderBadge(getLabelText(label), getLabelTone(label))).join("")}
      </div>
    </button>
  `;
}

export function renderInboxView(state) {
  const inbox = buildInboxModel(state);
  const selectedThread = inbox.selectedThread;
  const missionBase = selectedThread?.missionId ? getMissionById(selectedThread.missionId) : null;
  const missionState = missionBase?.id ? state.missions.states[missionBase.id] || null : null;
  const mission = missionBase ? { ...missionBase, runtime: missionState } : null;

  return `
    <section class="view view-inbox">
      <div class="view-head view-head--mail">
        <div>
          <div class="eyebrow">Correo interno</div>
          <h2>Correo corporativo</h2>
          <p>Solicitudes, feedback técnico y seguimientos internos permanecen dentro de la workstation.</p>
        </div>
        <div class="view-head__meta">
          ${renderBadge(`${inbox.unreadCount} sin leer`, inbox.unreadCount ? "warning" : "success")}
          ${renderBadge(`${inbox.actionRequiredCount} con acción`, inbox.actionRequiredCount ? "info" : "neutral")}
          ${selectedThread?.missionId ? renderBadge("Hilo de misión", "info") : renderBadge("Correo interno", "neutral")}
        </div>
      </div>

      <section class="panel-card mail-briefing">
        <div class="panel-card__title">Estado de bandeja</div>
        <div class="panel-card__body">
          <div class="mail-briefing__stats">
            <article class="mail-stat">
              <div class="mail-stat__label">Hilos abiertos</div>
              <div class="mail-stat__value">${inbox.threads.length}</div>
              <div class="mail-stat__note">Bandeja actual</div>
            </article>
            <article class="mail-stat">
              <div class="mail-stat__label">Alta prioridad</div>
              <div class="mail-stat__value">${inbox.highPriorityCount}</div>
              <div class="mail-stat__note">Requieren lectura cuidadosa</div>
            </article>
            <article class="mail-stat">
              <div class="mail-stat__label">Misión activa</div>
              <div class="mail-stat__value">${inbox.missionThread ? "Sí" : "No"}</div>
              <div class="mail-stat__note">${escapeHtml(mission?.title || "Sin hilo seleccionado")}</div>
            </article>
          </div>
        </div>
      </section>

      <div class="mail-layout">
        <aside class="thread-list-panel panel-card">
          <div class="panel-card__title">Bandeja priorizada</div>
          <div class="panel-card__body thread-list-panel__body">
            <div class="thread-list-panel__summary">
              <strong>Orden actual:</strong> primero acciones urgentes, luego seguimientos técnicos y mensajes informativos.
            </div>
            <div class="thread-list">
              ${inbox.threads.length
                ? inbox.threads.map((thread) => renderThreadRow(thread, selectedThread?.id)).join("")
                : renderEmptyState("Sin correos", "No hay hilos disponibles en esta bandeja.")}
            </div>
          </div>
        </aside>

        ${renderMailDetail(selectedThread, mission, state)}
      </div>
    </section>
  `;
}
