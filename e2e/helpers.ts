import type { Page } from "@playwright/test";

export const month = () => new Date().toISOString().slice(0, 7);

export async function addTransaction(
  page: Page,
  { type = "expense", amount, day, category, note = "" }: { type?: "expense" | "income"; amount: string; day: string; category: string; note?: string },
) {
  const form = page.getByRole("region", { name: /transaction/i }).first();
  await form.getByLabel(type === "income" ? "Income" : "Expense", { exact: true }).check();
  await form.getByLabel("Amount", { exact: true }).fill(amount);
  await form.getByLabel("Date").fill(`${month()}-${day}`);
  await form.getByLabel("Category", { exact: true }).selectOption({ label: category });
  await form.getByLabel("Note").fill(note);
  await form.getByRole("button", { name: "Add transaction" }).click();
}

export function summaryValue(page: Page, label: "Income" | "Spent" | "Left") {
  return page.getByLabel("This month").locator(".summary-item", { hasText: label }).locator("dd");
}
