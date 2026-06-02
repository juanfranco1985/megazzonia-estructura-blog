(function (global) {
  function splitTopLevel(input, separator) {
    const output = [];
    let buffer = "";
    let depth = 0;
    let quote = null;

    for (let index = 0; index < input.length; index += 1) {
      const char = input[index];
      const next = input[index + 1];

      if (quote) {
        buffer += char;
        if (char === quote && next === quote) {
          buffer += next;
          index += 1;
          continue;
        }
        if (char === quote) {
          quote = null;
        }
        continue;
      }

      if (char === "'" || char === '"') {
        quote = char;
        buffer += char;
        continue;
      }

      if (char === "(") {
        depth += 1;
        buffer += char;
        continue;
      }

      if (char === ")") {
        depth = Math.max(0, depth - 1);
        buffer += char;
        continue;
      }

      if (depth === 0 && char === separator) {
        output.push(buffer.trim());
        buffer = "";
        continue;
      }

      buffer += char;
    }

    if (buffer.trim()) {
      output.push(buffer.trim());
    }
    return output;
  }

  function findClauseIndex(sql, clause) {
    const parts = String(clause || "")
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    function isBoundary(char) {
      return !char || !/[a-z0-9_]/i.test(char);
    }

    function matchClauseAt(index) {
      let cursor = index;
      for (const part of parts) {
        while (cursor < sql.length && /\s/.test(sql[cursor])) {
          cursor += 1;
        }
        if (sql.slice(cursor, cursor + part.length).toLowerCase() !== part) {
          return -1;
        }
        cursor += part.length;
      }
      return cursor;
    }

    function clauseStart(index) {
      let cursor = index;
      while (cursor < sql.length && /\s/.test(sql[cursor])) {
        cursor += 1;
      }
      return cursor;
    }

    let depth = 0;
    let quote = null;
    for (let index = 0; index < sql.length; index += 1) {
      const char = sql[index];
      const next = sql[index + 1];

      if (quote) {
        if (char === quote && next === quote) {
          index += 1;
          continue;
        }
        if (char === quote) {
          quote = null;
        }
        continue;
      }

      if (char === "'" || char === '"') {
        quote = char;
        continue;
      }
      if (char === "(") {
        depth += 1;
        continue;
      }
      if (char === ")") {
        depth = Math.max(0, depth - 1);
        continue;
      }

      if (depth === 0 && isBoundary(sql[index - 1])) {
        const end = matchClauseAt(index);
        if (end >= 0 && isBoundary(sql[end])) {
          return clauseStart(index);
        }
      }
    }

    return -1;
  }

  function normalizeSql(sql) {
    return String(sql || "").trim().replace(/;\s*$/, "");
  }

  function compileExpression(expression) {
    let js = String(expression || "").trim();

    js = js.replace(/CAST\s*\(\s*(.*?)\s+AS\s+([A-Z]+)\s*\)/gi, (_match, value, type) => {
      return `fn.cast(${value}, '${String(type).toUpperCase()}')`;
    });

    js = js
      .replace(/\bIS\s+NOT\s+NULL\b/gi, "!= null")
      .replace(/\bIS\s+NULL\b/gi, "== null")
      .replace(/\bAND\b/gi, "&&")
      .replace(/\bOR\b/gi, "||")
      .replace(/\bNOT\b/gi, "!");

    js = js.replace(/<>/g, "!=");
    js = js.replace(/(^|[^<>=!])=(?!=)/g, "$1==");

    const functionMap = [
      "LOWER",
      "UPPER",
      "TRIM",
      "ROUND",
      "ABS",
      "LENGTH",
      "REPLACE",
      "COALESCE",
      "NULLIF",
      "DATE"
    ];
    for (const name of functionMap) {
      const pattern = new RegExp(`\\b${name}\\s*\\(`, "gi");
      js = js.replace(pattern, `fn.${name.toLowerCase()}(`);
    }

    js = js.replace(/\bNULL\b/gi, "null");
    js = js.replace(/\bTRUE\b/gi, "true");
    js = js.replace(/\bFALSE\b/gi, "false");

    return js;
  }

  function buildHelpers() {
    return {
      lower(value) {
        return String(value ?? "").toLowerCase();
      },
      upper(value) {
        return String(value ?? "").toUpperCase();
      },
      trim(value) {
        return String(value ?? "").trim();
      },
      round(value, precision = 0) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) {
          return null;
        }
        const factor = 10 ** Number(precision);
        return Math.round(numeric * factor) / factor;
      },
      abs(value) {
        return Math.abs(Number(value));
      },
      length(value) {
        return String(value ?? "").length;
      },
      replace(value, search, replacement) {
        return String(value ?? "").split(String(search)).join(String(replacement));
      },
      coalesce(...values) {
        for (const value of values) {
          if (value !== null && value !== undefined && value !== "") {
            return value;
          }
        }
        return null;
      },
      nullif(value, compareValue) {
        return value === compareValue ? null : value;
      },
      date(value) {
        if (value === null || value === undefined) {
          return null;
        }
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
          return String(value);
        }
        return parsed.toISOString().slice(0, 10);
      },
      cast(value, type) {
        const normalizedType = String(type || "").trim().toUpperCase();
        if (normalizedType === "REAL" || normalizedType === "FLOAT" || normalizedType === "NUMERIC") {
          const numeric = Number(value);
          return Number.isFinite(numeric) ? numeric : null;
        }
        if (normalizedType === "INTEGER" || normalizedType === "INT") {
          const numeric = parseInt(value, 10);
          return Number.isFinite(numeric) ? numeric : null;
        }
        return value === null || value === undefined ? null : String(value);
      }
    };
  }

  function compileValue(expression, row) {
    const js = compileExpression(expression);
    const fn = buildHelpers();
    const runner = new Function("row", "fn", `with (row) { return (${js}); }`);
    return runner(row, fn);
  }

  function compilePredicate(predicate, row) {
    if (!predicate) {
      return true;
    }
    const js = compileExpression(predicate);
    const fn = buildHelpers();
    const runner = new Function("row", "fn", `with (row) { return Boolean(${js}); }`);
    return Boolean(runner(row, fn));
  }

  function splitOrderExpression(expression) {
    const trimmed = String(expression || "").trim();
    const match = trimmed.match(/^(.*?)(?:\s+(ASC|DESC))?$/i);
    return {
      expression: match && match[1] ? match[1].trim() : trimmed,
      direction: ((match && match[2]) || "ASC").toUpperCase()
    };
  }

  class MiniSqlDatabase {
    constructor() {
      this.tables = new Map();
    }

    registerTable(name, columns, rows) {
      this.tables.set(String(name), {
        name: String(name),
        columns: [...columns],
        rows: rows.map((row) => ({ ...row }))
      });
    }

    getTable(name) {
      return this.tables.get(String(name)) || null;
    }

    listTables() {
      return [...this.tables.values()].map((table) => ({
        name: table.name,
        columns: [...table.columns],
        rowCount: table.rows.length
      }));
    }

    exec(sql) {
      const statement = normalizeSql(sql);
      if (!/^select\s/i.test(statement)) {
        throw new Error("MiniSqlDatabase only supports SELECT statements in this MVP.");
      }

      const fromIndex = findClauseIndex(statement, "FROM");
      if (fromIndex < 0) {
        throw new Error("Missing FROM clause.");
      }

      const whereIndex = findClauseIndex(statement, "WHERE");
      const groupIndex = findClauseIndex(statement, "GROUP BY");
      const orderIndex = findClauseIndex(statement, "ORDER BY");
      const limitIndex = findClauseIndex(statement, "LIMIT");

      const selectClause = statement.slice(6, fromIndex).trim();
      const fromEnd = [whereIndex, groupIndex, orderIndex, limitIndex]
        .filter((index) => index > fromIndex)
        .sort((a, b) => a - b)[0] ?? statement.length;
      const fromClause = statement.slice(fromIndex + 4, fromEnd).trim();

      const whereEnd = [groupIndex, orderIndex, limitIndex]
        .filter((index) => index > whereIndex)
        .sort((a, b) => a - b)[0] ?? statement.length;
      const whereClause = whereIndex >= 0 ? statement.slice(whereIndex + 5, whereEnd).trim() : "";

      const groupEnd = [orderIndex, limitIndex]
        .filter((index) => index > groupIndex)
        .sort((a, b) => a - b)[0] ?? statement.length;
      const groupClause = groupIndex >= 0 ? statement.slice(groupIndex + 8, groupEnd).trim() : "";

      const orderEnd = limitIndex > orderIndex ? limitIndex : statement.length;
      const orderClause = orderIndex >= 0 ? statement.slice(orderIndex + 8, orderEnd).trim() : "";
      const limitClause = limitIndex >= 0 ? statement.slice(limitIndex + 5).trim() : "";

      const tableName = fromClause.split(/\s+/)[0];
      const table = this.getTable(tableName);
      if (!table) {
        throw new Error(`Unknown table: ${tableName}`);
      }

      const filteredRows = table.rows.filter((row) => compilePredicate(whereClause, row));
      const selectItems = splitTopLevel(selectClause, ",");
      const groupExpressions = groupClause ? splitTopLevel(groupClause, ",").map((expr) => expr.trim()) : [];
      const hasAggregates = selectItems.some((item) => /\b(SUM|COUNT|AVG|MIN|MAX)\s*\(/i.test(item));
      const needsGrouping = hasAggregates || groupExpressions.length > 0;

      function parseSelectItem(item) {
        const match = item.match(/^(.*?)(?:\s+AS\s+([A-Za-z_][\w]*))$/i);
        if (match) {
          return {
            expression: match[1].trim(),
            alias: match[2].trim()
          };
        }

        if (item.trim() === "*") {
          return { expression: "*", alias: "*" };
        }

        return {
          expression: item.trim(),
          alias: null
        };
      }

      const parsedSelectItems = selectItems.map(parseSelectItem);
      const resultDescriptors = parsedSelectItems.map((item) => {
        const alias = item.alias || item.expression.replace(/[^A-Za-z0-9_]+/g, "_").replace(/^_+|_+$/g, "").toLowerCase() || "value";
        return {
          ...item,
          alias
        };
      });

      function aggregateRows(rows) {
        const aggregated = {};
        for (const descriptor of resultDescriptors) {
          const expression = descriptor.expression;
          if (expression === "*") {
            Object.assign(aggregated, rows[0] || {});
            continue;
          }

          const sumMatch = expression.match(/^SUM\s*\((.*)\)$/i);
          const countMatch = expression.match(/^COUNT\s*\(\s*\*\s*\)$/i);
          const avgMatch = expression.match(/^AVG\s*\((.*)\)$/i);
          const minMatch = expression.match(/^MIN\s*\((.*)\)$/i);
          const maxMatch = expression.match(/^MAX\s*\((.*)\)$/i);

          if (sumMatch) {
            aggregated[descriptor.alias] = rows.reduce((total, row) => total + Number(compileValue(sumMatch[1], row) || 0), 0);
            continue;
          }
          if (countMatch) {
            aggregated[descriptor.alias] = rows.length;
            continue;
          }
          if (avgMatch) {
            const values = rows.map((row) => Number(compileValue(avgMatch[1], row) || 0));
            aggregated[descriptor.alias] = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
            continue;
          }
          if (minMatch) {
            const values = rows.map((row) => compileValue(minMatch[1], row));
            aggregated[descriptor.alias] = values.length ? values.reduce((a, b) => (a < b ? a : b)) : null;
            continue;
          }
          if (maxMatch) {
            const values = rows.map((row) => compileValue(maxMatch[1], row));
            aggregated[descriptor.alias] = values.length ? values.reduce((a, b) => (a > b ? a : b)) : null;
            continue;
          }

          aggregated[descriptor.alias] = compileValue(expression, rows[0] || {});
        }
        return aggregated;
      }

      const resultRows = [];
      if (needsGrouping) {
        const groupingExpressions = groupExpressions.length ? groupExpressions : ["__all__"];
        const groups = new Map();

        for (const row of filteredRows) {
          const keyValues = groupingExpressions.map((expression) => {
            if (expression === "__all__") {
              return "__all__";
            }
            return compileValue(expression, row);
          });
          const key = JSON.stringify(keyValues);
          const bucket = groups.get(key) || [];
          bucket.push(row);
          groups.set(key, bucket);
        }

        for (const rows of groups.values()) {
          resultRows.push(aggregateRows(rows));
        }
      } else {
        for (const row of filteredRows) {
          const record = {};
          for (const descriptor of resultDescriptors) {
            if (descriptor.expression === "*") {
              Object.assign(record, row);
            } else {
              record[descriptor.alias] = compileValue(descriptor.expression, row);
            }
          }
          resultRows.push(record);
        }
      }

      if (orderClause) {
        const orderExpressions = splitTopLevel(orderClause, ",").map(splitOrderExpression);
        resultRows.sort((left, right) => {
          for (const entry of orderExpressions) {
            const leftValue = compileValue(entry.expression, left);
            const rightValue = compileValue(entry.expression, right);
            if (leftValue < rightValue) {
              return entry.direction === "DESC" ? 1 : -1;
            }
            if (leftValue > rightValue) {
              return entry.direction === "DESC" ? -1 : 1;
            }
          }
          return 0;
        });
      }

      if (limitClause) {
        const limit = Number.parseInt(limitClause, 10);
        if (Number.isFinite(limit)) {
          resultRows.splice(limit);
        }
      }

      const resultColumns = resultRows.length ? Object.keys(resultRows[0]) : resultDescriptors.map((descriptor) => descriptor.alias);
      return [
        {
          columns: resultColumns,
          values: resultRows.map((row) => resultColumns.map((column) => row[column]))
        }
      ];
    }

    close() {
      this.tables.clear();
    }
  }

  function initSqlJs() {
    return Promise.resolve({
      Database: MiniSqlDatabase
    });
  }

  global.initSqlJs = initSqlJs;
  global.MiniSqlDatabase = MiniSqlDatabase;
})(typeof window !== "undefined" ? window : globalThis);
