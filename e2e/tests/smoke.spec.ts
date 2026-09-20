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
    await expect(page.getByRole("button", { name: "Everyone" })).toBeVisible();
  });

  test("passing a profile keeps Discover from going empty", async ({ page }) => {
    await page.goto("/");

    const card = page.locator("#cardSlot .card");
    await expect(card).toBeVisible();
    const firstName = (await page.locator("#cardSlot .name").textContent()) ?? "";
    expect(firstName.length).toBeGreaterThan(0);

    await page.getByRole("button", { name: "Pass" }).click();

    await expect(card).toBeVisible();
    await expect(page.getByText("That's everyone for now")).toHaveCount(0);
    await expect(page.locator("#cardSlot .name")).not.toHaveText(firstName, {
      timeout: 5000,
    });
  });

  test("open to chat appears next to last-seen on opted-in profiles", async ({
    page,
  }) => {
    await page.goto("/");

    const card = page.locator("#cardSlot .card");
    await expect(card).toBeVisible();
    const badge = page.locator("#cardSlot .open-to-chat-badge");

    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (await badge.isVisible()) {
        await expect(badge).toHaveText("Open to chat");
        await expect(page.locator("#cardSlot .last-seen-badge")).toBeVisible();
        return;
      }
      const pass = page.getByRole("button", { name: "Pass" });
      if (!(await pass.isVisible())) break;
      await pass.click();
      await expect(card).toBeVisible();
    }

    throw new Error("expected an Open to chat chip on a Discover profile");
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
