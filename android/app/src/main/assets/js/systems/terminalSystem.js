import { DEFAULT_TERMINAL_QUERY } from "../app/constants.js";
import { createId, truncate } from "../app/utils.js";
import { advanceSimulationTime } from "./clockEngine.js";

export function setTerminalQuery(store, query) {
  store.setState((state) => {
    state.ui.terminalQuery = query;
  }, { silent: true });
}

export function resetTerminalQuery(store) {
  setTerminalQuery(store, DEFAULT_TERMINAL_QUERY);
}

export function buildTerminalModel(state) {
  const summary = state.analysis.summary || {};
  const tables = state.analysis.tables || [];
  const activeTable = tables.find((table) => table.name === "sales_clean") || tables[0] || null;
  return {
    query: state.ui.terminalQuery,
    history: [...state.terminal.queryHistory],
    lastResult: state.terminal.lastResult,
    lastError: state.terminal.lastError,
    lastQueryText: state.terminal.lastQueryText || "",
    tables,
    summary,
    engineReady: Boolean(state.analysis.databaseReady),
    activeTableName: activeTable?.name || "sales_clean",
    loadedRows: summary.rawRows || 0,
    cleanRows: summary.cleanRows || 0,
    lastRunRows: state.terminal.lastResult?.rows?.length || 0,
    historyCount: state.terminal.queryHistory.length
  };
}

export function runTerminalQuery(store, sqlRuntime, query) {
  const sql = String(query || "").trim();
  if (!sql) {
    store.setState((state) => {
      state.terminal.lastError = "Query vacía.";
      state.terminal.lastResult = null;
    }, { silent: true });
    return {
      ok: false,
      error: new Error("Query vacía.")
    };
  }

  try {
    const result = sqlRuntime.runQuery(sql);
    store.setState((state) => {
      state.terminal.lastError = null;
      state.terminal.lastResult = result;
      state.terminal.lastQueryText = sql;
      state.terminal.queryHistory.unshift({
        id: createId("query"),
        sql,
        preview: truncate(sql.replace(/\s+/g, " "), 96),
        rowCount: result.rows.length,
        createdAt: new Date().toISOString()
      });
      state.terminal.queryHistory = state.terminal.queryHistory.slice(0, 12);
      state.analysis.databaseReady = true;
      state.analysis.tables = result.tables || state.analysis.tables;
      state.analysis.summary = result.summary || state.analysis.summary;
    }, { silent: true });

    advanceSimulationTime(store, 'run_query');
    return {
      ok: true,
      result
    };
  } catch (error) {
    store.setState((state) => {
      state.terminal.lastError = error.message || String(error);
      state.terminal.lastResult = null;
      state.terminal.lastQueryText = sql;
      state.terminal.queryHistory.unshift({
        id: createId("query"),
        sql,
        preview: truncate(sql.replace(/\s+/g, " "), 96),
        rowCount: 0,
        createdAt: new Date().toISOString(),
        failed: true
      });
      state.terminal.queryHistory = state.terminal.queryHistory.slice(0, 12);
    }, { silent: true });

    return {
      ok: false,
      error
    };
  }
}

export function formatResultTable(result) {
  if (!result || !result.columns || !result.rows) {
    return [];
  }
  return result.rows.map((row) => {
    const record = {};
    result.columns.forEach((column, index) => {
      record[column] = row[index];
    });
    return record;
  });
}
