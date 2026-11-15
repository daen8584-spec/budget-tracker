import { groupByDate } from "../lib/budget";
import { formatMoney } from "../lib/money";
import type { Category, Transaction } from "../lib/types";
import type { Money } from "./Summary";

interface Props {
  transactions: Transaction[];
  categories: Category[];
  money: Money;
  onEdit(transaction: Transaction): void;
  onDelete(transaction: Transaction): void;
}

function dayLabel(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

export function TransactionList({ transactions, categories, money, onEdit, onDelete }: Props) {
  if (transactions.length === 0) {
    return <p className="empty">Nothing recorded this month yet.</p>;
  }
  const byId = new Map(categories.map((c) => [c.id, c]));
  return (
    <div className="transaction-list">
      {groupByDate(transactions).map(([date, items]) => (
        <section key={date} aria-label={dayLabel(date)}>
          <h3 className="day">{dayLabel(date)}</h3>
          <ul>
            {items.map((t) => {
              const category = byId.get(t.categoryId);
              const amount = formatMoney(t.amountCents, money.currency);
              const name = category?.name ?? "Uncategorized";
              return (
                <li key={t.id} className="transaction">
                  <span className="swatch" style={{ background: category?.color }} aria-hidden="true" />
                  <span className="transaction-text">
                    <span className="transaction-category">{name}</span>
                    {t.note && <span className="transaction-note">{t.note}</span>}
                  </span>
                  <span className={`amount ${t.type}`}>
                    <span className="visually-hidden">{t.type === "income" ? "Income" : "Expense"} </span>
                    {t.type === "income" ? "+" : "−"}
                    {amount}
                  </span>
                  <span className="row-actions">
                    <button type="button" className="link-button" onClick={() => onEdit(t)} aria-label={`Edit ${name} ${amount}`}>
                      Edit
                    </button>
                    <button type="button" className="link-button danger" onClick={() => onDelete(t)} aria-label={`Delete ${name} ${amount}`}>
                      Delete
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
