import { useId, useState, type FormEvent } from "react";
import type { CategorySpending } from "../lib/budget";
import { centsToDecimal, formatMoney, parseAmount } from "../lib/money";
import type { Category } from "../lib/types";
import type { Money } from "./Summary";

interface Props {
  spending: CategorySpending[];
  categories: Category[];
  money: Money;
  onSetBudget(categoryId: string, cents: number | null): Promise<void>;
}

export function BudgetList({ spending, categories, money, onSetBudget }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const shown = new Set(spending.map((s) => s.category.id));
  const withoutBudget = categories.filter((c) => c.kind === "expense" && !shown.has(c.id));

  return (
    <div className="budgets">
      {spending.length === 0 && <p className="empty">Set a monthly budget for a category to track it here.</p>}
      <ul>
        {spending.map(({ category, spentCents, budgetCents, usage }) => {
          const over = usage !== null && usage > 1;
          const percent = usage === null ? null : Math.round(usage * 100);
          return (
            <li key={category.id} className="budget">
              <div className="budget-head">
                <span className="budget-name">
                  <span className="swatch" style={{ background: category.color }} aria-hidden="true" />
                  {category.name}
                </span>
                <span className={over ? "over" : undefined}>
                  {formatMoney(spentCents, money.currency)}
                  {budgetCents !== null && <> of {formatMoney(budgetCents, money.currency)}</>}
                </span>
              </div>
              {percent !== null && (
                <div
                  className={`bar ${over ? "over" : percent >= 80 ? "near" : ""}`}
                  role="img"
                  aria-label={over ? `${percent}% of budget, over by ${formatMoney(spentCents - budgetCents!, money.currency)}` : `${percent}% of budget used`}
                >
                  <span style={{ width: `${Math.min(percent, 100)}%` }} />
                </div>
              )}
              {over && <p className="over-text">Over budget by {formatMoney(spentCents - budgetCents!, money.currency)}</p>}
              {editing === category.id ? (
                <BudgetEditor category={category} onDone={() => setEditing(null)} onSetBudget={onSetBudget} />
              ) : (
                <button type="button" className="link-button" onClick={() => setEditing(category.id)}>
                  {budgetCents === null ? `Set budget for ${category.name}` : `Change budget for ${category.name}`}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {withoutBudget.length > 0 && (
        <AddBudget categories={withoutBudget} onSetBudget={onSetBudget} />
      )}
    </div>
  );
}

function BudgetEditor({
  category,
  onSetBudget,
  onDone,
}: {
  category: Category;
  onSetBudget: Props["onSetBudget"];
  onDone(): void;
}) {
  const id = useId();
  const [value, setValue] = useState(category.monthlyBudgetCents === null ? "" : centsToDecimal(category.monthlyBudgetCents));
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (value.trim() === "") {
      await onSetBudget(category.id, null);
      return onDone();
    }
    const cents = parseAmount(value);
    if (cents === null || cents === 0) return setError("Enter an amount greater than zero, or leave it empty to remove the budget.");
    await onSetBudget(category.id, cents);
    onDone();
  }

  return (
    <form className="inline-form" onSubmit={save} noValidate>
      <label htmlFor={id}>Monthly budget for {category.name}</label>
      <input
        id={id}
        inputMode="decimal"
        value={value}
        autoFocus
        onChange={(e) => setValue(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      <button type="submit" className="button primary">
        Save
      </button>
      <button type="button" className="button" onClick={onDone}>
        Cancel
      </button>
      {error && (
        <p id={`${id}-error`} className="error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

function AddBudget({ categories, onSetBudget }: { categories: Category[]; onSetBudget: Props["onSetBudget"] }) {
  const id = useId();
  const [categoryId, setCategoryId] = useState(categories[0].id);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const selected = categories.some((c) => c.id === categoryId) ? categoryId : categories[0].id;

  async function save(event: FormEvent) {
    event.preventDefault();
    const cents = parseAmount(value);
    if (cents === null || cents === 0) return setError("Enter an amount greater than zero.");
    setError(null);
    setValue("");
    await onSetBudget(selected, cents);
  }

  return (
    <form className="inline-form add-budget" onSubmit={save} noValidate>
      <label htmlFor={`${id}-category`}>Add a budget</label>
      <select id={`${id}-category`} value={selected} onChange={(e) => setCategoryId(e.target.value)}>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <label htmlFor={`${id}-amount`} className="visually-hidden">
        Monthly amount
      </label>
      <input
        id={`${id}-amount`}
        inputMode="decimal"
        placeholder="Per month"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      <button type="submit" className="button">
        Add budget
      </button>
      {error && (
        <p id={`${id}-error`} className="error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
