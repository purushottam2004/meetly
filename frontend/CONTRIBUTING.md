# Contributing to the frontend

Repo-wide rules: [../CONTRIBUTING.md](../CONTRIBUTING.md). Setup: [SETUP_GUIDE.md](./SETUP_GUIDE.md).

## Before you push

```bash
cd frontend
pnpm lint
```

Cursor / VS Code: repo-root [`.vscode/settings.json`](../.vscode/settings.json) sets ESLint working directories for `frontend/apps/*` and `frontend/packages/*`. Each package `eslint.config.js` sets `parserOptions.tsconfigRootDir` so TypeScript ESLint does not guess among multiple tsconfigs.

## Where to change code

- **Product behaviour / pages** → `apps/<app>/` (`web`)
- **Shared UI or auth** → `packages/ui`, `packages/auth` (coordinate — both apps depend on them)
- Prefer existing patterns in `@repo/ui` and `@repo/auth` over one-off copies

## Apps vs e2e

- Browser flows that need backend + DB belong in **[../e2e/](../e2e/README.md)**.
- The Cursor IDE browser tab often **cannot open `localhost` / `127.0.0.1` apps**. Verify local UIs with Playwright from `e2e/` or `curl` against `127.0.0.1`, not that tab.

## Branches & PRs

Follow monorepo [../CONTRIBUTING.md](../CONTRIBUTING.md) (`feature/*`, `bugs/*`, `chore/*`). Do not push to `main` / `stage` unless you own releases.
