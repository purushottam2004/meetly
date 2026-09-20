# E2E tests (Playwright)

Browser end-to-end tests for this template. Specs live under `tests/`; Playwright starts the frontends (or reuses ones already running).

What each spec covers: **[TESTS.md](./TESTS.md)**.

Monorepo docs: [../README.md](../README.md) · [../SETUP_GUIDE.md](../SETUP_GUIDE.md) · [../CONTRIBUTING.md](../CONTRIBUTING.md) · [../AGENTS.md](../AGENTS.md)  
Stack setup: [../supabase/SETUP_GUIDE.md](../supabase/SETUP_GUIDE.md) · [../backend/SETUP_GUIDE.md](../backend/SETUP_GUIDE.md) · [../frontend/SETUP_GUIDE.md](../frontend/SETUP_GUIDE.md)

## Projects

| Project | App | Port | Specs |
| --- | --- | --- | --- |
| `web` | `frontend/apps/web` | `5173` | `tests/smoke.spec.ts`, `tests/login.spec.ts`, `tests/hello.spec.ts` |

## Prerequisites

Start these yourself before running tests:

1. **Supabase** (local) and seed users

   ```bash
   cd supabase && python setup.py
   # or: supabase start && python seed.py
   ```

2. **Backend** on `:8080`  
   From `backend/`, e.g. `python main.py`, uvicorn, or `docker compose up`.  
   Needed for `hello.spec.ts`. See [backend/SETUP_GUIDE.md](../backend/SETUP_GUIDE.md).

Playwright will **build + preview** `web` (`5173`) automatically. If that server is already up, it is reused (outside CI). `frontend/.env` must be filled so the preview build gets `VITE_SUPABASE_*` and `VITE_BACKEND_URL`.

Embedded IDE browsers often cannot open local apps (`localhost` / `127.0.0.1`). Use these Playwright commands (or `curl`) to verify UI — do not treat a blank IDE-browser tab as the app being down.

## Setup

```bash
cd e2e
npm install
npx playwright install chromium   # first time / after Playwright upgrades
cp .env.example .env              # optional overrides
```

Defaults match local seeds; `.env` is only needed if you change URLs or credentials.

## Commands

From `e2e/`:

```bash
npm test                          # all specs
npm run test:web                  # web project only
npm run test:headed               # all, headed, 1 worker
npm run test:headed:video         # headed + record videos → videos/
npm run test:headed:video:images  # video + distinct JPEG frames (ffmpeg)
npm run test:web:headed
npm run test:web:headed:video
npm run test:browser              # one headed Chromium window only (no app servers; WM / Hyprland check)
npm run test:ui                   # Playwright UI
npm run codegen                   # record selectors
```

Run a single file:

```bash
npx playwright test --project=web tests/login.spec.ts
npx playwright test --project=web tests/hello.spec.ts
```

`npm run test:browser` uses `playwright.browser-check.config.ts` — it does **not** start the apps. Use it to confirm the browser opens and your window manager rules (float / workspace) apply.

## Shared-state note

Login specs share the same seeded user. Prefer `--workers=1` when a run exercises the same account in parallel (headed scripts already do). Parallel logins as the same seed user can invalidate the other's JWT.

Playwright does not provide a clean general-purpose "run test B only if test A passed" feature inside one spec file the way a build graph would. For product e2e the better pattern is usually **independent tests + isolated seed state**, not test-on-test dependencies.

### Video recording

Opt-in only (off by default). Playwright has no `--video` CLI flag, so we use `E2E_VIDEO=1`:

```bash
npm run test:headed:video
npm run test:web:headed:video

E2E_VIDEO=1 npx playwright test --headed --project=web
```

Recordings go to `e2e/videos/` (gitignored). Playwright **clears its output directory** at the start of a run, so each invocation uses a **new timestamp folder** (`e2e/videos/2026-09-13T12-00-00-000Z/…`). Older folders are left in place. Inside a run, each test still gets `video.webm` under a folder named after the spec.

### Distinct frames (for agent / screenshot review)

Agents cannot watch `.webm`. Opt in so ffmpeg writes a sequence of **distinct** JPEGs (near-duplicates dropped) next to the video:

```bash
# needs ffmpeg on PATH
npm run test:headed:video:images

E2E_IMAGES=1 npx playwright test --headed --project=web
```

`E2E_IMAGES=1` also turns video on. Output: `e2e/videos/<timestamp>/<test-folder>/images/frame_001.jpg`, …

## Layout

What each file is for: **[TESTS.md](./TESTS.md)**.

```
e2e/
  playwright.config.ts
  playwright.browser-check.config.ts
  reporters/extract-video-frames.ts
  tests/
    helpers/auth.ts           # shared login helpers
    smoke.spec.ts
    login.spec.ts
    hello.spec.ts
    browser-check.spec.ts
```

## Notes

- Headed mode forces **one worker** so a single browser window runs at a time.
- Video is off unless `E2E_VIDEO=1` (see `test:*:video` scripts); files land in `videos/<timestamp>/` and previous runs are kept.
- Distinct frames are off unless `E2E_IMAGES=1` (needs ffmpeg); JPEGs land in `videos/<timestamp>/<test-folder>/images/`.
- Specs assert against **seeded** users (`test@example.com` / `password123` in `supabase/python_seeds/data/_001_data_users.py`). Re-seed if local data drifts.
- HTML report: `npx playwright show-report` after a run (or open `playwright-report/`).
