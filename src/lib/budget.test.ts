import { describe, expect, it } from "vitest";
import {
  currentMonth,
  dailySpending,
  daysInMonth,
  groupByDate,
  shiftMonth,
  spendingByCategory,
  summarize,
} from "./budget";
import type { Category, Transaction } from "./types";

const categories: Category[] = [
  { id: "food", name: "Groceries", kind: "expense", color: "#000", monthlyBudgetCents: 30000 },
  { id: "fun", name: "Entertainment", kind: "expense", color: "#000", monthlyBudgetCents: null },
  { id: "rent", name: "Rent", kind: "expense", color: "#000", monthlyBudgetCents: 100000 },
  { id: "car", name: "Transport", kind: "expense", color: "#000", monthlyBudgetCents: null },
  { id: "pay", name: "Salary", kind: "income", color: "#000", monthlyBudgetCents: null },
];

let created = 0;
const tx = (date: string, type: Transaction["type"], amountCents: number, categoryId: string): Transaction => ({
  id: `${date}-${created}`,
  type,
  amountCents,
  date,
  categoryId,
  note: "",
  createdAt: created++,
});

const transactions = [
  tx("2026-10-31", "expense", 9999, "food"),
  tx("2026-11-01", "income", 250000, "pay"),
  tx("2026-11-01", "expense", 12050, "food"),
  tx("2026-11-15", "expense", 20000, "food"),
  tx("2026-11-15", "expense", 4500, "fun"),
  tx("2026-11-30", "expense", 100000, "rent"),
  tx("2026-12-01", "expense", 5000, "food"),
];

describe("months", () => {
  it("shifts across year boundaries", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-05", -17)).toBe("2024-12");
  });

  it("knows month lengths, including leap years", () => {
    expect(daysInMonth("2026-02")).toBe(28);
    expect(daysInMonth("2028-02")).toBe(29);
    expect(daysInMonth("2026-11")).toBe(30);
  });

  it("uses the local calendar month", () => {
    expect(currentMonth(new Date(2026, 0, 31, 23, 59))).toBe("2026-01");
  });
});

describe("summarize", () => {
  it("totals only the given month", () => {
    expect(summarize(transactions, "2026-11")).toEqual({
      incomeCents: 250000,
      expenseCents: 136550,
      balanceCents: 113450,
    });
  });
});

describe("spendingByCategory", () => {
  it("compares spending with budgets, largest first, and skips idle categories without a budget", () => {
    const rows = spendingByCategory(transactions, categories, "2026-11");
    expect(rows.map((r) => [r.category.id, r.spentCents, r.budgetCents])).toEqual([
      ["rent", 100000, 100000],
      ["food", 32050, 30000],
      ["fun", 4500, null],
    ]);
    expect(rows[1].usage).toBeCloseTo(1.068, 3);
    expect(rows[2].usage).toBeNull();
  });

  it("keeps categories with a budget even when nothing was spent", () => {
    const rows = spendingByCategory([], categories, "2026-11");
    expect(rows.map((r) => r.category.id)).toEqual(["food", "rent"]);
  });
});

describe("dailySpending", () => {
  it("has one entry per day and ignores income", () => {
    const days = dailySpending(transactions, "2026-11");
    expect(days).toHaveLength(30);
    expect(days[0]).toBe(12050);
    expect(days[14]).toBe(24500);
    expect(days[29]).toBe(100000);
  });
});

describe("groupByDate", () => {
  it("orders days and entries newest first", () => {
    const groups = groupByDate(transactions.filter((t) => t.date.startsWith("2026-11")));
    expect(groups.map(([date]) => date)).toEqual(["2026-11-30", "2026-11-15", "2026-11-01"]);
    expect(groups[1][1].map((t) => t.categoryId)).toEqual(["fun", "food"]);
  });
});
