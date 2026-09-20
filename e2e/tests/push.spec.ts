import { test, expect } from "@playwright/test";

const EMAIL = process.env.TEST_USER_EMAIL || "test@example.com";
const PASSWORD = process.env.TEST_USER_PASSWORD || "password123";

/**
 * Web Push permission prompting (frontend/apps/web/src/lib/push.ts).
 *
 * `Notification` is stubbed so permission stays `default`, which is the state
 * a browser leaves behind when the user dismisses the prompt instead of
 * choosing Allow or Block. The app must keep asking in that state; it must not
 * remember that it already asked.
 *
 * Prerequisites:
 *   - Frontend running on BASE_URL (Playwright starts preview)
 *   - Supabase running and seeded (TEST_USER_EMAIL / TEST_USER_PASSWORD)
 *   - frontend/.env has VITE_VAPID_PUBLIC_KEY, or push is skipped entirely
 */
test.describe("Push permission", () => {
  test("asks again on the next session while permission is default", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const NotificationStub = {
        permission: "default",
        requestPermission: async () => {
          const n = Number(localStorage.getItem("__prompts") ?? "0") + 1;
          localStorage.setItem("__prompts", String(n));
          return "default";
        },
      };
      Object.defineProperty(window, "Notification", {
        value: NotificationStub,
        configurable: true,
        writable: true,
      });
    });

    await page.goto("/login");
    await page.getByLabel("Email").fill(EMAIL);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });

    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("__prompts")), {
        timeout: 10000,
      })
      .toBe("1");

    await page.reload();
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("__prompts")), {
        timeout: 10000,
      })
      .toBe("2");
  });
});
