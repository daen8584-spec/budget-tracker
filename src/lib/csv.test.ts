import { describe, expect, it } from "vitest";
import { parseCsv, readTransactionsCsv, toCsv } from "./csv";
import type { Category, Transaction } from "./types";

const categories: Category[] = [
  { id: "food", name: "Groceries", kind: "expense", color: "#000", monthlyBudgetCents: null },
  { id: "pay", name: "Salary, main", kind: "income", color: "#000", monthlyBudgetCents: null },
];

const transactions: Transaction[] = [
  { id: "2", type: "expense", amountCents: 1250, date: "2026-11-02", categoryId: "food", note: 'Said "hi"\nnew line', createdAt: 2 },
  { id: "1", type: "income", amountCents: 250000, date: "2026-11-01", categoryId: "pay", note: "", createdAt: 1 },
  { id: "3", type: "expense", amountCents: 500, date: "2026-11-03", categoryId: "food", note: "=HYPERLINK(\"x\")", createdAt: 3 },
];

describe("toCsv", () => {
  it("writes a header, sorts by date and quotes fields that need it", () => {
    const csv = toCsv(transactions, categories);
    expect(csv.split("\r\n")[0]).toBe("date,type,category,amount,note");
    expect(csv).toContain('2026-11-01,income,"Salary, main",2500.00,\r\n');
    expect(csv).toContain('2026-11-02,expense,Groceries,12.50,"Said ""hi""\nnew line"\r\n');
  });

  it("stops spreadsheet programs from running notes as formulas", () => {
    expect(toCsv(transactions, categories)).toContain(`2026-11-03,expense,Groceries,5.00,"'=HYPERLINK(""x"")"`);
  });
});

describe("parseCsv", () => {
  it("handles quotes, doubled quotes, CRLF, LF, a byte order mark and blank lines", () => {
    expect(parseCsv('﻿a,"b,c","d ""e"""\r\n\r\n1,2,3\n')).toEqual([
      ["a", "b,c", 'd "e"'],
      ["1", "2", "3"],
    ]);
  });

  it("keeps a final row without a line break", () => {
    expect(parseCsv("a,b\n1,")).toEqual([
      ["a", "b"],
      ["1", ""],
    ]);
  });
});

describe("readTransactionsCsv", () => {
  it("reads back an export", () => {
    const { rows, errors } = readTransactionsCsv(toCsv(transactions, categories));
    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { date: "2026-11-01", type: "income", categoryName: "Salary, main", amountCents: 250000, note: "" },
      { date: "2026-11-02", type: "expense", categoryName: "Groceries", amountCents: 1250, note: 'Said "hi"\nnew line' },
      { date: "2026-11-03", type: "expense", categoryName: "Groceries", amountCents: 500, note: '=HYPERLINK("x")' },
    ]);
  });

  it("finds columns by name and accepts European amounts", () => {
    const { rows } = readTransactionsCsv("amount,category,date,type\n\"1.234,50\",Rent,2026-11-01,EXPENSE\n");
    expect(rows).toEqual([{ date: "2026-11-01", type: "expense", categoryName: "Rent", amountCents: 123450, note: "" }]);
  });

  it("reports invalid rows by line and keeps the valid ones", () => {
    const { rows, errors } = readTransactionsCsv(
      [
        "date,type,category,amount",
        "2026-11-01,expense,Food,10",
        "11/02/2026,expense,Food,10",
        "2026-11-03,transfer,Food,10",
        "2026-11-04,expense,Food,ten",
        "2026-11-05,expense,,10",
        "2026-11-06,expense,Food,0",
      ].join("\n"),
    );
    expect(rows).toHaveLength(1);
    expect(errors.map((e) => e.line)).toEqual([3, 4, 5, 6, 7]);
    expect(errors[0].message).toContain("YYYY-MM-DD");
  });

  it("reports a missing column", () => {
    expect(readTransactionsCsv("date,type,amount\n").errors[0].message).toBe("Missing column: category");
  });
});
