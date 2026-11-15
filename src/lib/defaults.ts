import type { Category } from "./types";

/**
 * Colors for categories, chosen to be distinguishable from each other and readable on
 * both light and dark backgrounds.
 */
export const PALETTE = ["#2f7d6d", "#c2622d", "#4a6fb5", "#b8457a", "#8a6d1f", "#6b5bb5", "#3c8a3c", "#a34b4b", "#2b7fa3", "#7a7a7a"];

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "groceries", name: "Groceries", kind: "expense", color: PALETTE[0], monthlyBudgetCents: null },
  { id: "housing", name: "Housing", kind: "expense", color: PALETTE[1], monthlyBudgetCents: null },
  { id: "transport", name: "Transport", kind: "expense", color: PALETTE[2], monthlyBudgetCents: null },
  { id: "eating-out", name: "Eating out", kind: "expense", color: PALETTE[3], monthlyBudgetCents: null },
  { id: "utilities", name: "Utilities", kind: "expense", color: PALETTE[4], monthlyBudgetCents: null },
  { id: "health", name: "Health", kind: "expense", color: PALETTE[5], monthlyBudgetCents: null },
  { id: "entertainment", name: "Entertainment", kind: "expense", color: PALETTE[6], monthlyBudgetCents: null },
  { id: "other-expense", name: "Other", kind: "expense", color: PALETTE[9], monthlyBudgetCents: null },
  { id: "salary", name: "Salary", kind: "income", color: PALETTE[8], monthlyBudgetCents: null },
  { id: "other-income", name: "Other income", kind: "income", color: PALETTE[7], monthlyBudgetCents: null },
];

export function newId(): string {
  return crypto.randomUUID();
}
