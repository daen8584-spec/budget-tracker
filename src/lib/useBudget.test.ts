import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDatabaseForTests } from "./db";
import { useBudget } from "./useBudget";

beforeEach(async () => {
  await resetDatabaseForTests();
});

async function ready() {
  const hook = renderHook(() => useBudget());
  await waitFor(() => expect(hook.result.current.status).toBe("ready"));
  return hook;
}

describe("useBudget", () => {
  it("starts with the default categories and USD", async () => {
    const { result } = await ready();
    expect(result.current.categories.map((c) => c.name)).toContain("Groceries");
    expect(result.current.transactions).toEqual([]);
    expect(result.current.settings.currency).toBe("USD");
  });

  it("keeps transactions, budgets and settings across a reload", async () => {
    const first = await ready();
    await act(() =>
      first.result.current.addTransaction({
        type: "expense",
        amountCents: 1250,
        date: "2026-11-02",
        categoryId: "groceries",
        note: "Market",
      }),
    );
    await act(() => first.result.current.setBudget("groceries", 30000));
    await act(() => first.result.current.setCurrency("EUR"));
    first.unmount();

    const { result } = await ready();
    expect(result.current.transactions).toMatchObject([{ amountCents: 1250, note: "Market" }]);
    expect(result.current.categories.find((c) => c.id === "groceries")?.monthlyBudgetCents).toBe(30000);
    expect(result.current.settings.currency).toBe("EUR");
  });

  it("updates and removes transactions", async () => {
    const { result } = await ready();
    await act(() =>
      result.current.addTransaction({ type: "expense", amountCents: 100, date: "2026-11-01", categoryId: "health", note: "" }),
    );
    const [added] = result.current.transactions;
    await act(() => result.current.updateTransaction({ ...added, amountCents: 999 }));
    expect(result.current.transactions[0].amountCents).toBe(999);
    await act(() => result.current.removeTransaction(added.id));
    expect(result.current.transactions).toEqual([]);
    // Undo puts the deleted transaction back.
    await act(() => result.current.updateTransaction({ ...added, amountCents: 999 }));
    expect(result.current.transactions).toMatchObject([{ id: added.id, amountCents: 999 }]);
  });

  it("imports rows and creates missing categories once", async () => {
    const { result } = await ready();
    let count = 0;
    await act(async () => {
      count = await result.current.importRows([
        { date: "2026-11-01", type: "expense", categoryName: "groceries", amountCents: 500, note: "" },
        { date: "2026-11-02", type: "expense", categoryName: "Pets", amountCents: 700, note: "" },
        { date: "2026-11-03", type: "expense", categoryName: "pets", amountCents: 300, note: "" },
        { date: "2026-11-04", type: "income", categoryName: "Pets", amountCents: 900, note: "" },
      ]);
    });
    expect(count).toBe(4);
    const pets = result.current.categories.filter((c) => c.name.toLowerCase() === "pets");
    expect(pets.map((c) => c.kind).sort()).toEqual(["expense", "income"]);
    expect(result.current.transactions[0].categoryId).toBe("groceries");
  });
});
