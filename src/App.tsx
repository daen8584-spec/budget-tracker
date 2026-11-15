import { useCallback, useEffect, useMemo, useState } from "react";
import { BudgetList } from "./components/BudgetList";
import { CategoryChart, DailyChart } from "./components/Charts";
import { DataMenu } from "./components/DataMenu";
import { MonthPicker } from "./components/MonthPicker";
import { Summary } from "./components/Summary";
import { TransactionForm } from "./components/TransactionForm";
import { TransactionList } from "./components/TransactionList";
import { currentMonth, spendingByCategory, summarize, transactionsIn } from "./lib/budget";
import type { Transaction } from "./lib/types";
import { useBudget } from "./lib/useBudget";
import { useOnline } from "./lib/useOnline";

export interface Notice {
  message: string;
  action?: { label: string; run: () => void };
}

export default function App() {
  const data = useBudget();
  const online = useOnline();
  const [month, setMonth] = useState(currentMonth());
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  // Messages close by themselves; one with an Undo stays longer so there is time to use it.
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), notice.action ? 10_000 : 6_000);
    return () => clearTimeout(timer);
  }, [notice]);

  const monthTransactions = useMemo(() => transactionsIn(data.transactions, month), [data.transactions, month]);
  const summary = useMemo(() => summarize(data.transactions, month), [data.transactions, month]);
  const spending = useMemo(
    () => spendingByCategory(data.transactions, data.categories, month),
    [data.transactions, data.categories, month],
  );
  const money = useMemo(() => ({ currency: data.settings.currency }), [data.settings.currency]);

  const { removeTransaction, updateTransaction } = data;
  const remove = useCallback(
    async (transaction: Transaction) => {
      await removeTransaction(transaction.id);
      if (editing?.id === transaction.id) setEditing(null);
      setNotice({ message: "Transaction deleted.", action: { label: "Undo", run: () => void updateTransaction(transaction) } });
    },
    [removeTransaction, updateTransaction, editing],
  );

  if (data.status === "loading") {
    return <p className="center">Loading your budget…</p>;
  }
  if (data.status === "error") {
    return (
      <p className="center" role="alert">
        Your data could not be opened: {data.error}. Private browsing can block storage; try a normal window.
      </p>
    );
  }

  return (
    <>
      <header className="app-header">
        <div className="wrap header-row">
          <h1>Budget Tracker</h1>
          <MonthPicker month={month} onChange={setMonth} />
        </div>
      </header>

      <main className="wrap">
        {!online && (
          <p className="offline" role="status">
            You're offline. Everything still works, and changes are saved on this device.
          </p>
        )}
        <Summary summary={summary} money={money} />

        <div className="layout">
          <div className="column">
            <section aria-labelledby="add-heading" className="panel">
              <h2 id="add-heading">{editing ? "Edit transaction" : "Add a transaction"}</h2>
              <TransactionForm
                key={editing?.id ?? "new"}
                categories={data.categories}
                editing={editing}
                defaultDate={month === currentMonth() ? undefined : `${month}-01`}
                onSubmit={async (input) => {
                  if (editing) {
                    await data.updateTransaction({ ...editing, ...input });
                    setEditing(null);
                    setNotice({ message: "Transaction updated." });
                  } else {
                    await data.addTransaction(input);
                    setNotice({ message: "Transaction added." });
                  }
                }}
                onCancel={editing ? () => setEditing(null) : undefined}
              />
            </section>

            <section aria-labelledby="list-heading" className="panel">
              <h2 id="list-heading">Transactions</h2>
              <TransactionList
                transactions={monthTransactions}
                categories={data.categories}
                money={money}
                onEdit={setEditing}
                onDelete={remove}
              />
            </section>
          </div>

          <div className="column">
            <section aria-labelledby="budgets-heading" className="panel">
              <h2 id="budgets-heading">Budgets</h2>
              <BudgetList spending={spending} categories={data.categories} money={money} onSetBudget={data.setBudget} />
            </section>

            <section aria-labelledby="charts-heading" className="panel">
              <h2 id="charts-heading">Where the money went</h2>
              <CategoryChart spending={spending} money={money} />
              <DailyChart transactions={data.transactions} month={month} money={money} />
            </section>

            <section aria-labelledby="data-heading" className="panel">
              <h2 id="data-heading">Your data</h2>
              <DataMenu data={data} onNotice={setNotice} />
            </section>
          </div>
        </div>
      </main>

      <footer className="wrap app-footer">
        Your data stays in this browser on this device. Export a CSV file to back it up or move it.
      </footer>

      <div className="notice" role="status" aria-live="polite">
        {notice && (
          <div className="notice-box">
            <span>{notice.message}</span>
            {notice.action && (
              <button
                type="button"
                className="link-button"
                onClick={() => {
                  notice.action?.run();
                  setNotice({ message: "Restored." });
                }}
              >
                {notice.action.label}
              </button>
            )}
            <button type="button" className="icon-button" aria-label="Dismiss" onClick={() => setNotice(null)}>
              ×
            </button>
          </div>
        )}
      </div>
    </>
  );
}
