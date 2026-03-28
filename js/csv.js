/** Minimal CSV parsing with quoted fields (no external deps). */
export function parseCSV(text) {
  const rows = [];
  let i = 0;
  const len = text.length;

  function readLine() {
    const cells = [];
    let cur = '';
    let inQuote = false;
    while (i < len) {
      const c = text[i];
      if (inQuote) {
        if (c === '"') {
          if (text[i + 1] === '"') {
            cur += '"';
            i += 2;
            continue;
          }
          inQuote = false;
          i++;
          continue;
        }
        cur += c;
        i++;
        continue;
      }
      if (c === '"') {
        inQuote = true;
        i++;
        continue;
      }
      if (c === ',') {
        cells.push(cur);
        cur = '';
        i++;
        continue;
      }
      if (c === '\r') {
        i++;
        continue;
      }
      if (c === '\n') {
        i++;
        break;
      }
      cur += c;
      i++;
    }
    cells.push(cur);
    return cells;
  }

  while (i < len) {
    const line = readLine();
    if (line.some((cell) => cell.length > 0)) rows.push(line);
  }
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim());
  const out = [];
  for (let r = 1; r < rows.length; r++) {
    const obj = {};
    headers.forEach((h, j) => {
      obj[h] = rows[r][j] != null ? String(rows[r][j]).trim() : '';
    });
    out.push(obj);
  }
  return out;
}
