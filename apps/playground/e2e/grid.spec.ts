import { expect, test } from "@playwright/test";

test("renders the QiGrid playground", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("h1")).toHaveText("QiGrid Playground");
  await expect(page.locator("table")).toBeVisible();

  // Verify the table has the expected column headers
  const headers = page.locator("thead tr:first-child th");
  await expect(headers).toHaveCount(9);
  await expect(headers.nth(0)).toHaveText(/ID/);
  await expect(headers.nth(1)).toHaveText(/First Name/);

  // Verify 100 data rows are rendered
  const rows = page.locator("tbody tr");
  await expect(rows).toHaveCount(100);
});
