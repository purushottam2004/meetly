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
 *   - Frontend running on BASE_URL (Playwright starts preview)
 */
test.describe("Smoke Tests", () => {
  test("should load the homepage", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/.+/);

    const body = page.locator("body");
    await expect(body).not.toBeEmpty();
  });

  test("header profile photo is not clipped", async ({ page }) => {
    await page.goto("/");

    const header = page.locator("#mainHeader");
    const avatar = page.locator(".avatar-completeness");
    const badge = page.locator(".avatar-completeness-pct");
    await expect(header).toBeVisible();
    await expect(avatar).toBeVisible();
    await expect(badge).toBeVisible();

    const headerBox = await header.boundingBox();
    const avatarBox = await avatar.boundingBox();
    const badgeBox = await badge.boundingBox();
    expect(headerBox).toBeTruthy();
    expect(avatarBox).toBeTruthy();
    expect(badgeBox).toBeTruthy();
    if (!headerBox || !avatarBox || !badgeBox) return;

    expect(avatarBox.height).toBeGreaterThanOrEqual(42);
    expect(avatarBox.y).toBeGreaterThanOrEqual(headerBox.y);
    expect(avatarBox.y + avatarBox.height).toBeLessThanOrEqual(
      headerBox.y + headerBox.height + 0.5,
    );
    expect(badgeBox.y).toBeGreaterThanOrEqual(headerBox.y);
    expect(badgeBox.x + badgeBox.width).toBeLessThanOrEqual(
      headerBox.x + headerBox.width + 0.5,
    );
  });

  test("should let unauthenticated users browse Discover", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page).toHaveURL("/");
    await expect(page.locator("#screen-discover")).toBeVisible();
    await expect(page.getByRole("button", { name: "Everyone" })).toBeVisible();
  });

  test("skipping a profile keeps Discover from going empty", async ({ page }) => {
    await page.goto("/");

    const card = page.locator("#cardSlot .card");
    await expect(card).toBeVisible();
    const firstName = (await page.locator("#cardSlot .name").textContent()) ?? "";
    expect(firstName.length).toBeGreaterThan(0);

    await page.getByRole("button", { name: "Skip" }).click();

    await expect(card).toBeVisible();
    await expect(page.getByText("That's everyone for now")).toHaveCount(0);
    await expect(page.locator("#cardSlot .name")).not.toHaveText(firstName, {
      timeout: 5000,
    });
  });

  test("open to meet appears next to last-seen on opted-in profiles", async ({
    page,
  }) => {
    await page.goto("/");

    const card = page.locator("#cardSlot .card");
    await expect(card).toBeVisible();
    const badge = page.locator("#cardSlot .open-to-chat-badge");

    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (await badge.isVisible()) {
        await expect(badge).toHaveText("Open to meet");
        await expect(page.locator("#cardSlot .last-seen-badge")).toBeVisible();
        return;
      }
      const skip = page.getByRole("button", { name: "Skip" });
      if (!(await skip.isVisible())) break;
      await skip.click();
      await expect(card).toBeVisible();
    }

    throw new Error("expected an Open to meet chip on a Discover profile");
  });

  test("should redirect unauthenticated users away from Chats", async ({
    page,
  }) => {
    await page.goto("/chats");

    await page.waitForURL("**/login**");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText("Sign in to message people")).toBeVisible();
  });

  test("notification icon is an opaque PNG the service worker can load", async ({
    request,
  }) => {
    const icon = await request.get("/apple-touch-icon.png");
    expect(icon.ok()).toBeTruthy();
    expect(icon.headers()["content-type"] ?? "").toMatch(/image\/png/);

    const sw = await request.get("/sw.js");
    expect(sw.ok()).toBeTruthy();
    expect(await sw.text()).toContain("/apple-touch-icon.png");
  });
});
