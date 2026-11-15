import { useId, useRef, useState, type FormEvent } from "react";
import { today } from "../lib/budget";
import { centsToDecimal, parseAmount } from "../lib/money";
import type { Category, Transaction, TransactionType } from "../lib/types";
import type { NewTransaction } from "../lib/useBudget";

interface Props {
  categories: Category[];
  editing: Transaction | null;
  defaultDate?: string;
  onSubmit(input: NewTransaction): Promise<void>;
  onCancel?: () => void;
}

export function TransactionForm({ categories, editing, defaultDate, onSubmit, onCancel }: Props) {
  const id = useId();
  const amountRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<TransactionType>(editing?.type ?? "expense");
  const [amount, setAmount] = useState(editing ? centsToDecimal(editing.amountCents) : "");
  const [date, setDate] = useState(editing?.date ?? defaultDate ?? today());
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? "");
  const [note, setNote] = useState(editing?.note ?? "");
  const [errors, setErrors] = useState<{ amount?: string; date?: string }>({});
  const [saving, setSaving] = useState(false);

  const options = categories.filter((c) => c.kind === type);
  const selectedCategory = options.some((c) => c.id === categoryId) ? categoryId : (options[0]?.id ?? "");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const amountCents = parseAmount(amount);
    const nextErrors: typeof errors = {};
    if (amountCents === null || amountCents === 0) nextErrors.amount = "Enter an amount greater than zero, like 12.50.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) nextErrors.date = "Choose a date.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || amountCents === null) {
      amountRef.current?.focus();
      return;
    }
    setSaving(true);
    const submittedAmount = amount;
    const submittedNote = note;
    try {
      await onSubmit({ type, amountCents, date, categoryId: selectedCategory, note: note.trim() });
      if (!editing) {
        // Clear only what is unchanged since submitting: on a slow device the next entry
        // may already be typed in while this one is still being saved.
        setAmount((current) => (current === submittedAmount ? "" : current));
        setNote((current) => (current === submittedNote ? "" : current));
        amountRef.current?.focus();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      <fieldset className="type-toggle">
        <legend className="visually-hidden">Type</legend>
        {(["expense", "income"] as const).map((value) => (
          <label key={value} className={type === value ? "selected" : undefined}>
            <input type="radio" name={`${id}-type`} value={value} checked={type === value} onChange={() => setType(value)} />
            {value === "expense" ? "Expense" : "Income"}
          </label>
        ))}
      </fieldset>

      <div className="field">
        <label htmlFor={`${id}-amount`}>Amount</label>
        <input
          ref={amountRef}
          id={`${id}-amount`}
          inputMode="decimal"
          autoComplete="off"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-invalid={errors.amount ? true : undefined}
          aria-describedby={errors.amount ? `${id}-amount-error` : undefined}
          placeholder="0.00"
        />
        {errors.amount && (
          <p id={`${id}-amount-error`} className="error" role="alert">
            {errors.amount}
          </p>
        )}
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor={`${id}-date`}>Date</label>
          <input
            id={`${id}-date`}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-invalid={errors.date ? true : undefined}
            aria-describedby={errors.date ? `${id}-date-error` : undefined}
          />
          {errors.date && (
            <p id={`${id}-date-error`} className="error" role="alert">
              {errors.date}
            </p>
          )}
        </div>
        <div className="field">
          <label htmlFor={`${id}-category`}>Category</label>
          <select id={`${id}-category`} value={selectedCategory} onChange={(e) => setCategoryId(e.target.value)}>
            {options.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor={`${id}-note`}>
          Note <span className="optional">(optional)</span>
        </label>
        <input id={`${id}-note`} value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />
      </div>

      <div className="actions">
        <button type="submit" className="button primary" disabled={saving}>
          {editing ? "Save changes" : "Add transaction"}
        </button>
        {onCancel && (
          <button type="button" className="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
