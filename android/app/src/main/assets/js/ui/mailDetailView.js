import { escapeHtml, formatDisplayDate, joinClasses } from "../app/utils.js";
import { getStakeholder } from "../data/stakeholders.js";
import { getStakeholderRelationship, getTrustBand, getReputationBand } from "../systems/stakeholders/stakeholderEngine.js";
import { renderBadge, renderEmptyState } from "./widgetView.js";

function getPriorityTone(priority) {
  if (priority === "high") {
    return "warning";
  }
  if (priority === "low") {
    return "neutral";
  }
  return "info";
}

function getThreadTypeLabel(thread) {
  if (thread.threadType === "mission") {
    return "Solicitud operativa";
  }
  if (thread.threadType === "guidance") {
    return "Seguimiento tecnico";
  }
  if (thread.threadType === "feedback") {
    return "Feedback interno";
  }
  if (thread.threadType === "checkin") {
    return "Check-in ejecutivo";
  }
  if (thread.threadType === "meeting") {
    return "Reunion operativa";
  }
  if (thread.threadType === "followup_task") {
    return "Tarea derivada";
  }
  return "Correo interno";
}

function getStatusBadge(thread, mission, agendaItem) {
  if (mission && thread.accepted) {
    return renderBadge("Mision en curso", "success");
  }
  if (mission && mission.runtime?.isUnlocked) {
    return renderBadge("Requiere aceptacion", "warning");
  }
  if (mission) {
    return renderBadge("Bloqueada", "neutral");
  }
  if (thread.threadType === "checkin") {
    return renderBadge(thread.labels?.includes("answered") ? "Check-in respondido" : "Estado requerido", thread.labels?.includes("answered") ? "success" : "warning");
  }
  if (thread.threadType === "meeting" && agendaItem) {
    if (agendaItem.status === "completed") {
      return renderBadge("Reunion atendida", "success");
    }
    if (agendaItem.status === "missed") {
      return renderBadge("Reunion perdida", "warning");
    }
    if ((agendaItem.rescheduleCount || 0) > 0) {
      return renderBadge("Reprogramada", "info");
    }
    return renderBadge("Pendiente de decision", "warning");
  }
  return renderBadge(thread.unread ? "Pendiente de lectura" : "Leido", thread.unread ? "warning" : "success");
}

function renderAttachmentCard(attachment, missionAccepted, missionId) {
  const stateLabel = attachment.status || (missionAccepted ? "Disponible en Archivos" : "Adjunto listo");
  return `
    <button
      class="${joinClasses("attachment-card", `attachment-card--${attachment.type || "file"}`)}"
      data-action="open-attachment"
      data-attachment-id="${escapeHtml(attachment.id || "")}"
      data-attachment-path="${escapeHtml(attachment.path)}"
      data-attachment-name="${escapeHtml(attachment.name)}"
      data-mission-id="${escapeHtml(missionId || "")}"
    >
      <span class="attachment-card__type">${escapeHtml((attachment.type || "file").toUpperCase())}</span>
      <span class="attachment-card__name">${escapeHtml(attachment.name)}</span>
      <span class="attachment-card__label">${escapeHtml(attachment.label || "Archivo interno")}</span>
      <span class="attachment-card__status">${escapeHtml(stateLabel)}</span>
    </button>
  `;
}

