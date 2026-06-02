import { escapeHtml } from "../app/utils.js";

export function renderModal(state) {
  if (!state.ui.modal) {
    return "";
  }

  const modal = state.ui.modal;
  return `
    <div class="modal-backdrop">
      <div class="modal-card">
        <div class="modal-card__title">${escapeHtml(modal.title || "Modal")}</div>
        <div class="modal-card__body">${escapeHtml(modal.body || "")}</div>
        <div class="modal-card__actions">
          ${modal.actions
            ? modal.actions
                .map(
                  (action) => `
                    <button class="retro-button ${action.primary ? "is-primary" : ""}" data-action="${escapeHtml(action.id)}">${escapeHtml(action.label)}</button>
                  `
                )
                .join("")
            : `<button class="retro-button" data-action="close-modal">Close</button>`}
        </div>
      </div>
    </div>
  `;
}
