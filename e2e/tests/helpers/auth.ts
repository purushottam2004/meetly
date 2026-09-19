import { expect, type Page } from "@playwright/test";

export function testUserCredentials() {
  const email = process.env.TEST_USER_EMAIL ?? "test@example.com";
  const password = process.env.TEST_USER_PASSWORD ?? "password123";
  return { email, password };
}

/** Open the login page and wait for the email/password form. */
export async function openEmailSignIn(page: Page) {
  await page.goto("/login");
  await expect(page.getByText("Sign in to message people")).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
}

export async function fillEmailSignIn(
  page: Page,
  email: string,
  password: string
) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

/** Full email sign-in and wait until /login is left. */
export async function loginAs(page: Page, email: string, password: string) {
  await openEmailSignIn(page);
  await fillEmailSignIn(page, email, password);
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 15_000,
  });
}

/** Sign out from the profile screen's settings row and land on /login. */
export async function logOut(page: Page) {
  await page.goto("/profile");
  await page.getByText("Log out").click();
  try {
    await page.waitForURL(/\/login/, { timeout: 15_000 });
  } catch {
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);
  }
}
