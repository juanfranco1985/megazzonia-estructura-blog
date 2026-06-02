import { escapeHtml, formatCurrency, formatDisplayDate, formatNumber, formatPercent, joinClasses, titleCase, truncate } from "../app/utils.js";

export function renderBadge(label, tone = "neutral", extraClass = "") {
  return `<span class="${joinClasses("badge", `badge--${tone}`, extraClass)}">${escapeHtml(label)}</span>`;
}

export function renderStatCard({ label, value, note, tone = "neutral" }) {
  return `
    <article class="stat-card stat-card--${tone}">
      <div class="stat-card__label">${escapeHtml(label)}</div>
      <div class="stat-card__value">${escapeHtml(value)}</div>
      ${note ? `<div class="stat-card__note">${escapeHtml(note)}</div>` : ""}
    </article>
  `;
}

export function renderProgressBar(value, label, tone = "neutral") {
  const percent = Number.isFinite(Number(value)) ? Math.max(0, Math.min(100, Number(value))) : 0;
  return `
    <div class="progress-block">
      <div class="progress-block__head">
        <span>${escapeHtml(label)}</span>
        <span>${formatPercent(percent)}</span>
      </div>
      <div class="progress-bar progress-bar--${tone}">
        <span style="width:${percent}%;"></span>
      </div>
    </div>
  `;
}

export function renderKeyValueList(items) {
  return `
    <dl class="key-value-list">
      ${items
        .map(
          (item) => `
            <div class="key-value-list__row">
              <dt>${escapeHtml(item.label)}</dt>
              <dd>${escapeHtml(item.value)}</dd>
            </div>
          `
        )
        .join("")}
    </dl>
  `;
}

export function renderChipList(items, tone = "neutral") {
  return `
    <div class="chip-list chip-list--${tone}">
      ${items.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join("")}
    </div>
  `;
}

export function renderEmptyState(title, body, action = "") {
  return `
    <div class="empty-state">
      <div class="empty-state__title">${escapeHtml(title)}</div>
      <div class="empty-state__body">${escapeHtml(body)}</div>
      ${action ? `<div class="empty-state__action">${action}</div>` : ""}
    </div>
  `;
}

function formatCellValue(column, value) {
  const isEmpty = value === null || value === undefined || value === "";
  const isNumeric = typeof value === "number" && Number.isFinite(value);
  const isDate = !isEmpty && typeof value === "string" && /^\d{4}-\d{2}-\d{2}(?:[ T].*)?$/.test(String(value));
  const columnKey = String(column || "").toLowerCase();

  if (isEmpty) {
    return {
      display: "-",
      isEmpty,
      isNumeric: false,
      isDate: false
    };
  }

  if (isDate) {
    return {
      display: formatDisplayDate(value),
      isEmpty,
      isNumeric: false,
      isDate: true
    };
  }

  if (isNumeric) {
    const treatAsCount = /count|orders|rows|source_row|week|score|prestige|completion|missions|issues|notes/i.test(columnKey)
      || Number.isInteger(value);
    return {
      display: treatAsCount ? formatNumber(value) : formatCurrency(value),
      isEmpty,
      isNumeric: true,
      isDate: false
    };
  }

  return {
    display: value,
    isEmpty,
    isNumeric: false,
    isDate: false
  };
}

export function renderTable(rows, options = {}) {
  if (!rows || !rows.length) {
    return renderEmptyState(options.emptyTitle || "No results", options.emptyBody || "Run a query to populate this table.");
  }

  const columns = options.columns || Object.keys(rows[0]);
  const limit = options.limit || rows.length;
  const visibleRows = rows.slice(0, limit);
  const variantClass = options.variant ? `table-shell--${options.variant}` : "";

  return `
    <div class="${joinClasses("table-shell", variantClass)}">
      <table class="${joinClasses("data-table", options.variant && `data-table--${options.variant}`)}">
        <thead>
          <tr>
            ${columns.map((column) => `<th scope="col">${escapeHtml(titleCase(column.replace(/_/g, " ")))}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${visibleRows
            .map(
              (row) => `
                <tr>
                  ${columns
                    .map((column) => {
                      const { display, isEmpty, isNumeric, isDate } = formatCellValue(column, row[column]);
                      return `<td class="${joinClasses(
                        "data-table__cell",
                        isNumeric && "data-table__cell--numeric",
                        isDate && "data-table__cell--date",
                        isEmpty && "data-table__cell--empty"
                      )}" data-column="${escapeHtml(column)}">${escapeHtml(display ?? "")}</td>`;
                    })
                    .join("")}
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

export function renderList(items, options = {}) {
  if (!items || !items.length) {
    return renderEmptyState(options.emptyTitle || "Nothing here yet", options.emptyBody || "The section is currently empty.");
  }

  return `
    <div class="list-shell">
      ${items.map((item) => renderListItem(item, options)).join("")}
    </div>
  `;
}

export function renderListItem(item, options = {}) {
  const tone = item.tone || options.tone || "neutral";
  return `
    <article class="${joinClasses("list-item", item.active && "is-active", item.unread && "is-unread")}">
      <div class="list-item__head">
        <div class="list-item__title">${escapeHtml(item.title || item.name || "Item")}</div>
        ${item.badge ? renderBadge(item.badge, tone) : ""}
      </div>
      ${item.subtitle ? `<div class="list-item__subtitle">${escapeHtml(item.subtitle)}</div>` : ""}
      ${item.body ? `<div class="list-item__body">${escapeHtml(truncate(item.body, options.bodyLength || 120))}</div>` : ""}
    </article>
  `;
}
