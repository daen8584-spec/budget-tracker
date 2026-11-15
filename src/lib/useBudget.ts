import { useCallback, useEffect, useState } from "react";
import type { ImportedRow } from "./csv";
import * as db from "./db";
import { DEFAULT_CATEGORIES, PALETTE, newId } from "./defaults";
import type { Category, Settings, Transaction } from "./types";

export type NewTransaction = Omit<Transaction, "id" | "createdAt">;

export interface BudgetData {
  status: "loading" | "ready" | "error";
  error: string | null;
  transactions: Transaction[];
  categories: Category[];
  settings: Settings;
  addTransaction(input: NewTransaction): Promise<void>;
  updateTransaction(transaction: Transaction): Promise<void>;
  removeTransaction(id: string): Promise<void>;
  setBudget(categoryId: string, monthlyBudgetCents: number | null): Promise<void>;
  setCurrency(currency: string): Promise<void>;
  importRows(rows: ImportedRow[]): Promise<number>;
}

const DEFAULT_SETTINGS: Settings = { currency: "USD" };

/**
 * App state backed by IndexedDB. Each change is written first and shown after it has been
 * stored, so the screen never shows data that a reload would lose.
 */
export function useBudget(): BudgetData {
  const [status, setStatus] = useState<BudgetData["status"]>("loading");
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let [storedCategories, storedTransactions, storedSettings] = await Promise.all([
          db.loadCategories(),
          db.loadTransactions(),
          db.loadSettings(),
        ]);
        if (storedCategories.length === 0) {
          await db.saveImport(DEFAULT_CATEGORIES, []);
          storedCategories = DEFAULT_CATEGORIES;
        }
        if (cancelled) return;
        setCategories(storedCategories);
        setTransactions(storedTransactions);
        if (storedSettings) setSettings(storedSettings);
        setStatus("ready");
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const addTransaction = useCallback(async (input: NewTransaction) => {
    const transaction: Transaction = { ...input, id: newId(), createdAt: Date.now() };
    await db.saveTransaction(transaction);
    setTransactions((list) => [...list, transaction]);
  }, []);

  const updateTransaction = useCallback(async (transaction: Transaction) => {
    await db.saveTransaction(transaction);
    setTransactions((list) => list.map((t) => (t.id === transaction.id ? transaction : t)));
  }, []);

  const removeTransaction = useCallback(async (id: string) => {
    await db.deleteTransaction(id);
    setTransactions((list) => list.filter((t) => t.id !== id));
  }, []);

  const setBudget = useCallback(
    async (categoryId: string, monthlyBudgetCents: number | null) => {
      const category = categories.find((c) => c.id === categoryId);
      if (!category) return;
      const updated = { ...category, monthlyBudgetCents };
      await db.saveCategory(updated);
      setCategories((list) => list.map((c) => (c.id === categoryId ? updated : c)));
    },
    [categories],
  );

  const setCurrency = useCallback(async (currency: string) => {
    const updated = { currency };
    await db.saveSettings(updated);
    setSettings(updated);
  }, []);

  /** Adds imported rows, creating categories that do not exist yet (matched by name and kind). */
  const importRows = useCallback(
    async (rows: ImportedRow[]) => {
      const byKey = new Map(categories.map((c) => [`${c.kind}:${c.name.toLowerCase()}`, c]));
      const created: Category[] = [];
      const imported: Transaction[] = rows.map((row, i) => {
        const key = `${row.type}:${row.categoryName.toLowerCase()}`;
        let category = byKey.get(key);
        if (!category) {
          category = {
            id: newId(),
            name: row.categoryName,
            kind: row.type,
            color: PALETTE[(categories.length + created.length) % PALETTE.length],
            monthlyBudgetCents: null,
          };
          byKey.set(key, category);
          created.push(category);
        }
        return {
          id: newId(),
          type: row.type,
          amountCents: row.amountCents,
          date: row.date,
          categoryId: category.id,
          note: row.note,
          createdAt: Date.now() + i,
        };
      });
      await db.saveImport(created, imported);
      setCategories((list) => [...list, ...created]);
      setTransactions((list) => [...list, ...imported]);
      return imported.length;
    },
    [categories],
  );

  return {
    status,
    error,
    transactions,
    categories,
    settings,
    addTransaction,
    updateTransaction,
    removeTransaction,
    setBudget,
    setCurrency,
    importRows,
  };
}
