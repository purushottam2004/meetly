# E2E test list

Tracked Playwright specs under `tests/`. How to run them: [README.md](./README.md).

Recorder specs live in gitignored `video_test/` folders and are not listed here.

## Shared (`--project=web` or `--project=web2`)

Credentials: [`tests/helpers/auth.ts`](./tests/helpers/auth.ts) (defaults match `supabase/python_seeds/data/_001_data_users.py`).

| File | What it covers |
| --- | --- |
| [`tests/smoke.spec.ts`](./tests/smoke.spec.ts) | Homepage loads; the header profile photo and completion badge are not clipped; unauthenticated users browse Discover (including the Everyone pool filter), skipping someone keeps another card in the feed, **Open to meet** shows next to last-seen on opted-in profiles, and Chats requires a session. |
| [`tests/login.spec.ts`](./tests/login.spec.ts) | Seeded email/password reaches the home page; a wrong password stays on login with an error. |
| [`tests/hello.spec.ts`](./tests/hello.spec.ts) | After sign-in, **Hello** calls `/api/v1/hello` and shows authenticated JSON. Needs the backend on `:8080`. |

## Browser check (`npm run test:browser`)

Separate config (`playwright.browser-check.config.ts`). Does not start web or web2.

| File | What it covers |
| --- | --- |
| [`tests/browser-check.spec.ts`](./tests/browser-check.spec.ts) | Opens one headed Chromium window so you can check window-manager / Hyprland rules. |
