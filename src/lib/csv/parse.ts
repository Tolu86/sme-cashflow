export interface CsvRow {
  [header: string]: string;
}

export interface TransactionDraft {
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  raw: CsvRow;
}

export function parseCsv(text: string): CsvRow[] {
  const rows: CsvRow[] = [];
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (!lines.length) return rows;

  const header = parseLine(lines[0]);
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cells = parseLine(line);
    if (cells.length === 0 || cells.every((c) => c.trim() === "")) continue;
    const obj: CsvRow = {};
    header.forEach((h, idx) => {
      obj[(h || `col${idx}`).trim()] = (cells[idx] ?? "").trim();
    });
    rows.push(obj);
  }
  return rows;
}

function parseLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

const DATE_RE = /^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}$/;

function normalizeDate(value: string): string {
  const v = value.trim();
  if (!v) return "";
  const m = /^(\d{1,4})[-/](\d{1,2})[-/](\d{1,4})$/.exec(v);
  if (!m) return "";
  const [, a, b, c] = m;
  let year: string;
  let month: string;
  let day: string;
  if (a.length === 4) {
    year = a;
    month = b;
    day = c;
  } else if (c.length === 4) {
    year = c;
    month = a;
    day = b;
  } else {
    // ambiguous: assume Y-M-D or D-M-Y; use Y-M-D if first <=12 plausible
    year = a;
    month = b;
    day = c;
  }
  if (Number(month) > 12) {
    [month, day] = [day, month];
  }
  if (!day || Number(day) > 31) {
    [day, month] = [month, day];
  }
  year = year.padStart(4, "0");
  month = month.padStart(2, "0");
  day = day.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeAmount(value: string): number | null {
  const v = value.trim().replace(/[\s,]/g, "").replace(/[^\d.-]/g, "");
  if (!v) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

const DATE_HEADER_RE = /(date|fecha|datum)/i;
const DESC_HEADER_RE = /(descr|memo|narration|payee|details|particular|merchant|note|info|text|reference)/i;
const IN_HEADER_RE = /(amount|inflow|deposit|credit|money in)/i;
const OUT_HEADER_RE = /(debit|outflow|withdrawal|payment|money out)/i;
const BAL_HEADER_RE = /(balance|saldo)/i;

export function toDrafts(rows: CsvRow[]): TransactionDraft[] {
  if (!rows.length) return [];
  const headers = Object.keys(rows[0]);
  let dateHeader = headers.find((h) => DATE_HEADER_RE.test(h) && DATE_RE.test(rows[0][h] ?? ""));
  let descHeader: string | undefined;
  let inHeader: string | undefined;
  let outHeader: string | undefined;
  let amtHeader: string | undefined;

  for (const h of headers) {
    const sample = rows[0][h] ?? "";
    if (!dateHeader && DATE_HEADER_RE.test(h) && DATE_RE.test(sample)) {
      dateHeader = h;
      continue;
    }
    if (!descHeader && DESC_HEADER_RE.test(h) && !DATE_RE.test(sample)) {
      descHeader = h;
      continue;
    }
    if (!inHeader && IN_HEADER_RE.test(h) && sample !== "") {
      inHeader = h;
      continue;
    }
    if (!outHeader && OUT_HEADER_RE.test(h) && sample !== "") {
      outHeader = h;
      continue;
    }
    if (!amtHeader && /amount/i.test(h) && !IN_HEADER_RE.test(h) && !OUT_HEADER_RE.test(h) && !BAL_HEADER_RE.test(h)) {
      amtHeader = h;
      continue;
    }
    if (!amtHeader && !BAL_HEADER_RE.test(h) && !DATE_RE.test(sample) && normalizeAmount(sample) !== null) {
      amtHeader = h;
    }
  }

  if (!dateHeader) return [];

  const drafts: TransactionDraft[] = [];
  for (const row of rows) {
    const date = normalizeDate(row[dateHeader] ?? "");
    if (!date) continue;
    const description = (descHeader ? row[descHeader] ?? "" : Object.values(row).join(" ")).trim();

    let amount: number | null = null;
    let type: "income" | "expense" = "expense";
    if (amtHeader) {
      amount = normalizeAmount(row[amtHeader] ?? "");
      if (amount !== null && amount < 0) {
        amount = -amount;
        type = "expense";
      } else if (amount !== null && !headers.some((h) => h !== amtHeader && (IN_HEADER_RE.test(h) || OUT_HEADER_RE.test(h)))) {
        type = "income";
      }
    } else if (inHeader && normalizeAmount(row[inHeader] ?? "") !== null) {
      amount = normalizeAmount(row[inHeader] ?? "") ?? 0;
      type = "income";
      if (amount < 0) {
        amount = -amount;
        type = "expense";
      }
    } else if (outHeader && normalizeAmount(row[outHeader] ?? "") !== null) {
      amount = normalizeAmount(row[outHeader] ?? "") ?? 0;
      type = "expense";
      if (amount < 0) {
        amount = -amount;
        type = "income";
      }
    }

    if (amount === null || amount === 0) continue;
    drafts.push({ date, description: description.slice(0, 200), amount, type, raw: row });
  }
  return drafts;
}