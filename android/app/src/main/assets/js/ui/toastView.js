import { escapeHtml, joinClasses } from "../app/utils.js";
import { getVisibleNotifications } from "../systems/notificationSystem.js";

export function renderToasts(state) {
  const visible = getVisibleNotifications(state).slice(0, 3);

  return visible
    .map(
      (item) => `
        <article class="${joinClasses("toast", `toast--${item.level || "info"}`)}" role="status" aria-live="polite">
          <div class="toast__head">
            <div class="toast__title">${escapeHtml(item.title)}</div>
            <button
              class="toast__close"
              type="button"
              data-action="dismiss-notification"
              data-notification-id="${escapeHtml(item.id)}"
              aria-label="Dismiss notification"
            >x</button>
          </div>
          <div class="toast__message">${escapeHtml(item.message)}</div>
        </article>
      `
    )
    .join("");
}
