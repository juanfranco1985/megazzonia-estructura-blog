export const APP_NAME = "Laboratorio Megazzonia";
export const APP_TAGLINE = "Bitacora de proyectos, simuladores y prototipos";
export const STORAGE_KEY = "lm.portfolio.state.v1";

export const VIEW_KEYS = {
  HOME: "home",
  PROJECTS: "projects",
  INBOX: "inbox",
  FILES: "files",
  TERMINAL: "terminal",
  REPORT: "report",
  CAREER: "career"
};

export const DEFAULT_PLAYER = {
  name: "Jordan Vega",
  role: "Junior Data Analyst"
};

export const DEFAULT_SIM_CLOCK = {
  week: 1,
  dayLabel: "Monday",
  timeLabel: "08:40",
  dateLabel: "2026-04-13"
};

export const DEFAULT_TERMINAL_QUERY = `SELECT
  sales_channel,
  SUM(amount) AS total_amount,
  COUNT(*) AS orders
FROM sales_clean
WHERE status_norm = 'completed'
  AND sale_date >= '2026-04-06'
  AND sale_date <= '2026-04-12'
GROUP BY sales_channel
ORDER BY total_amount DESC;`;

export const REPORT_METRICS = [
  { id: "total_amount", label: "Total vendido", description: "Suma de importes por canal" },
  { id: "orders", label: "Pedidos", description: "Cantidad de pedidos por canal" },
  { id: "issue_orders", label: "Pedidos problemáticos", description: "Cantidad de pedidos con fricción operativa" }
];

export const CHART_TYPES = [
  { id: "bar", label: "Barra" },
  { id: "doughnut", label: "Doughnut" },
  { id: "line", label: "Línea" }
];

export const NOTIFICATION_LEVELS = {
  INFO: "info",
  SUCCESS: "success",
  WARNING: "warning",
  ERROR: "error"
};

export const THEME_COLORS = {
  blue: "#4f6e83",
  blueDeep: "#2f4b5b",
  green: "#6f8f7d",
  panel: "#d2d6d2",
  text: "#172024"
};

export const MISSION_001_ID = "mission_001_sales_cleaning";
export const MISSION_001_WEEK_WINDOW = {
  start: "2026-04-06",
  end: "2026-04-12"
};
