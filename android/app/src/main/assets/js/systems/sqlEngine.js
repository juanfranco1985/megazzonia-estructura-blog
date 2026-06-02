import { readJsonAsset, readTextAsset } from "../app/assetLoader.js";
import { MISSION_001_WEEK_WINDOW } from "../app/constants.js";
import { parseCsv } from "./csvParser.js";
import { getDatasetDefinition } from "./datasetRegistry.js";
import { deepClone, normalizeText, parseNumber, titleCase } from "../app/utils.js";

function normalizeChannel(value) {
  const text = normalizeText(value);
  if (!text) {
    return "Unknown";
  }
  if (["web", "website", "online", "ecommerce", "e-commerce"].includes(text)) {
    return "Web";
  }
  if (["retail", "store", "in store", "instore"].includes(text)) {
    return "Retail";
  }
  if (["partner", "reseller", "channel partner"].includes(text)) {
    return "Partner";
  }
  if (["direct", "phone"].includes(text)) {
    return "Direct";
  }
  return titleCase(text);
}

function normalizeRegion(value) {
  const text = normalizeText(value);
  if (!text) {
    return "Unknown";
  }
  if (["north", "norte"].includes(text)) {
    return "North";
  }
  if (["south", "sur"].includes(text)) {
    return "South";
  }
  if (["east", "este"].includes(text)) {
    return "East";
  }
  if (["west", "oeste"].includes(text)) {
    return "West";
  }
  if (["southwest", "suroeste"].includes(text)) {
    return "Southwest";
  }
  return titleCase(text);
}

function normalizeCategory(value) {
  const text = normalizeText(value);
  const mapping = {
    saas: "SaaS",
    software: "Software",
    hardware: "Hardware",
    services: "Services",
    consulting: "Consulting",
    accessories: "Accessories"
  };
  return mapping[text] || titleCase(text);
}

function normalizeStatus(value) {
  const text = normalizeText(value);
  if (!text) {
    return "unknown";
  }
  if (["complete", "completed", "paid", "closed", "done"].includes(text)) {
    return "completed";
  }
  if (["pending", "hold", "on hold", "waiting"].includes(text)) {
    return "pending";
  }
  if (["cancelled", "canceled", "refunded", "returned", "void"].includes(text)) {
    return "cancelled";
  }
  return text;
}

function parseMissionDate(value) {
  const text = String(value ?? "").trim();
  if (!text) {
    return null;
  }

  let match = text.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:\s.*)?$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    return toIsoDate(year, month, day);
  }

  match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s.*)?$/);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    return toIsoDate(year, month, day);
  }

  match = text.match(/^([A-Za-z]{3,9})\s+(\d{1,2})\s+(\d{4})$/);
  if (match) {
    const monthName = match[1].slice(0, 3).toLowerCase();
    const monthMap = {
      jan: 1,
      feb: 2,
      mar: 3,
      apr: 4,
      may: 5,
      jun: 6,
      jul: 7,
      aug: 8,
      sep: 9,
      oct: 10,
      nov: 11,
      dec: 12
    };
    const month = monthMap[monthName];
    if (month) {
      return toIsoDate(Number(match[3]), month, Number(match[2]));
    }
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

function toIsoDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toISOString().slice(0, 10);
}

function normalizeCustomerName(value) {
  return titleCase(String(value ?? "").replace(/\s+/g, " ").trim());
}

function normalizeSalesperson(value) {
  return titleCase(String(value ?? "").replace(/\s+/g, " ").trim());
}

