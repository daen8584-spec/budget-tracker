import { dailySpending, type CategorySpending } from "../lib/budget";
import { formatMoney } from "../lib/money";
import type { MonthKey, Transaction } from "../lib/types";
import type { Money } from "./Summary";

/**
 * Charts are plain SVG. Each one is hidden from screen readers and followed by a table
 * with the same numbers, so the information is available without seeing the chart.
 */

function arcPath(cx: number, cy: number, outer: number, inner: number, start: number, end: number): string {
  const point = (radius: number, angle: number) => [cx + radius * Math.sin(angle), cy - radius * Math.cos(angle)];
  const large = end - start > Math.PI ? 1 : 0;
  const [x1, y1] = point(outer, start);
  const [x2, y2] = point(outer, end);
  const [x3, y3] = point(inner, end);
  const [x4, y4] = point(inner, start);
  return `M${x1} ${y1}A${outer} ${outer} 0 ${large} 1 ${x2} ${y2}L${x3} ${y3}A${inner} ${inner} 0 ${large} 0 ${x4} ${y4}Z`;
}

export function CategoryChart({ spending, money }: { spending: CategorySpending[]; money: Money }) {
  const rows = spending.filter((s) => s.spentCents > 0);
  const total = rows.reduce((sum, s) => sum + s.spentCents, 0);
  if (total === 0) return <p className="empty">No spending this month.</p>;

  // Each slice starts where the spending before it ends. A full circle cannot be drawn as
  // one arc, so a single slice stops just short of it.
  const slices = rows.map((s, i) => {
    const before = rows.slice(0, i).reduce((sum, r) => sum + r.spentCents, 0);
    const start = (before / total) * Math.PI * 2;
    const sweep = Math.min((s.spentCents / total) * Math.PI * 2, Math.PI * 2 - 0.0001);
    return { s, start, end: start + sweep };
  });

  return (
    <figure className="chart">
      <div className="donut-row">
        <svg viewBox="0 0 120 120" className="donut" aria-hidden="true">
          {slices.map(({ s, start, end }) => (
            <path key={s.category.id} d={arcPath(60, 60, 56, 34, start, end)} fill={s.category.color} />
          ))}
          <text x="60" y="64" textAnchor="middle" className="donut-total">
            {formatMoney(total, money.currency)}
          </text>
        </svg>
        <table className="legend">
          <caption className="visually-hidden">Spending by category this month</caption>
          <thead className="visually-hidden">
            <tr>
              <th scope="col">Category</th>
              <th scope="col">Spent</th>
              <th scope="col">Share</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.category.id}>
                <th scope="row">
                  <span className="swatch" style={{ background: s.category.color }} aria-hidden="true" />
                  {s.category.name}
                </th>
                <td>{formatMoney(s.spentCents, money.currency)}</td>
                <td>{Math.round((s.spentCents / total) * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption className="visually-hidden">Spending by category</figcaption>
    </figure>
  );
}

export function DailyChart({ transactions, month, money }: { transactions: Transaction[]; month: MonthKey; money: Money }) {
  const days = dailySpending(transactions, month);
  const max = Math.max(...days);
  if (max === 0) return null;
  const width = 300;
  const height = 90;
  const gap = 2;
  const barWidth = (width - gap * (days.length - 1)) / days.length;
  const busiest = days.indexOf(max) + 1;

  return (
    <figure className="chart">
      <h3 className="chart-title">Spending per day</h3>
      <svg viewBox={`0 0 ${width} ${height + 14}`} className="bars" aria-hidden="true">
        {days.map((cents, i) => {
          const barHeight = cents === 0 ? 0 : Math.max(2, (cents / max) * height);
          return <rect key={i} x={i * (barWidth + gap)} y={height - barHeight} width={barWidth} height={barHeight} rx="1" />;
        })}
        <text x="0" y={height + 12} className="axis">
          1
        </text>
        <text x={width} y={height + 12} textAnchor="end" className="axis">
          {days.length}
        </text>
      </svg>
      <figcaption>
        Busiest day: the {busiest}
        {ordinal(busiest)}, with {formatMoney(max, money.currency)}.
      </figcaption>
      <details className="chart-data">
        <summary>Show daily amounts</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col">Spent</th>
            </tr>
          </thead>
          <tbody>
            {days.map((cents, i) =>
              cents > 0 ? (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{formatMoney(cents, money.currency)}</td>
                </tr>
              ) : null,
            )}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

function ordinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return "th";
  return ["th", "st", "nd", "rd"][n % 10] ?? "th";
}
