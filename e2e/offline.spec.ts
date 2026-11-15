import { expect, test } from "@playwright/test";
import { addTransaction, summaryValue } from "./helpers";

test("opens without a connection after the first visit", async ({ page, context }) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  // The service worker controls pages loaded after it activates.
  await page.reload();
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
  await addTransaction(page, { amount: "9.99", day: "06", category: "Entertainment", note: "Saved before going offline" });

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Budget Tracker" })).toBeVisible();
  await expect(page.getByText("You're offline.")).toBeVisible();
  await expect(page.getByText("Saved before going offline")).toBeVisible();

  await addTransaction(page, { amount: "5", day: "06", category: "Entertainment", note: "Added while offline" });
  await expect(summaryValue(page, "Spent")).toHaveText("$14.99");

  await context.setOffline(false);
  await page.reload();
  await expect(page.getByText("Added while offline")).toBeVisible();
});
