import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DEFAULT_CATEGORIES } from "../lib/defaults";
import type { NewTransaction } from "../lib/useBudget";
import { TransactionForm } from "./TransactionForm";

describe("TransactionForm", () => {
  it("keeps what is typed while the previous entry is still saving", async () => {
    const user = userEvent.setup();
    let finishSave: () => void = () => {};
    const saved: NewTransaction[] = [];
    render(
      <TransactionForm
        categories={DEFAULT_CATEGORIES}
        editing={null}
        onSubmit={(input) =>
          new Promise<void>((resolve) => {
            saved.push(input);
            finishSave = resolve;
          })
        }
      />,
    );
    const amount = screen.getByLabelText("Amount");
    await user.type(amount, "10");
    await user.click(screen.getByRole("button", { name: "Add transaction" }));
    // The next amount is typed before the first save finishes.
    await user.clear(amount);
    await user.type(amount, "25");
    await act(async () => finishSave());

    expect(saved).toHaveLength(1);
    expect(saved[0].amountCents).toBe(1000);
    expect(amount).toHaveValue("25");
  });

  it("clears the amount after a save when nothing new was typed", async () => {
    const user = userEvent.setup();
    render(<TransactionForm categories={DEFAULT_CATEGORIES} editing={null} onSubmit={async () => {}} />);
    const amount = screen.getByLabelText("Amount");
    await user.type(amount, "10");
    await user.click(screen.getByRole("button", { name: "Add transaction" }));
    expect(amount).toHaveValue("");
    expect(amount).toHaveFocus();
  });
});
