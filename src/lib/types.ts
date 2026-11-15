export type TransactionType = "expense" | "income";

export interface Transaction {
  id: string;
  type: TransactionType;
  /** Always positive. Whole cents, so sums never pick up floating-point error. */
  amountCents: number;
  /** Calendar date as YYYY-MM-DD, with no time zone. */
  date: string;
  categoryId: string;
  note: string;
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
  kind: TransactionType;
  color: string;
  /** Spending limit per month, for expense categories. Null means no budget. */
  monthlyBudgetCents: number | null;
}

export interface Settings {
  currency: string;
}

/** A month as YYYY-MM. */
export type MonthKey = string;