export function renderMailDetail(thread, mission, state) {
  if (!thread) {
    return `
      <div class="mail-detail mail-detail--empty">
        ${renderEmptyState("No hay correo seleccionado", "Selecciona un hilo en la lista para leer el detalle y continuar el flujo de trabajo.")}
      </div>
    `;
  }

  const stakeholder = getStakeholder(thread.senderId);
  const relationship = state ? getStakeholderRelationship(state, thread.senderId) : null;
  const trustBand = relationship ? getTrustBand(relationship.trust) : null;
  const reputationBand = relationship ? getReputationBand(relationship.reputation) : null;
  const tone = getPriorityTone(thread.priority);
  const missionAccepted = Boolean(thread.accepted);
  const missionUnlocked = Boolean(mission?.runtime?.isUnlocked);
  const agendaItem = thread.agendaId ? state?.agenda?.items?.find((item) => item.id === thread.agendaId) || null : null;
  const conflictCount = agendaItem?.conflictIds?.length || 0;
  const canReprogram = Boolean(agendaItem && agendaItem.status === "pending" && (agendaItem.rescheduleCount || 0) < (agendaItem.maxReschedules ?? 1));
  const actionNote = thread.threadType === "followup_task"
    ? thread.labels?.includes("task_resolved")
      ? "La tarea derivada ya quedo resuelta y el hilo conserva la trazabilidad del acuerdo operativo."
      : "Este follow-up nacio de una reunion y pide una accion hija concreta antes del siguiente bloque."
    : thread.threadType === "mini_deliverable"
      ? thread.labels?.includes("mini_done")
        ? "El mini-entregable ya quedo preparado. Usa el hilo como trazabilidad del output corto enviado."
        : "Este pedido corto requiere un output puntual: resumen ejecutivo, nota de riesgo o handoff interno."
      : thread.threadType === "business_review"
        ? thread.labels?.includes("review_resolved")
          ? "La respuesta de negocio ya quedo resuelta. Usa el hilo como trazabilidad de la decision posterior."
          : "Este hilo pide una decision posterior de negocio sobre un mini-output ya entregado."
        : thread.threadType === "checkin"
          ? thread.labels?.includes("answered")
            ? "El check-in ya quedo respondido. Usa el hilo como trazabilidad del estado enviado."
            : "Responde con un estado corto y ejecutivo para sostener visibilidad sobre avance, riesgo y prioridad."
          : thread.threadType === "meeting"
            ? agendaItem?.status === "completed"
              ? "La reunion ya quedo atendida. El hilo conserva que decision tomaste y como cerraste el corte."
              : conflictCount
                ? "Este espacio se cruza con otra reunion y te obliga a elegir, mover o dejar pasar uno de los dos frentes."
                : canReprogram
                  ? "Puedes asistir, mover una vez el espacio o dejarlo caer si la sobrecarga ya no te da margen real."
                  : "La reunion sigue pendiente y ya no conviene seguir pateandola."
            : mission
              ? missionAccepted
                ? "La mision ya esta asignada. Puedes seguir con Archivos o abrir Terminal para comenzar el analisis."
                : missionUnlocked
                  ? "Acepta la mision para desbloquear el dataset y mover el flujo desde Correo hacia Archivos."
                  : "Esta solicitud todavia no esta habilitada. Completa primero la mision previa para destrabarla."
              : "Este hilo es informativo. Usalo como contexto para futuras solicitudes.";

  return `
    <article class="mail-detail">
      <header class="mail-detail__header">
        <div>
          <div class="mail-detail__eyebrow">${escapeHtml(getThreadTypeLabel(thread))}</div>
          <div class="mail-detail__subject">${escapeHtml(thread.subject)}</div>
          <div class="mail-detail__meta">
            <span>${escapeHtml(thread.senderName)}</span>
            <span>${escapeHtml(thread.senderRole)}</span>
            <span>${escapeHtml(thread.timestamp || formatDisplayDate(thread.createdAt || new Date().toISOString()))}</span>
          </div>
        </div>
        <div class="mail-detail__badges">
          ${renderBadge(thread.priority === "high" ? "Alta prioridad" : thread.priority === "low" ? "Informativo" : "Seguimiento", tone)}
          ${getStatusBadge(thread, mission, agendaItem)}
          ${thread.missionId ? renderBadge("Relacionado con mision", "info") : ""}
          ${conflictCount ? renderBadge(`Choque x${conflictCount}`, "warning") : ""}
          ${agendaItem && (agendaItem.rescheduleCount || 0) > 0 ? renderBadge(`Reprogramada ${agendaItem.rescheduleCount}/${agendaItem.maxReschedules}`, "info") : ""}
          ${trustBand ? renderBadge(`${trustBand.label} · ${relationship.trust}/100`, trustBand.tone) : ""}
          ${reputationBand ? renderBadge(`${reputationBand.label} · ${relationship.reputation}`, reputationBand.tone) : ""}
        </div>
      </header>

      <div class="mail-detail__scroll">
        <section class="mail-detail__overview">
          <div class="mail-detail__overview-grid">
            <article class="mail-summary-card">
              <div class="mail-summary-card__label">Remitente</div>
              <div class="mail-summary-card__identity">
                ${stakeholder ? `<span class="stakeholder-avatar" style="background:${stakeholder.accent || "#71808a"}">${escapeHtml(stakeholder.avatar || stakeholder.name.slice(0, 2).toUpperCase())}</span>` : ""}
                <div>
                  <div class="mail-summary-card__title">${escapeHtml(thread.senderName)}</div>
                  <div class="mail-summary-card__meta">${escapeHtml(thread.senderRole)}</div>
                </div>
              </div>
              ${stakeholder ? `<div class="mail-summary-card__body">${escapeHtml(stakeholder.feedbackStyle)}</div>` : ""}
              ${relationship ? `<div class="mail-summary-card__body">Confianza actual: ${escapeHtml(String(relationship.trust))}/100 · Reputacion: ${escapeHtml(String(relationship.reputation))}</div>` : ""}
            </article>

            <article class="mail-summary-card">
              <div class="mail-summary-card__label">${mission ? "Encargo" : "Contexto"}</div>
              <div class="mail-summary-card__title">${escapeHtml(mission?.title || thread.subject)}</div>
              <div class="mail-summary-card__body">${escapeHtml(mission?.business_goal || thread.preview)}</div>
              <div class="mail-summary-card__meta-group">
                ${mission ? renderBadge(mission.executiveAudience || "Operacion", "info") : ""}
                ${mission ? renderBadge(mission.deadlineLabel || "Sin deadline", missionUnlocked ? "warning" : "neutral") : renderBadge("Solo informativo", "neutral")}
                ${agendaItem ? renderBadge(`Slot ${escapeHtml(String(agendaItem.scheduledForMinutes || "--"))}`, "neutral") : ""}
              </div>
            </article>
          </div>
        </section>

        <div class="mail-detail__messages">
          ${thread.messages
            .map(
              (message, index) => `
                <article class="mail-message">
                  <div class="mail-message__head">
                    <div>
                      <span>${escapeHtml(message.from)}</span>
                      <span>${escapeHtml(message.role || "")}</span>
                    </div>
                    <span>${escapeHtml(`Mensaje ${index + 1}`)}</span>
                  </div>
                  <div class="mail-message__body">${escapeHtml(message.body)}</div>
                </article>
              `
            )
            .join("")}
        </div>

        <section class="mail-detail__attachments-block">
          <div class="mail-section__head">
            <div class="mail-section__title">Adjuntos</div>
            <div class="mail-section__meta">${escapeHtml(thread.attachments?.length ? `${thread.attachments.length} archivo(s)` : "Sin adjuntos")}</div>
          </div>

          <div class="mail-attachment-list">
            ${(thread.attachments || []).length
              ? thread.attachments.map((attachment) => renderAttachmentCard(attachment, missionAccepted, mission?.id || thread.missionId)).join("")
              : `<div class="mail-detail__attachments-empty">Este hilo no incluye archivos adicionales.</div>`}
          </div>
        </section>

        <div class="mail-detail__actionbar">
          <div class="mail-detail__actionnote">${escapeHtml(actionNote)}</div>
          <div class="mail-detail__actions">
            ${thread.threadType === "checkin" && !thread.labels?.includes("answered") ? `<button class="retro-button is-primary" data-action="respond-checkin" data-checkin-id="${escapeHtml(thread.checkinId || "")}">Enviar estado</button>` : ""}
            ${thread.threadType === "meeting" && agendaItem?.status === "pending" ? `<button class="retro-button is-primary" data-action="attend-agenda" data-agenda-id="${escapeHtml(thread.agendaId || "")}">Asistir reunion</button>` : ""}
            ${thread.threadType === "meeting" && canReprogram ? `<button class="retro-button" data-action="reprogram-agenda" data-agenda-id="${escapeHtml(thread.agendaId || "")}">Reprogramar</button>` : ""}
            ${thread.threadType === "meeting" && agendaItem?.status === "pending" ? `<button class="retro-button" data-action="deprioritize-agenda" data-agenda-id="${escapeHtml(thread.agendaId || "")}">Dejar pasar</button>` : ""}
            ${thread.threadType === "followup_task" && !thread.labels?.includes("task_resolved") ? `<button class="retro-button is-primary" data-action="resolve-followup-task" data-followup-task-id="${escapeHtml(thread.followupTaskId || "")}">Resolver follow-up</button>` : ""}
            ${thread.threadType === "mini_deliverable" && !thread.labels?.includes("mini_done") ? `<button class="retro-button is-primary" data-action="resolve-mini-deliverable" data-mini-deliverable-id="${escapeHtml(thread.miniDeliverableId || "")}">Preparar mini-entregable</button>` : ""}
            ${thread.threadType === "business_review" && !thread.labels?.includes("review_resolved") ? (thread.labels?.includes("committee_summary_review")
              ? `<button class="retro-button is-primary" data-action="resolve-business-review" data-business-review-id="${escapeHtml(thread.businessReviewId || "")}" data-business-review-option="approve_committee_cut">Mantener recorte</button><button class="retro-button" data-action="resolve-business-review" data-business-review-id="${escapeHtml(thread.businessReviewId || "")}" data-business-review-option="request_risk_note">Pedir nota de riesgo</button>`
              : `<button class="retro-button is-primary" data-action="resolve-business-review" data-business-review-id="${escapeHtml(thread.businessReviewId || "")}" data-business-review-option="keep_queue_ready">Mantener en cola</button><button class="retro-button" data-action="resolve-business-review" data-business-review-id="${escapeHtml(thread.businessReviewId || "")}" data-business-review-option="bring_forward_now">Traer a foco</button>`) : ""}
            ${mission && !missionAccepted && missionUnlocked ? `<button class="retro-button is-primary" data-action="accept-mission" data-mission-id="${escapeHtml(mission.id)}">Aceptar mision</button>` : ""}
            ${mission && missionAccepted ? `<button class="retro-button is-primary" data-nav="files">Abrir archivos</button>` : ""}
            ${mission && missionAccepted ? `<button class="retro-button" data-nav="terminal">Abrir terminal</button>` : ""}
            ${!mission ? `<button class="retro-button" data-nav="home">Volver al escritorio</button>` : ""}
          </div>
        </div>
      </div>
    </article>
  `;
}
