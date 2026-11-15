import type { Category, MonthKey, Transaction } from "./types";

export function monthOf(date: string): MonthKey {
  return date.slice(0, 7);
}

export function currentMonth(now = new Date()): MonthKey {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function today(now = new Date()): string {
  return `${currentMonth(now)}-${String(now.getDate()).padStart(2, "0")}`;
}

export function shiftMonth(month: MonthKey, delta: number): MonthKey {
  const [year, monthNumber] = month.split("-").map(Number);
  const index = year * 12 + (monthNumber - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

export function daysInMonth(month: MonthKey): number {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
}

export function transactionsIn(transactions: Transaction[], month: MonthKey): Transaction[] {
  return transactions.filter((t) => monthOf(t.date) === month);
}

export interface MonthSummary {
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
}

export function summarize(transactions: Transaction[], month: MonthKey): MonthSummary {
  let incomeCents = 0;
  let expenseCents = 0;
  for (const t of transactionsIn(transactions, month)) {
    if (t.type === "income") incomeCents += t.amountCents;
    else expenseCents += t.amountCents;
  }
  return { incomeCents, expenseCents, balanceCents: incomeCents - expenseCents };
}

export interface CategorySpending {
  category: Category;
  spentCents: number;
  budgetCents: number | null;
  /** spent / budget, or null without a budget. Above 1 means over budget. */
  usage: number | null;
}

/**
 * Spending per expense category in a month, largest first. Categories with neither
 * spending nor a budget are left out.
 */
export function spendingByCategory(
  transactions: Transaction[],
  categories: Category[],
  month: MonthKey,
): CategorySpending[] {
  const spent = new Map<string, number>();
  for (const t of transactionsIn(transactions, month)) {
    if (t.type === "expense") spent.set(t.categoryId, (spent.get(t.categoryId) ?? 0) + t.amountCents);
  }
  return categories
    .filter((c) => c.kind === "expense")
    .map((category) => {
      const spentCents = spent.get(category.id) ?? 0;
      const budgetCents = category.monthlyBudgetCents;
      const usage = budgetCents ? spentCents / budgetCents : null;
      return { category, spentCents, budgetCents, usage };
    })
    .filter((row) => row.spentCents > 0 || row.budgetCents !== null)
    .sort((a, b) => b.spentCents - a.spentCents || a.category.name.localeCompare(b.category.name));
}

/** Total spending on each day of the month; index 0 is the 1st. */
export function dailySpending(transactions: Transaction[], month: MonthKey): number[] {
  const days = new Array<number>(daysInMonth(month)).fill(0);
  for (const t of transactionsIn(transactions, month)) {
    if (t.type === "expense") days[Number(t.date.slice(8, 10)) - 1] += t.amountCents;
  }
  return days;
}

/** Transactions grouped by date, newest date first, newest entry first within a day. */
export function groupByDate(transactions: Transaction[]): [string, Transaction[]][] {
  const groups = new Map<string, Transaction[]>();
  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  for (const t of sorted) {
    const group = groups.get(t.date);
    if (group) group.push(t);
    else groups.set(t.date, [t]);
  }
  return [...groups];
}
