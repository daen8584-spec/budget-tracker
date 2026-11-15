import { useId, useState, type ChangeEvent } from "react";
import type { Notice } from "../App";
import { readTransactionsCsv, toCsv } from "../lib/csv";
import type { BudgetData } from "../lib/useBudget";

const CURRENCIES = ["USD", "EUR", "GBP", "MXN", "ARS", "CLP", "COP", "PEN", "BRL", "CAD", "AUD", "JPY", "INR", "CHF"];

export function DataMenu({ data, onNotice }: { data: BudgetData; onNotice(notice: Notice): void }) {
  const id = useId();
  const [problems, setProblems] = useState<{ line: number; message: string }[]>([]);

  function exportCsv() {
    const blob = new Blob([toCsv(data.transactions, data.categories)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `budget-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onNotice({ message: `Exported ${data.transactions.length} transactions.` });
  }

  async function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 5_000_000) {
      onNotice({ message: "That file is larger than 5 MB. Split it into smaller files." });
      return;
    }
    const { rows, errors } = readTransactionsCsv(await file.text());
    setProblems(errors.slice(0, 10));
    const added = rows.length > 0 ? await data.importRows(rows) : 0;
    const skipped = errors.length ? ` ${errors.length} ${errors.length === 1 ? "row was" : "rows were"} skipped.` : "";
    onNotice({ message: `Imported ${added} ${added === 1 ? "transaction" : "transactions"}.${skipped}` });
  }

  return (
    <div className="data-menu">
      <div className="field">
        <label htmlFor={`${id}-currency`}>Currency</label>
        <select id={`${id}-currency`} value={data.settings.currency} onChange={(e) => void data.setCurrency(e.target.value)}>
          {CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </div>
      <div className="actions">
        <button type="button" className="button" onClick={exportCsv} disabled={data.transactions.length === 0}>
          Export CSV
        </button>
        <label className="button file-button">
          Import CSV
          <input type="file" accept=".csv,text/csv" onChange={importCsv} className="visually-hidden" />
        </label>
      </div>
      {problems.length > 0 && (
        <div className="import-problems" role="alert">
          <p>Some rows could not be imported:</p>
          <ul>
            {problems.map((p) => (
              <li key={p.line}>
                Line {p.line}: {p.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
