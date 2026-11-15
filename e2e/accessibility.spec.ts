import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { addTransaction } from "./helpers";

for (const colorScheme of ["light", "dark"] as const) {
  test(`has no accessibility violations in ${colorScheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto("/");
    await addTransaction(page, { type: "income", amount: "1000", day: "01", category: "Salary" });
    await addTransaction(page, { amount: "120", day: "02", category: "Groceries", note: "Market" });
    await page.getByRole("button", { name: "Set budget for Groceries" }).click();
    await page.getByLabel("Monthly budget for Groceries").fill("100");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByRole("button", { name: "Dismiss" }).click();

    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });
}
