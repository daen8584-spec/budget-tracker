import type { MonthSummary } from "../lib/budget";
import { formatMoney } from "../lib/money";

export interface Money {
  currency: string;
}

export function Summary({ summary, money }: { summary: MonthSummary; money: Money }) {
  const items = [
    { label: "Income", value: summary.incomeCents, tone: "positive" },
    { label: "Spent", value: summary.expenseCents, tone: "neutral" },
    { label: "Left", value: summary.balanceCents, tone: summary.balanceCents < 0 ? "negative" : "positive" },
  ];
  return (
    <dl className="summary" aria-label="This month">
      {items.map((item) => (
        <div key={item.label} className={`summary-item ${item.tone}`}>
          <dt>{item.label}</dt>
          <dd>{formatMoney(item.value, money.currency)}</dd>
        </div>
      ))}
    </dl>
  );
}
