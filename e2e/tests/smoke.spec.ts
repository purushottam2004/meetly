import { test, expect } from "@playwright/test";

/**
 * Smoke test: visit the app homepage.
 *
 * This test verifies that:
 *   1. The frontend server is running and reachable.
 *   2. The page loads without crashing.
 *   3. Discover is browsable without signing in; Chats requires a session.
 *
 * Prerequisites:
 *   - Frontend running on BASE_URL / WEB2_BASE_URL (Playwright starts preview)
 */
test.describe("Smoke Tests", () => {
  test("should load the homepage", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/.+/);

    const body = page.locator("body");
    await expect(body).not.toBeEmpty();
  });

  test("should let unauthenticated users browse Discover", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page).toHaveURL("/");
    await expect(page.locator("#screen-discover")).toBeVisible();
  });

  test("should redirect unauthenticated users away from Chats", async ({
    page,
  }) => {
    await page.goto("/chats");

    await page.waitForURL("**/login**");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText("Sign in to message people")).toBeVisible();
  });
});
