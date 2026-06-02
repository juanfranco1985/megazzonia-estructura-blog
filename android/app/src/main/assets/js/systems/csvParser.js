export function parseCsv(text) {
  const source = String(text ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows = [];
  let currentRow = [];
  let currentCell = "";
  let inQuotes = false;

  function pushCell() {
    currentRow.push(currentCell);
    currentCell = "";
  }

  function pushRow() {
    if (currentRow.length || currentCell.length) {
      pushCell();
      rows.push(currentRow);
    }
    currentRow = [];
    currentCell = "";
  }

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        currentCell += '"';
        index += 1;
        continue;
      }
      if (char === '"') {
        inQuotes = false;
        continue;
      }
      currentCell += char;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      pushCell();
      continue;
    }

    if (char === "\n") {
      pushRow();
      continue;
    }

    currentCell += char;
  }

  if (currentCell.length || currentRow.length) {
    pushRow();
  }

  if (!rows.length) {
    return {
      headers: [],
      records: []
    };
  }

  const headers = rows[0].map((header) => String(header ?? "").trim());
  const records = rows
    .slice(1)
    .filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""))
    .map((row) => {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = row[index] ?? "";
      });
      return record;
    });

  return {
    headers,
    records
  };
}

export function serializeCsv(records, headers) {
  const outputHeaders = headers || (records[0] ? Object.keys(records[0]) : []);
  const lines = [outputHeaders.join(",")];

  for (const record of records) {
    const line = outputHeaders.map((header) => {
      const value = record[header];
      if (value === null || value === undefined) {
        return "";
      }
      const text = String(value);
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    }).join(",");
    lines.push(line);
  }

  return lines.join("\n");
}
