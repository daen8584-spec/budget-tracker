import { expect, test } from "@playwright/test";
import { addTransaction, summaryValue } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("adds income and expenses and keeps them after a reload", async ({ page }) => {
  await addTransaction(page, { type: "income", amount: "2.400", day: "01", category: "Salary", note: "Pay" });
  await addTransaction(page, { amount: "64,30", day: "03", category: "Groceries", note: "Weekly shop" });
  await addTransaction(page, { amount: "850", day: "01", category: "Housing", note: "Rent" });

  await expect(summaryValue(page, "Income")).toHaveText("$2,400.00");
  await expect(summaryValue(page, "Spent")).toHaveText("$914.30");
  await expect(summaryValue(page, "Left")).toHaveText("$1,485.70");

  await page.reload();
  await expect(summaryValue(page, "Left")).toHaveText("$1,485.70");
  await expect(page.getByText("Weekly shop")).toBeVisible();
});

test("explains an invalid amount next to the field", async ({ page }) => {
  await page.getByRole("button", { name: "Add transaction" }).click();
  const amount = page.getByLabel("Amount", { exact: true });
  await expect(amount).toHaveAttribute("aria-invalid", "true");
  await expect(amount).toHaveAccessibleDescription(/greater than zero/);
  await expect(amount).toBeFocused();
});

test("edits a transaction, and deletes it with undo", async ({ page }) => {
  await addTransaction(page, { amount: "20", day: "05", category: "Transport", note: "Taxi" });
  await page.getByRole("button", { name: "Edit Transport $20.00" }).click();
  await page.getByLabel("Amount", { exact: true }).fill("25");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(summaryValue(page, "Spent")).toHaveText("$25.00");

  await page.getByRole("button", { name: "Delete Transport $25.00" }).click();
  await expect(page.getByText("Taxi")).toHaveCount(0);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByText("Taxi")).toBeVisible();
  await expect(summaryValue(page, "Spent")).toHaveText("$25.00");
});

test("warns when a category goes over its budget", async ({ page }) => {
  await addTransaction(page, { amount: "120", day: "02", category: "Groceries" });
  await page.getByRole("button", { name: "Set budget for Groceries" }).click();
  await page.getByLabel("Monthly budget for Groceries").fill("100");
  await page.getByRole("button", { name: "Save", exact: true }).click();

  await expect(page.getByText("Over budget by $20.00")).toBeVisible();
  await expect(page.getByRole("img", { name: /120% of budget, over by \$20\.00/ })).toBeVisible();
});

test("shows each month separately", async ({ page }) => {
  await addTransaction(page, { amount: "10", day: "01", category: "Health" });
  await page.getByRole("button", { name: "Previous month" }).click();
  await expect(page.getByText("Nothing recorded this month yet.")).toBeVisible();
  await expect(summaryValue(page, "Spent")).toHaveText("$0.00");
  await page.getByRole("button", { name: "This month" }).click();
  await expect(summaryValue(page, "Spent")).toHaveText("$10.00");
});

test("can be used with the keyboard alone", async ({ page }) => {
  // Choose Income with the arrow keys, type an amount and press Enter.
  await page.getByLabel("Expense", { exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByLabel("Income", { exact: true })).toBeChecked();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Amount", { exact: true })).toBeFocused();
  await page.keyboard.type("15.75");
  await page.keyboard.press("Enter");
  await expect(summaryValue(page, "Income")).toHaveText("$15.75");
  // Focus returns to the amount, ready for the next entry.
  await expect(page.getByLabel("Amount", { exact: true })).toBeFocused();
});