function parseAmount(value) {
  const numeric = parseNumber(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function makeRowQuality(flags) {
  if (!flags.length) {
    return "ok";
  }
  return flags.join("; ");
}

function buildCleanRows(records) {
  const cleanRows = [];
  const seenOrderIds = new Set();
  const summary = {
    duplicateRowsRemoved: 0,
    invalidAmountRows: 0,
    invalidDateRows: 0,
    pendingRows: 0,
    cancelledRows: 0
  };

  records.forEach((record, index) => {
    const orderId = String(record.order_id ?? record["order_id"] ?? "").trim();
    if (!orderId) {
      return;
    }

    if (seenOrderIds.has(orderId.toUpperCase())) {
      summary.duplicateRowsRemoved += 1;
      return;
    }
    seenOrderIds.add(orderId.toUpperCase());

    const saleDate = parseMissionDate(record.sale_date);
    const amount = parseAmount(record.amount);
    const statusNorm = normalizeStatus(record.status);
    const rowFlags = [];

    if (!saleDate) {
      summary.invalidDateRows += 1;
      rowFlags.push("invalid_date");
    }

    if (amount === null) {
      summary.invalidAmountRows += 1;
      rowFlags.push("missing_amount");
    }

    if (statusNorm === "pending") {
      summary.pendingRows += 1;
      rowFlags.push("pending");
    }

    if (statusNorm === "cancelled") {
      summary.cancelledRows += 1;
      rowFlags.push("cancelled");
    }

    cleanRows.push({
      order_id: orderId,
      customer_name: normalizeCustomerName(record.customer_name),
      region: normalizeRegion(record.region),
      sale_date: saleDate,
      sales_channel: normalizeChannel(record.sales_channel),
      product_category: normalizeCategory(record.product_category),
      amount,
      salesperson: normalizeSalesperson(record.salesperson),
      status_norm: statusNorm,
      source_row: index + 2,
      row_quality: makeRowQuality(rowFlags)
    });
  });

  return { cleanRows, summary };
}

function buildWeekSummary(cleanRows, weekWindow) {
  const channelTotals = new Map();
  const windowStart = weekWindow.start;
  const windowEnd = weekWindow.end;
  let completedRows = 0;

  for (const row of cleanRows) {
    if (!row.sale_date) {
      continue;
    }
    if (row.sale_date < windowStart || row.sale_date > windowEnd) {
      continue;
    }
    if (row.status_norm !== "completed") {
      continue;
    }
    if (row.amount === null) {
      continue;
    }

    completedRows += 1;
    channelTotals.set(row.sales_channel, (channelTotals.get(row.sales_channel) || 0) + Number(row.amount || 0));
  }

  const ordered = [...channelTotals.entries()]
    .map(([channel, total]) => ({ channel, total }))
    .sort((left, right) => right.total - left.total);

  return {
    completedRows,
    channelTotals: ordered,
    winningChannel: ordered[0]?.channel || "Unknown",
    winningTotal: ordered[0]?.total || 0
  };
}

function createSqlRuntimeInstance(SQL) {
  return new SQL.Database();
}

function quoteIdentifier(value) {
  return `"${String(value).replace(/"/g, "\"\"")}"`;
}

function createTable(db, tableName, columns) {
  const columnSql = columns
    .map((column) => `${quoteIdentifier(column.name)} ${column.type}`)
    .join(", ");
  db.run(`CREATE TABLE ${quoteIdentifier(tableName)} (${columnSql});`);
}

function insertRows(db, tableName, columns, rows) {
  if (!rows.length) {
    return;
  }
  const placeholders = columns.map(() => "?").join(", ");
  const statement = db.prepare(`INSERT INTO ${quoteIdentifier(tableName)} VALUES (${placeholders});`);

  try {
    for (const row of rows) {
      statement.run(columns.map((column) => row[column] ?? null));
    }
  } finally {
    statement.free();
  }
}

function listTables(db) {
  if (!db) {
    return [];
  }
  const result = db.exec("SELECT name FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' ORDER BY name;");
  const rows = result[0]?.values || [];
  return rows.map((value) => value[0]);
}

export function createSqlRuntime() {
  let sqlFactory = null;
  let db = null;
  let loadedMission = null;
  let runtimeSummary = null;
  let runtimeSnapshot = null;

  async function init() {
    if (!sqlFactory) {
      sqlFactory = await window.initSqlJs({
        locateFile: (file) => `libs/${file}`
      });
    }
    if (!db) {
      db = createSqlRuntimeInstance(sqlFactory);
    }
    return runtimeApi;
  }

  async function loadMissionDataset(missionId) {
    await init();
    const datasetDefinition = getDatasetDefinition(missionId);
    if (!datasetDefinition) {
      throw new Error(`Unknown dataset: ${missionId}`);
    }

    const [mission, schema, csvText] = await Promise.all([
      readJsonAsset(datasetDefinition.assets.find((asset) => asset.id === "mission_json")?.path || ""),
      readJsonAsset(datasetDefinition.assets.find((asset) => asset.id === "schema_json")?.path || ""),
      readTextAsset(datasetDefinition.assets.find((asset) => asset.id === "sales_dirty_csv")?.path || "")
    ]);

    const weekWindow = mission?.week_window || MISSION_001_WEEK_WINDOW;
    const parsed = parseCsv(csvText);
    const rawRows = parsed.records.map((record, index) => ({
      ...record,
      source_row: index + 2
    }));
    const { cleanRows, summary } = buildCleanRows(parsed.records);
    const weekSummary = buildWeekSummary(cleanRows, weekWindow);

    if (db && typeof db.close === "function") {
      db.close();
    }
    db = createSqlRuntimeInstance(sqlFactory);

    createTable(db, "sales_raw", [...parsed.headers.map((header) => ({ name: header, type: "TEXT" })), { name: "source_row", type: "INTEGER" }]);
    insertRows(db, "sales_raw", [...parsed.headers, "source_row"], rawRows);

    createTable(db, "sales_clean", [
      { name: "order_id", type: "TEXT" },
      { name: "customer_name", type: "TEXT" },
      { name: "region", type: "TEXT" },
      { name: "sale_date", type: "TEXT" },
      { name: "sales_channel", type: "TEXT" },
      { name: "product_category", type: "TEXT" },
      { name: "amount", type: "REAL" },
      { name: "salesperson", type: "TEXT" },
      { name: "status_norm", type: "TEXT" },
      { name: "source_row", type: "INTEGER" },
      { name: "row_quality", type: "TEXT" }
    ]);
    insertRows(db, "sales_clean", [
      "order_id",
      "customer_name",
      "region",
      "sale_date",
      "sales_channel",
      "product_category",
      "amount",
      "salesperson",
      "status_norm",
      "source_row",
      "row_quality"
    ], cleanRows);

    runtimeSummary = {
      missionId,
      rawRows: rawRows.length,
      cleanRows: cleanRows.length,
      duplicatesRemoved: summary.duplicateRowsRemoved,
      invalidAmountRows: summary.invalidAmountRows,
      invalidDateRows: summary.invalidDateRows,
      pendingRows: summary.pendingRows,
      cancelledRows: summary.cancelledRows,
      completedRows: weekSummary.completedRows,
      channelTotals: weekSummary.channelTotals,
      winningChannel: weekSummary.winningChannel,
      winningTotal: weekSummary.winningTotal,
      weekWindow: deepClone(weekWindow),
      qualityNotes: [
        `Removed ${summary.duplicateRowsRemoved} duplicate row(s).`,
        `${summary.invalidAmountRows} row(s) contained missing or invalid amounts.`,
        `${summary.invalidDateRows} row(s) had invalid dates.`,
        `${summary.pendingRows} row(s) were pending.`,
        `${summary.cancelledRows} row(s) were cancelled or refunded.`
      ]
    };

    runtimeSnapshot = {
      mission,
      schema,
      rawRows,
      cleanRows,
      summary: runtimeSummary,
      rawPreview: rawRows.slice(0, datasetDefinition.previewLimit || 6),
      cleanPreview: cleanRows.slice(0, datasetDefinition.previewLimit || 6),
      tables: listTables(db)
    };
    loadedMission = missionId;
    return getRuntimeSnapshot();
  }

  function runQuery(sql) {
    if (!db) {
      throw new Error("SQL runtime is not initialized.");
    }

    const resultSets = db.exec(sql);
    const resultSet = resultSets[0] || { columns: [], values: [] };
    const columns = resultSet.columns || [];
    const rows = (resultSet.values || []).map((values) => {
      const record = {};
      columns.forEach((column, index) => {
        record[column] = values[index];
      });
      return record;
    });

    return {
      columns,
      rows,
      values: resultSet.values || [],
      tables: listTables(db),
      summary: runtimeSummary
    };
  }

  function getTables() {
    return listTables(db);
  }

  function getRuntimeSnapshot() {
    return runtimeSnapshot ? deepClone(runtimeSnapshot) : null;
  }

  function getSummary() {
    return runtimeSummary ? deepClone(runtimeSummary) : null;
  }

  function reset() {
    if (db && typeof db.close === "function") {
      db.close();
    }
    db = sqlFactory ? createSqlRuntimeInstance(sqlFactory) : null;
    loadedMission = null;
    runtimeSummary = null;
    runtimeSnapshot = null;
  }

  const runtimeApi = {
    init,
    loadMissionDataset,
    runQuery,
    reset,
    getTables,
    getRuntimeSnapshot,
    getSummary,
    getLoadedMissionId() {
      return loadedMission;
    }
  };

  return runtimeApi;
}
