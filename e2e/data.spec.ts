import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { addTransaction, month, summaryValue } from "./helpers";

test("exports a CSV file and imports it into a fresh browser", async ({ page, browser }) => {
  await page.goto("/");
  await addTransaction(page, { amount: "12.50", day: "02", category: "Eating out", note: 'Lunch, "with friends"' });
  await addTransaction(page, { type: "income", amount: "300", day: "03", category: "Other income", note: "Sold a bike" });

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const file = await (await download).path();
  const csv = await readFile(file, "utf8");
  expect(csv).toContain(`${month()}-02,expense,Eating out,12.50,"Lunch, ""with friends"""`);

  const fresh = await browser.newContext();
  const other = await fresh.newPage();
  await other.goto("/");
  await other.getByLabel("Import CSV").setInputFiles(file);
  await expect(other.getByText("Imported 2 transactions.")).toBeVisible();
  await expect(summaryValue(other, "Left")).toHaveText("$287.50");
  await fresh.close();
});

test("imports the valid rows of a file and lists the problems", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Import CSV").setInputFiles({
    name: "bank.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      ["date,type,category,amount,note", `${month()}-04,expense,Pets,"1.250,00",Vet`, "yesterday,expense,Pets,5,", `${month()}-05,expense,Pets,abc,`].join("\n"),
    ),
  });
  await expect(page.getByText("Imported 1 transaction. 2 rows were skipped.")).toBeVisible();
  await expect(page.getByText("Line 3: Invalid date")).toBeVisible();
  await expect(page.getByText('Line 4: Invalid amount "abc"')).toBeVisible();
  await expect(summaryValue(page, "Spent")).toHaveText("$1,250.00");
});
