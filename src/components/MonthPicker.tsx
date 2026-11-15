import { currentMonth, shiftMonth } from "../lib/budget";
import type { MonthKey } from "../lib/types";

function monthLabel(month: MonthKey): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function MonthPicker({ month, onChange }: { month: MonthKey; onChange: (month: MonthKey) => void }) {
  const isCurrent = month === currentMonth();
  return (
    <nav className="month-picker" aria-label="Month">
      <button type="button" className="icon-button" aria-label="Previous month" onClick={() => onChange(shiftMonth(month, -1))}>
        ‹
      </button>
      <span className="month-label" aria-live="polite">
        {monthLabel(month)}
      </span>
      <button type="button" className="icon-button" aria-label="Next month" onClick={() => onChange(shiftMonth(month, 1))}>
        ›
      </button>
      {!isCurrent && (
        <button type="button" className="link-button" onClick={() => onChange(currentMonth())}>
          This month
        </button>
      )}
    </nav>
  );
}
