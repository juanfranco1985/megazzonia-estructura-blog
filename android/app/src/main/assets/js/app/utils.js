export function deepClone(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function titleCase(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function normalizeWhitespace(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function truncate(value, maxLength = 120) {
  const text = String(value ?? "");
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

export function formatCurrency(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "-";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(numeric);
}

export function formatNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "-";
  }
  return new Intl.NumberFormat("en-US").format(numeric);
}

export function formatPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "-";
  }
  return `${numeric.toFixed(1)}%`;
}

export function parseNumber(value) {
  if (value === null || value === undefined) {
    return NaN;
  }
  const normalized = String(value)
    .replace(/\$/g, "")
    .replace(/,/g, "")
    .replace(/\s+/g, "")
    .replace(/[^\d.-]/g, "");
  if (!normalized) {
    return NaN;
  }
  return Number(normalized);
}

export function safeJsonParse(text, fallback = null) {
  try {
    return JSON.parse(text);
  } catch (_error) {
    return fallback;
  }
}

export function createId(prefix = "id") {
  const random = Math.random().toString(36).slice(2, 8);
  const stamp = Date.now().toString(36);
  return `${prefix}_${stamp}_${random}`;
}

export function joinClasses(...parts) {
  return parts.flat().filter(Boolean).join(" ");
}

export function isTruthyString(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return Boolean(normalized) && !["0", "false", "null", "undefined", "n/a", "na", "--"].includes(normalized);
}

export function formatDisplayDate(value) {
  const text = String(value ?? "").trim();
  if (!text) {
    return "-";
  }
  const direct = Date.parse(text);
  if (!Number.isNaN(direct)) {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric"
    }).format(new Date(direct));
  }
  return text;
}

export function normalizeText(value) {
  return normalizeWhitespace(String(value ?? "").toLowerCase());
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
