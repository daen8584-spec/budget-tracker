import { centsToDecimal, parseAmount } from "./money";
import type { Category, Transaction, TransactionType } from "./types";

export const CSV_HEADER = ["date", "type", "category", "amount", "note"] as const;

/**
 * Spreadsheet programs run cells that start with these characters as formulas. Exported
 * text cells that start with one get a leading apostrophe, so a note such as
 * "=HYPERLINK(...)" stays text when the file is opened.
 */
const FORMULA_START = /^[=+\-@\t\r]/;

function cell(value: string, isText: boolean): string {
  const safe = isText && FORMULA_START.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(transactions: Transaction[], categories: Category[]): string {
  const names = new Map(categories.map((c) => [c.id, c.name]));
  const rows = [...transactions]
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
    .map((t) =>
      [
        cell(t.date, false),
        cell(t.type, false),
        cell(names.get(t.categoryId) ?? "", true),
        cell(centsToDecimal(t.amountCents), false),
        cell(t.note, true),
      ].join(","),
    );
  return [CSV_HEADER.join(","), ...rows].join("\r\n") + "\r\n";
}

/** Splits CSV text into rows of fields (RFC 4180: quoted fields, doubled quotes, CRLF or LF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const input = text.replace(/^﻿/, "");
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"' && field === "") {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}

export interface ImportedRow {
  date: string;
  type: TransactionType;
  categoryName: string;
  amountCents: number;
  note: string;
}

export interface ImportResult {
  rows: ImportedRow[];
  errors: { line: number; message: string }[];
}

const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * Reads a CSV file in the exported format. Columns are found by header name, so their
 * order does not matter. Invalid rows are reported by line number and skipped; valid
 * rows are kept.
 */
export function readTransactionsCsv(text: string): ImportResult {
  const [header, ...body] = parseCsv(text);
  const errors: ImportResult["errors"] = [];
  if (!header) return { rows: [], errors: [{ line: 1, message: "The file is empty" }] };

  const columns = header.map((name) => name.trim().toLowerCase());
  const index = Object.fromEntries(CSV_HEADER.map((name) => [name, columns.indexOf(name)]));
  const missing = CSV_HEADER.filter((name) => name !== "note" && index[name] < 0);
  if (missing.length) {
    return { rows: [], errors: [{ line: 1, message: `Missing column: ${missing.join(", ")}` }] };
  }

  const rows: ImportedRow[] = [];
  body.forEach((fields, i) => {
    const line = i + 2;
    const get = (name: (typeof CSV_HEADER)[number]) => (index[name] >= 0 ? (fields[index[name]] ?? "").trim() : "");
    const date = get("date");
    const type = get("type").toLowerCase();
    const amountCents = parseAmount(get("amount"));
    const categoryName = get("category").replace(/^'/, "");
    if (!DATE.test(date)) return errors.push({ line, message: `Invalid date "${date}", expected YYYY-MM-DD` });
    if (type !== "expense" && type !== "income") return errors.push({ line, message: `Type must be expense or income` });
    if (amountCents === null || amountCents === 0) return errors.push({ line, message: `Invalid amount "${get("amount")}"` });
    if (!categoryName) return errors.push({ line, message: "Category is empty" });
    rows.push({ date, type, categoryName, amountCents, note: get("note").replace(/^'(?=[=+\-@])/, "") });
  });
  return { rows, errors };
}
